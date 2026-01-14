import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateScholarshipDto {
  @ApiProperty({ description: 'Scholarship title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ description: 'Scholarship description' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Eligibility criteria' })
  @IsString()
  @IsOptional()
  eligibility?: string;

  @ApiPropertyOptional({ description: 'Scholarship amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Application deadline' })
  @IsDateString()
  @IsNotEmpty()
  deadline!: string;

  @ApiPropertyOptional({ description: 'External application link/URL' })
  @IsString()
  @IsOptional()
  applicationUrl?: string;

  @ApiPropertyOptional({ description: 'University name' })
  @IsString()
  @IsOptional()
  universityName?: string;

  @ApiPropertyOptional({ description: 'Country name' })
  @IsString()
  @IsOptional()
  countryName?: string;
}

export class UpdateScholarshipDto extends PartialType(CreateScholarshipDto) {}

export class PublishScholarshipDto {
  @ApiProperty({
    description: 'Set to true to publish, false to unpublish',
    example: true,
  })
  @IsNotEmpty()
  publish!: boolean;
}
