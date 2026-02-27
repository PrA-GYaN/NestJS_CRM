import { Controller, Post, Body, HttpCode, HttpStatus, Req, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Platform Admin Login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  async platformAdminLogin(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.platformAdminLogin(loginDto);
  }

  @Public()
  @Post('tenant/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tenant User Login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  async tenantUserLogin(@Body() loginDto: LoginDto, @Req() req: any): Promise<AuthResponseDto> {
    const tenantId = req.tenantId;
    return this.authService.tenantUserLogin(tenantId, loginDto);
  }

  @Public()
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student Login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  async studentLogin(@Body() loginDto: LoginDto, @Req() req: any): Promise<AuthResponseDto> {
    const tenantId = req.tenantId;
    return this.authService.studentLogin(tenantId, loginDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info with permissions' })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
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
