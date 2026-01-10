import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MasterPrismaService } from '../../common/prisma/master-prisma.service';
import { TenantService } from '../../common/tenant/tenant.service';
import { LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private masterPrisma: MasterPrismaService,
    private jwtService: JwtService,
    private tenantService: TenantService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Platform Admin Login (Master Database)
   */
  async platformAdminLogin(loginDto: LoginDto): Promise<AuthResponseDto> {
    const admin = await this.masterPrisma.platformAdmin.findUnique({
      where: { email: loginDto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.comparePasswords(loginDto.password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      isPlatformAdmin: true,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  /**
   * Tenant User Login (Tenant Database)
   */
  async tenantUserLogin(tenantId: string, loginDto: LoginDto): Promise<AuthResponseDto> {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const user = await tenantPrisma.user.findFirst({
      where: {
        tenantId,
        email: loginDto.email,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'Active') {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await this.comparePasswords(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleName: user.role.name,
      isPlatformAdmin: false,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  /**
   * Validate JWT Payload
   */
  async validateUser(payload: any) {
    if (payload.isPlatformAdmin) {
      return this.masterPrisma.platformAdmin.findUnique({
        where: { id: payload.sub },
      });
    }

    const tenantPrisma = await this.tenantService.getTenantPrisma(
      payload.tenantId,
    );

    return tenantPrisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
  }
}
