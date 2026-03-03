import { Controller, Post, Body, HttpCode, HttpStatus, Req, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('platform-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Platform Admin Login',
    description: 'Authenticates a platform-level admin. The returned JWT contains `isPlatformAdmin: true` and grants access to all platform administration endpoints.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async platformAdminLogin(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.platformAdminLogin(loginDto);
  }

  @Public()
  @Post('tenant/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tenant User Login',
    description: 'Authenticates a tenant user (staff/agent). The tenant is resolved from the subdomain. The returned JWT contains `tenantId`, `roleId`, `roleName`, and `isStudent: false`.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or tenant not found' })
  async tenantUserLogin(@Body() loginDto: LoginDto, @Req() req: any): Promise<AuthResponseDto> {
    const tenantId = req.tenantId;
    return this.authService.tenantUserLogin(tenantId, loginDto);
  }

  @Public()
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Student Login',
    description: 'Authenticates a student for the self-service Student Panel. The tenant is resolved from the subdomain. The returned JWT contains `isStudent: true` and `studentId` — use this token exclusively with `/student-panel/*` endpoints.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful — token contains isStudent: true', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials, inactive account, or tenant not found' })
  async studentLogin(@Body() loginDto: LoginDto, @Req() req: any): Promise<AuthResponseDto> {
    const tenantId = req.tenantId;
    return this.authService.studentLogin(tenantId, loginDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user info with permissions',
    description: 'Returns the authenticated user\'s profile and permissions. For platform admins returns `permissions: ["*"]`. For students returns role info with `isStudent: true`. For tenant users returns full role and permission list.',
  })
  @ApiResponse({
    status: 200,
    description: 'User info retrieved successfully',
    schema: {
      oneOf: [
        {
          title: 'Platform Admin',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', example: 'PLATFORM_ADMIN' },
            isPlatformAdmin: { type: 'boolean', example: true },
            permissions: { type: 'array', items: { type: 'string' }, example: ['*'] },
          },
        },
        {
          title: 'Student',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            isStudent: { type: 'boolean', example: true },
            tenantId: { type: 'string', format: 'uuid' },
          },
        },
        {
          title: 'Tenant User',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            role: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
            tenantId: { type: 'string', format: 'uuid' },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT token' })
  async getCurrentUser(@CurrentUser() user: any, @Req() req: any) {
    // For platform admins
    if (user.isPlatformAdmin) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isPlatformAdmin: true,
        permissions: ['*'], // Platform admins have all permissions
      };
    }

    // For tenant users
    const tenantId = req.tenantId || user.tenantId;
    return this.authService.getCurrentUserWithPermissions(tenantId, user.id);
  }
}
