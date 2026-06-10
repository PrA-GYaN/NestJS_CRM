import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { SCOPE_MODULE_KEY } from '../decorators/scope.decorator';

/**
 * ScopeInterceptor now serves as a pass-through.
 * Data-level scoping ("own" vs "full") is handled at the query level
 * in each service using ScopeService.getOwnershipFilter() and @UserScopes().
 *
 * The @UseScope('module') decorator is retained purely for metadata/documentation.
 */
@Injectable()
export class ScopeInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle();
  }
}
