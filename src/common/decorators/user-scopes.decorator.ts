import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the user's scope map from the request.
 * The scope map is set by the PermissionsGuard and maps
 * module names to scope levels ('own' | 'full').
 *
 * Example value:
 *   { leads: 'own', students: 'full', __all__: 'full' }
 *
 * The special key '__all__' means the user has full access
 * to every module (used for admin roles).
 */
export const UserScopes = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Record<string, string> => {
    const request = ctx.switchToHttp().getRequest();
    return request.userScopes || {};
  },
);
