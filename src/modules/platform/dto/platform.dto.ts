import { IsString, IsEnum, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subdomain!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dbName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dbHost!: string;

  @ApiPropertyOptional({ default: 5432 })
  @IsOptional()
  dbPort?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dbUser!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dbPassword!: string;

  @ApiPropertyOptional({ enum: ['Basic', 'Advanced'] })
  @IsOptional()
  @IsEnum(['Basic', 'Advanced'])
  featurePackage?: 'Basic' | 'Advanced';

  // First admin user details
  @ApiPropertyOptional({ description: 'Email for the first admin user' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional({ description: 'Name for the first admin user' })
  @IsOptional()
  @IsString()
  adminName?: string;

  @ApiPropertyOptional({ description: 'Password for the first admin user' })
  @IsOptional()
  @IsString()
  adminPassword?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dbHost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dbPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dbUser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dbPassword?: string;

  @ApiPropertyOptional({ enum: ['Basic', 'Advanced'] })
  @IsOptional()
  @IsEnum(['Basic', 'Advanced'])
  featurePackage?: 'Basic' | 'Advanced';

  @ApiPropertyOptional({ enum: ['Active', 'Suspended', 'Inactive'] })
  @IsOptional()
  @IsEnum(['Active', 'Suspended', 'Inactive'])
  status?: 'Active' | 'Suspended' | 'Inactive';
}

export class CreatePlatformAdminDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}
