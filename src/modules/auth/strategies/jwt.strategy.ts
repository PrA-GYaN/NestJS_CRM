import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Return student-specific identity for student tokens
    if (payload.isStudent) {
      return {
        id: payload.sub,
        studentId: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        isStudent: true,
        isPlatformAdmin: false,
      };
    }

    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      isPlatformAdmin: payload.isPlatformAdmin,
      isStudent: false,
    };
  }
}
