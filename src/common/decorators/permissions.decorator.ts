import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for a route
 * @param permissions - Array of permission names (e.g., 'leads:create', 'students:read')
 * @example
 * @RequirePermissions('leads:create', 'leads:update')
 * async createLead() { ... }
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Convenience decorators for common CRUD operations
 */
export const CanCreate = (module: string) => RequirePermissions(`${module}:create`);
export const CanRead = (module: string) => RequirePermissions(`${module}:read`);
export const CanUpdate = (module: string) => RequirePermissions(`${module}:update`);
export const CanDelete = (module: string) => RequirePermissions(`${module}:delete`);
export const CanExport = (module: string) => RequirePermissions(`${module}:export`);

/**
 * Decorator to mark routes that require admin access
 */
export const AdminOnly = () => SetMetadata('adminOnly', true);
