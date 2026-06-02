import { HttpException, HttpStatus } from '@nestjs/common';
import { WorkflowErrorDetail } from './workflow-response.dto';
import { WorkflowErrorType } from './workflow-error-codes';

/**
 * Base exception class for all workflow-related errors
 * Provides structured error information for standardized responses
 */
export class WorkflowException extends HttpException {
  readonly code: string;
  readonly errorType: WorkflowErrorType;
  readonly statusCode: HttpStatus;
  readonly context?: Record<string, any>;
  readonly suggestions?: string[];
  readonly validationErrors?: Record<string, string[]>;
  readonly traceId?: string;

  constructor(
    message: string,
    code: string,
    errorType: WorkflowErrorType,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    context?: Record<string, any>,
    suggestions?: string[],
    validationErrors?: Record<string, string[]>,
    traceId?: string,
  ) {
    const errorDetail = new WorkflowErrorDetail(
      code,
      message,
      errorType,
      context,
      suggestions,
      validationErrors,
    );

    super(
      {
        success: false,
        statusCode,
        message,
        code,
        error: errorDetail,
        traceId,
      },
      statusCode,
    );

    this.code = code;
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.context = context;
    this.suggestions = suggestions;
    this.validationErrors = validationErrors;
    this.traceId = traceId;
  }
}

/**
 * Exception for workflow not found errors
 */
