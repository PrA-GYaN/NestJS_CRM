import { HttpStatus } from '@nestjs/common';
import { WorkflowResponse, WorkflowListResponse } from '../dto/workflow-response.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utility class to build standardized workflow responses
 * Ensures consistent response structure across all endpoints
 */
export class WorkflowResponseBuilder {
  private traceId: string;

  constructor(traceId?: string) {
    this.traceId = traceId || uuidv4();
  }

  /**
   * Build a successful single-item response
   */
  success<T>(
    data: T,
    message: string = 'Operation successful',
    code: string = 'SUCCESS',
    statusCode: number = HttpStatus.OK,
  ): WorkflowResponse<T> {
    return new WorkflowResponse(true, statusCode, message, code, data, undefined, this.traceId);
  }

  /**
   * Build a successful list response
   */
  successList<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Items retrieved successfully',
    code: string = 'ITEMS_RETRIEVED',
  ): WorkflowListResponse<T> {
    return new WorkflowListResponse(message, code, items, total, page, limit, this.traceId);
  }

  /**
   * Build a successful created response
   */
  created<T>(
    data: T,
    message: string = 'Resource created successfully',
    code: string = 'RESOURCE_CREATED',
  ): WorkflowResponse<T> {
    return this.success(data, message, code, HttpStatus.CREATED);
  }

  /**
   * Build a successful updated response
   */
  updated<T>(
    data: T,
    message: string = 'Resource updated successfully',
    code: string = 'RESOURCE_UPDATED',
  ): WorkflowResponse<T> {
    return this.success(data, message, code, HttpStatus.OK);
  }

  /**
   * Build a successful deleted response
   */
  deleted<T = any>(
    message: string = 'Resource deleted successfully',
    code: string = 'RESOURCE_DELETED',
    data?: T,
  ): WorkflowResponse<T> {
    return this.success(data || ({} as T), message, code, HttpStatus.OK);
  }

  /**
   * Build a successful accepted response (for async operations)
   */
  accepted<T>(
    data: T,
    message: string = 'Operation accepted and processing',
    code: string = 'OPERATION_ACCEPTED',
  ): WorkflowResponse<T> {
    return this.success(data, message, code, HttpStatus.ACCEPTED);
  }

  /**
   * Build a no-content response
   */
  noContent(
    message: string = 'Operation completed',
    code: string = 'NO_CONTENT',
  ): WorkflowResponse<null> {
    return this.success(null, message, code, HttpStatus.NO_CONTENT);
  }

  /**
   * Get trace ID for logging
   */
  getTraceId(): string {
    return this.traceId;
  }

  /**
   * Set custom trace ID
   */
  setTraceId(traceId: string): WorkflowResponseBuilder {
    this.traceId = traceId;
    return this;
  }
}

/**
 * Factory for creating response builders with predefined configurations
 */
export class WorkflowResponseFactory {
  static createBuilder(traceId?: string): WorkflowResponseBuilder {
    return new WorkflowResponseBuilder(traceId);
  }

  /**
   * Quick success response builder
   */
  static success<T>(
    data: T,
    message: string = 'Operation successful',
    code: string = 'SUCCESS',
  ): WorkflowResponse<T> {
    return new WorkflowResponseBuilder().success(data, message, code);
  }

  /**
   * Quick list response builder
   */
  static list<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Items retrieved successfully',
    code: string = 'ITEMS_RETRIEVED',
  ): WorkflowListResponse<T> {
    return new WorkflowResponseBuilder().successList(items, total, page, limit, message, code);
  }

  /**
   * Quick created response builder
   */
  static created<T>(
    data: T,
    message: string = 'Resource created successfully',
    code: string = 'RESOURCE_CREATED',
  ): WorkflowResponse<T> {
    return new WorkflowResponseBuilder().created(data, message, code);
  }

  /**
   * Quick updated response builder
   */
  static updated<T>(
    data: T,
    message: string = 'Resource updated successfully',
    code: string = 'RESOURCE_UPDATED',
  ): WorkflowResponse<T> {
    return new WorkflowResponseBuilder().updated(data, message, code);
  }

  /**
   * Quick deleted response builder
   */
  static deleted<T = any>(
    message: string = 'Resource deleted successfully',
    code: string = 'RESOURCE_DELETED',
    data?: T,
  ): WorkflowResponse<T> {
    return new WorkflowResponseBuilder().deleted(message, code, data);
  }
}
