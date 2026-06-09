import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Detailed error information structure
 * Provides comprehensive context for debugging and frontend handling
 */
export class WorkflowErrorDetail {
  @ApiProperty({
    description: 'Machine-readable error code for specific error handling',
    example: 'WORKFLOW_NOT_FOUND',
  })
  code: string;

  @ApiProperty({
    description: 'Detailed technical error message',
    example: 'Workflow with ID xyz123 does not exist in tenant abc',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Error type/category for classification',
    enum: [
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'CONFLICT',
      'OPERATION_FAILED',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'SYSTEM_ERROR',
    ],
    example: 'NOT_FOUND',
  })
  type?: string;

  @ApiPropertyOptional({
    description: 'Additional error context and details',
    example: { resourceId: 'wf_123', resourceType: 'workflow' },
  })
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Suggested actions to resolve the error',
    example: ['Create the workflow first', 'Check the workflow ID'],
    type: [String],
  })
  suggestions?: string[];

  @ApiPropertyOptional({
    description: 'Field-level validation errors',
    example: { name: ['Field is required'], steps: ['At least one step required'] },
  })
  validationErrors?: Record<string, string[]>;

  @ApiPropertyOptional({
    description: 'Documentation URL for this error',
    example: 'https://docs.example.com/errors/WORKFLOW_NOT_FOUND',
  })
  docUrl?: string;

  constructor(
    code: string,
    message: string,
    type?: string,
    context?: Record<string, any>,
    suggestions?: string[],
    validationErrors?: Record<string, string[]>,
    docUrl?: string,
  ) {
    this.code = code;
    this.message = message;
    this.type = type;
    this.context = context;
    this.suggestions = suggestions;
    this.validationErrors = validationErrors;
    this.docUrl = docUrl;
  }
}

/**
 * Standard response envelope for all workflow operations
 * Provides consistent structure for frontend consumption
 * Includes success status, data, and detailed error information
 */
export class WorkflowResponse<T = any> {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'User-friendly message describing the operation result',
    example: 'Workflow created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Machine-readable operation code for programmatic handling',
    example: 'WORKFLOW_CREATED',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'Response data payload (null on error)',
    example: { id: '123', name: 'Student Visa' },
  })
  data?: T | null;

  @ApiPropertyOptional({
    description: 'Detailed error information (only present on failure)',
  })
  error?: WorkflowErrorDetail;

  @ApiPropertyOptional({
    description: 'Request tracing ID for debugging',
    example: 'trace_123abc456def',
  })
  traceId?: string;

  @ApiPropertyOptional({
    description: 'Request timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp?: string;

  constructor(
    success: boolean,
    statusCode: number,
    message: string,
    code: string,
    data?: T | null,
    error?: WorkflowErrorDetail,
    traceId?: string,
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.code = code;
    this.data = data || null;
    this.error = error;
    this.traceId = traceId;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Create a successful response
   */
  static success<T>(
    message: string,
    code: string,
    data: T,
    statusCode: number = 200,
    traceId?: string,
  ): WorkflowResponse<T> {
    return new WorkflowResponse(true, statusCode, message, code, data, undefined, traceId);
  }

  /**
   * Create a failed response
   */
  static failure(
    message: string,
    code: string,
    statusCode: number = 400,
    errorDetail?: WorkflowErrorDetail,
    traceId?: string,
  ): WorkflowResponse {
    return new WorkflowResponse(false, statusCode, message, code, null, errorDetail, traceId);
  }
}

/**
 * Generic paginated response wrapper
 */
export class PaginatedWorkflowResponse<T> {
  @ApiProperty({
    description: 'Array of items',
    type: 'array',
  })
  data: T[];

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there are more pages',
    example: true,
  })
  hasMore: boolean;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasMore = page < this.totalPages;
  }
}

/**
 * Success response for list operations
 */
export class WorkflowListResponse<T> {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'User-friendly message',
    example: 'Workflows retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Machine-readable operation code',
    example: 'WORKFLOWS_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Paginated data',
  })
  data: PaginatedWorkflowResponse<T>;

  @ApiPropertyOptional({
    description: 'Request tracing ID',
    example: 'trace_123abc456def',
  })
  traceId?: string;

  @ApiPropertyOptional({
    description: 'Request timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp?: string;

  constructor(
    message: string,
    code: string,
    data: T[],
    total: number,
    page: number,
    limit: number,
    traceId?: string,
  ) {
    this.success = true;
    this.statusCode = 200;
    this.message = message;
    this.code = code;
    this.data = new PaginatedWorkflowResponse(data, total, page, limit);
    this.traceId = traceId;
    this.timestamp = new Date().toISOString();
  }
}