export class WorkflowNotFoundException extends WorkflowException {
  constructor(
    workflowId?: string,
    context?: Record<string, any>,
    traceId?: string,
  ) {
    const message = workflowId
      ? `Workflow with ID ${workflowId} not found`
      : 'Workflow not found';

    super(
      message,
      'WORKFLOW_NOT_FOUND',
      WorkflowErrorType.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      { ...context, resourceId: workflowId, resourceType: 'workflow' },
      [
        'Verify the workflow ID is correct',
        'Ensure the workflow belongs to your organization',
        'Create the workflow if it does not exist',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for workflow step not found errors
 */
export class WorkflowStepNotFoundException extends WorkflowException {
  constructor(
    stepId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    traceId?: string,
  ) {
    const message = stepId
      ? `Workflow step with ID ${stepId} not found`
      : 'Workflow step not found';

    super(
      message,
      'STEP_NOT_FOUND',
      WorkflowErrorType.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      { ...context, stepId, workflowId, resourceType: 'workflow_step' },
      [
        'Verify the step ID and workflow ID are correct',
        'Ensure the step belongs to the specified workflow',
        'Create the step if it does not exist',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for workflow version not found errors
 */
export class WorkflowVersionNotFoundException extends WorkflowException {
  constructor(
    versionId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    traceId?: string,
  ) {
    const message = versionId
      ? `Workflow version ${versionId} not found`
      : 'Workflow version not found';

    super(
      message,
      'VERSION_NOT_FOUND',
      WorkflowErrorType.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      { ...context, versionId, workflowId, resourceType: 'workflow_version' },
      [
        'Verify the version ID is correct',
        'List available versions for the workflow',
        'Create a new version if needed',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for workflow step order conflicts
 */
export class WorkflowStepOrderConflictException extends WorkflowException {
  constructor(
    stepOrder: number,
    workflowId?: string,
    context?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Step with order ${stepOrder} already exists in this workflow`,
      'STEP_ORDER_CONFLICT',
      WorkflowErrorType.CONFLICT,
      HttpStatus.CONFLICT,
      { ...context, stepOrder, workflowId, conflictType: 'duplicate_step_order' },
      [
        `Use a different step order`,
        `Current order ${stepOrder} is already assigned to another step`,
        `View all steps to find available order numbers`,
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for invalid workflow step order sequence
 */
export class WorkflowStepOrderSequenceException extends WorkflowException {
  constructor(
    providedOrders: number[],
    context?: Record<string, any>,
    traceId?: string,
  ) {
    const sortedOrders = [...providedOrders].sort((a, b) => a - b);
    const missing = [];
    for (let i = 0; i < sortedOrders.length; i++) {
      if (sortedOrders[i] !== i + 1) {
        missing.push(i + 1);
      }
    }

    super(
      `Step orders must be sequential starting from 1. Got: ${sortedOrders.join(', ')}${missing.length > 0 ? `. Missing: ${missing.join(', ')}` : ''}`,
      'STEP_ORDER_SEQUENTIAL',
      WorkflowErrorType.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      { ...context, providedOrders, missingOrders: missing },
      [
        'Ensure step orders are continuous from 1 to N',
        `Expected orders: 1, 2, 3, ..., ${sortedOrders.length}`,
        'Reorder steps to fix the sequence',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for minimum steps requirement
 */
export class WorkflowMinimumStepsException extends WorkflowException {
  constructor(
    stepsProvided: number,
    minimumRequired: number = 1,
    context?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Workflow requires at least ${minimumRequired} step(s). Provided: ${stepsProvided}`,
      'STEP_MINIMUM_REQUIRED',
      WorkflowErrorType.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      { ...context, stepsProvided, minimumRequired },
      [
        `Add at least ${minimumRequired - stepsProvided} more step(s)`,
        'Each workflow must have at least one step defined',
        'Define step names, descriptions, and order',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for visa type not found
 */
export class VisaTypeNotFoundException extends WorkflowException {
  constructor(
    visaTypeId?: string,
    context?: Record<string, any>,
    traceId?: string,
  ) {
    const message = visaTypeId
      ? `Visa type ${visaTypeId} not found`
      : 'Visa type not found';

    super(
      message,
      'WORKFLOW_VISA_TYPE_NOT_FOUND',
      WorkflowErrorType.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      { ...context, visaTypeId, resourceType: 'visa_type' },
      [
        'Verify the visa type ID is correct',
        'List available visa types',
        'Create the visa type if it does not exist',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for workflow migration errors
 */
export class WorkflowMigrationException extends WorkflowException {
  constructor(
    message: string,
    code: string,
    applicationId?: string,
    fromVersionId?: string,
    toVersionId?: string,
    context?: Record<string, any>,
    suggestions?: string[],
    traceId?: string,
  ) {
    super(
      message,
      code,
      WorkflowErrorType.OPERATION_FAILED,
      HttpStatus.BAD_REQUEST,
      {
        ...context,
        applicationId,
        fromVersionId,
        toVersionId,
        operationType: 'migration',
      },
      suggestions || [
        'Review the error details and context',
        'Check version compatibility',
        'Ensure application is in a migratable state',
        'Contact support if the issue persists',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for completed application migration attempt
 */
export class CompletedApplicationMigrationException extends WorkflowMigrationException {
  constructor(
    applicationId: string,
    currentStatus: string,
    context?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Cannot migrate application ${applicationId}. Current status: ${currentStatus}. Migrations are only allowed for in-progress applications.`,
      'MIGRATION_APPLICATION_COMPLETED',
      applicationId,
      undefined,
      undefined,
      { ...context, currentStatus, reason: 'application_completed' },
      [
        `Application is already ${currentStatus}`,
        'Migrations can only be performed on pending/in-progress applications',
        'To retry this application, create a new application request',
      ],
      traceId,
    );
  }
}

/**
 * Exception for invalid workflow data
 */
export class WorkflowValidationException extends WorkflowException {
  constructor(
    message: string,
    context?: Record<string, any>,
    validationErrors?: Record<string, string[]>,
    suggestions?: string[],
    traceId?: string,
  ) {
    super(
      message,
      'WORKFLOW_INVALID_DATA',
      WorkflowErrorType.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      { ...context, operationType: 'validation' },
      suggestions || [
        'Review the validation error details',
        'Ensure all required fields are provided',
        'Verify field formats and constraints',
      ],
      validationErrors,
      traceId,
    );
  }
}

/**
 * Exception for operation failures with context
 */
export class WorkflowOperationFailedException extends WorkflowException {
  constructor(
    operation: string,
    resourceType: string,
    resourceId: string,
    reason: string,
    context?: Record<string, any>,
    suggestions?: string[],
    traceId?: string,
  ) {
    const message = `Failed to ${operation} ${resourceType} (${resourceId}). Reason: ${reason}`;

    super(
      message,
      `${resourceType.toUpperCase()}_${operation.toUpperCase()}_FAILED`,
      WorkflowErrorType.OPERATION_FAILED,
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        ...context,
        operation,
        resourceType,
        resourceId,
        reason,
      },
      suggestions || [
        'Review the error logs for more details',
        'Check if all dependencies are available',
        'Try again in a few moments',
        'Contact support if the issue persists',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Exception for version state transition errors
 */
export class WorkflowVersionStateTransitionException extends WorkflowException {
  constructor(
    versionId: string,
    currentStatus: string,
    attemptedStatus: string,
    context?: Record<string, any>,
    traceId?: string,
  ) {
    const message = `Cannot transition workflow version from ${currentStatus} to ${attemptedStatus}`;

    super(
      message,
      'VERSION_INVALID_STATUS',
      WorkflowErrorType.STATE_TRANSITION_INVALID,
      HttpStatus.CONFLICT,
      {
        ...context,
        versionId,
        currentStatus,
        attemptedStatus,
        validTransitions: getValidTransitions(currentStatus),
      },
      [
        `Valid transitions from ${currentStatus}: ${getValidTransitions(currentStatus).join(', ') || 'none'}`,
        'Ensure the version is in a compatible state',
        'Check the workflow versioning policy',
      ],
      undefined,
      traceId,
    );
  }
}

/**
 * Helper function to get valid state transitions
 */
function getValidTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    Draft: ['Active'],
    Active: ['Deprecated'],
    Deprecated: [],
  };
  return transitions[currentStatus] ?? [];
}

/**
 * Exception for invalid migration strategy
 */
export class InvalidMigrationStrategyException extends WorkflowMigrationException {
  constructor(
    providedStrategy: string,
    validStrategies: string[],
    context?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Invalid migration strategy: ${providedStrategy}. Valid strategies: ${validStrategies.join(', ')}`,
      'MIGRATION_INVALID_STRATEGY',
      undefined,
      undefined,
      undefined,
      { ...context, providedStrategy, validStrategies },
      [
        `Use one of these strategies: ${validStrategies.join(', ')}`,
        'KeepCurrentStep: Maintains the current step position',
        'RemapStep: Maps to a specific target step',
        'ForcedUpdate: Resets to the first step of new version',
      ],
      traceId,
    );
  }
}

/**
 * Exception for version incompatibility
 */
export class IncompatibleVersionMigrationException extends WorkflowMigrationException {
  constructor(
    fromVersionId: string,
    toVersionId: string,
    reason: string,
    context?: Record<string, any>,
    suggestions?: string[],
    traceId?: string,
  ) {
    super(
      `Versions are incompatible for migration: ${reason}`,
      'MIGRATION_INCOMPATIBLE_VERSIONS',
      undefined,
      fromVersionId,
      toVersionId,
      { ...context, reason, incompatibilityReason: reason },
      suggestions || [
        'Check if required step mappings are defined',
        'Ensure both versions belong to the same workflow',
        'Consider using a different migration strategy',
        'Create step mappings before attempting migration',
      ],
      traceId,
    );
  }
}
