import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
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

    // Generate a new session token, invalidating any previous session on another device
    const sessionToken = randomUUID();
    await tenantPrisma.user.update({
      where: { id: user.id },
      data: { currentSessionToken: sessionToken },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleName: user.role.name,
      isPlatformAdmin: false,
      isStudent: false,
      sessionToken,
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
   * Student Login (Tenant Database)
   */
  async studentLogin(tenantId: string, loginDto: LoginDto): Promise<AuthResponseDto> {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const student = await tenantPrisma.student.findFirst({
      where: {
        tenantId,
        email: loginDto.email,
      },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!student.isActive) {
      throw new UnauthorizedException('Student account is inactive');
    }

    // Check if student has password set
    const passwordField = student.password || student.hashedPassword;
    if (!passwordField) {
      throw new UnauthorizedException('Password not set for this student account. Please contact your consultancy.');
    }

    const isPasswordValid = await this.comparePasswords(loginDto.password, passwordField);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    const sessionToken = randomUUID();
    await tenantPrisma.student.update({
      where: { id: student.id },
      data: { lastLogin: new Date(), currentSessionToken: sessionToken },
    });

    const payload = {
      sub: student.id,
      email: student.email,
      tenantId: student.tenantId,
      isPlatformAdmin: false,
      isStudent: true,
      studentId: student.id,
      sessionToken,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        role: 'Student',
      },
    };
  }

  /**
   * Validate JWT Payload
   * Also enforces single-device sessions by comparing the sessionToken in the
   * JWT against the currentSessionToken stored in the database.
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

    // Student tokens are validated against the Student model, not the User model
    if (payload.isStudent) {
      const student = await tenantPrisma.student.findFirst({
        where: { id: payload.sub, tenantId: payload.tenantId, isActive: true },
      });

      if (!student) {
        return null;
      }

      // Enforce single-device login: reject if session token has been superseded
      if (payload.sessionToken && student.currentSessionToken !== payload.sessionToken) {
        throw new UnauthorizedException(
          'Session expired. Your account was signed in on another device.',
        );
      }

      return student;
    }

    const user = await tenantPrisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user) {
      return null;
    }

    // Enforce single-device login: reject if session token has been superseded
    if (payload.sessionToken && user.currentSessionToken !== payload.sessionToken) {
      throw new UnauthorizedException(
        'Session expired. Your account was signed in on another device.',
      );
    }

    return user;
  }

  /**
   * Get current user with their tenant-scoped permissions
   */
  async getCurrentUserWithPermissions(tenantId: string, userId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const user = await tenantPrisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'Active') {
      throw new UnauthorizedException('User account is inactive');
    }

    // Extract permissions
    const permissions = user.role.rolePermissions.map(
      (rp) => rp.permission.name,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      roleId: user.role.id,
      tenantId: user.tenantId,
      permissions: permissions.sort(), // Sort alphabetically for consistency
    };
  }
}
