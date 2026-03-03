import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class AuthUserDto {
  @ApiProperty({ description: 'User/Student UUID' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ example: 'Agent' })
  role!: string;

  @ApiPropertyOptional({ description: 'Present on student tokens — contains the student record UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  studentId?: string;

  @ApiPropertyOptional({ description: '`true` when the token was issued via /auth/student/login', example: true })
  isStudent?: boolean;

  @ApiPropertyOptional({ description: 'Tenant UUID — present on tenant-user and student tokens' })
  tenantId?: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT Bearer token. Include as: Authorization: Bearer <token>' })
  accessToken!: string;

  @ApiProperty({
    type: AuthUserDto,
    description: 'Authenticated user profile. For student logins, `isStudent` is `true` and `studentId` is populated.',
  })
  user!: AuthUserDto;
}
