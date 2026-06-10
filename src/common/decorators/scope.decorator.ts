import { SetMetadata } from '@nestjs/common';

export const SCOPE_MODULE_KEY = 'scopeModule';

/**
 * Specifies which module's scope to apply when filtering response data.
 * The ScopeInterceptor will read this metadata and filter fields accordingly.
 *
 * @param module - The module name (e.g., 'leads', 'students', 'tasks')
 *
 * @example
 * @UseScope('leads')
 * @Get()
 * async findAll() { ... }
 */
export const UseScope = (module: string) => SetMetadata(SCOPE_MODULE_KEY, module);

/**
 * Skip scope filtering for a specific route.
 * Useful for routes that should return unfiltered data.
 */
export const SkipScope = () => SetMetadata(SCOPE_MODULE_KEY, '__skip__');
