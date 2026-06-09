import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { WorkflowException } from '../exceptions/workflow.exceptions';
import { WorkflowResponse, WorkflowErrorDetail } from '../dto/workflow-response.dto';
import { WorkflowErrorType } from '../dto/workflow-error-codes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Exception filter for workflow module
 * Catches all WorkflowException instances and transforms them into standardized responses
 * Also handles generic HTTP exceptions with workflow-friendly formatting
 */
@Injectable()
@Catch()
export class WorkflowExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WorkflowExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = uuidv4();

    // Initialize response defaults
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let code = 'INTERNAL_SERVER_ERROR';
    let errorType = WorkflowErrorType.SYSTEM_ERROR;
    let errorDetail: WorkflowErrorDetail | undefined;
    let context: Record<string, any> = {};
    let suggestions: string[] = [];

    // Log exception for debugging
    if (exception instanceof Error) {
      this.logger.error(`[${traceId}] ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`[${traceId}] Unknown error: ${JSON.stringify(exception)}`);
    }

    // Handle WorkflowException (our domain exceptions)
    if (exception instanceof WorkflowException) {
      statusCode = exception.statusCode;
      message = exception.message;
      code = exception.code;
      errorType = exception.errorType;
      context = exception.context || {};
      suggestions = exception.suggestions || [];

      // Build detailed error response
      errorDetail = new WorkflowErrorDetail(
        code,
        message,
        errorType,
        context,
        suggestions,
        exception.validationErrors,
        this.getDocumentationUrl(code),
      );
    }
    // Handle validation errors from class-validator
    else if (
      exception instanceof HttpException &&
      exception.getStatus() === HttpStatus.BAD_REQUEST
    ) {
      const exceptionResponse = exception.getResponse();
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      code = 'WORKFLOW_VALIDATION_FAILED';
      errorType = WorkflowErrorType.VALIDATION_ERROR;

      // Extract validation errors if present
      if (typeof exceptionResponse === 'object') {
        const respObj = exceptionResponse as any;
        if (respObj.message && Array.isArray(respObj.message)) {
          // class-validator format
          const validationErrors = this.parseValidationErrors(respObj.message);
          errorDetail = new WorkflowErrorDetail(
            code,
            'Request validation failed. Please review field-level errors.',
            errorType,
            context,
            [
              'Fix validation errors listed in the response',
              'Ensure all required fields are provided',
              'Verify field formats match requirements',
            ],
            validationErrors,
            this.getDocumentationUrl(code),
          );
        } else {
          message = respObj.message || message;
          errorDetail = new WorkflowErrorDetail(
            code,
            message,
            errorType,
            context,
            [],
            undefined,
            this.getDocumentationUrl(code),
          );
        }
      }
    }
    // Handle other HTTP exceptions
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const respObj = exceptionResponse as any;
        message = respObj.message || 'Operation failed';
      } else {
        message = exceptionResponse as string;
      }

      code = this.getCodeFromStatus(statusCode);
      errorType = this.getErrorTypeFromStatus(statusCode);

      errorDetail = new WorkflowErrorDetail(
        code,
        message,
        errorType,
        context,
        this.getSuggestionsForStatus(statusCode),
        undefined,
        this.getDocumentationUrl(code),
      );
    }
    // Handle unexpected errors
    else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      code = 'INTERNAL_SERVER_ERROR';
      errorType = WorkflowErrorType.SYSTEM_ERROR;

      errorDetail = new WorkflowErrorDetail(
        code,
        'An internal server error occurred. Our team has been notified.',
        errorType,
        { ...context, originalError: exception.message },
        ['Try your request again', 'Contact support with trace ID: ' + traceId],
        undefined,
        this.getDocumentationUrl(code),
      );
    }

    // Ensure errorDetail is always present
    if (!errorDetail) {
      errorDetail = new WorkflowErrorDetail(
        code,
        message,
        errorType,
        context,
        suggestions,
        undefined,
        this.getDocumentationUrl(code),
      );
    }

    // Build response envelope
    const workflowResponse = new WorkflowResponse(
      false, // success
      statusCode,
      message,
      code,
      null, // no data on error
      errorDetail,
      traceId,
    );

    // Log workflow response for monitoring
    this.logWorkflowError(traceId, statusCode, code, message, request.method, request.url, context);

    // Send response
    response.status(statusCode).json(workflowResponse);
  }

  /**
   * Parse validation error messages from class-validator
   */
  private parseValidationErrors(messages: string[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    messages.forEach((msg: string) => {
      // Extract field name from constraint messages like:
      // "field must be a string", "field must not be empty", etc.
      const match = msg.match(/^(\w+)\s+(.+)$/);
      if (match) {
        const [, field, error] = match;
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(error);
      }
    });

    return Object.keys(errors).length > 0 ? errors : {};
  }

  /**
   * Get machine-readable code from HTTP status
   */
  private getCodeFromStatus(status: number): string {
    const codes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return codes[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Get error type from HTTP status
   */
  private getErrorTypeFromStatus(status: number): WorkflowErrorType {
    if (status === HttpStatus.BAD_REQUEST) {
      return WorkflowErrorType.VALIDATION_ERROR;
    } else if (status === HttpStatus.UNAUTHORIZED) {
      return WorkflowErrorType.UNAUTHORIZED;
    } else if (status === HttpStatus.FORBIDDEN) {
      return WorkflowErrorType.FORBIDDEN;
    } else if (status === HttpStatus.NOT_FOUND) {
      return WorkflowErrorType.NOT_FOUND;
    } else if (status === HttpStatus.CONFLICT) {
      return WorkflowErrorType.CONFLICT;
    } else {
      return WorkflowErrorType.SYSTEM_ERROR;
    }
  }

  /**
   * Get action suggestions based on HTTP status
   */
  private getSuggestionsForStatus(status: number): string[] {
    const suggestions: Record<number, string[]> = {
      [HttpStatus.BAD_REQUEST]: [
        'Review the request format and required fields',
        'Check field values match expected types',
        'Verify all required parameters are included',
      ],
      [HttpStatus.UNAUTHORIZED]: [
        'Ensure you are authenticated',
        'Check your authentication token/credentials',
        'Re-authenticate if your token has expired',
      ],
      [HttpStatus.FORBIDDEN]: [
        'You do not have permission for this operation',
        'Check your role and assigned permissions',
        'Contact your administrator for access',
      ],
      [HttpStatus.NOT_FOUND]: [
        'Verify the resource ID is correct',
        'Ensure the resource exists',
        'Check if you have access to this resource',
      ],
      [HttpStatus.CONFLICT]: [
        'This resource or state already exists',
        'Try a different value or update the existing resource',
        'Check for conflicting operations',
      ],
      [HttpStatus.INTERNAL_SERVER_ERROR]: [
        'Try your request again',
        'Contact support if the problem persists',
        'Include the trace ID in your support request',
      ],
    };

    return suggestions[status] || ['Review error details', 'Contact support for assistance'];
  }

  /**
   * Get documentation URL for error code
   */
  private getDocumentationUrl(code: string): string {
    // In production, this would link to actual documentation
    // Format: https://api.example.com/docs/errors/{CODE}
    return `https://api.example.com/docs/errors/${code}`;
  }

  /**
   * Log workflow error for monitoring and analytics
   */
  private logWorkflowError(
    traceId: string,
    statusCode: number,
    code: string,
    message: string,
    method: string,
    url: string,
    context: Record<string, any>,
  ) {
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    const logMessage = `[${traceId}] ${method} ${url} - ${statusCode} ${code}: ${message}`;

    if (logLevel === 'error') {
      this.logger.error(logMessage, { context });
    } else {
      this.logger.warn(logMessage, { context });
    }
  }
}
