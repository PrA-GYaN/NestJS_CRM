import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';

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
}
