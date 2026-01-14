import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateLandingPageDto {
  @ApiProperty({ description: 'Landing page title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ description: 'Main page content (HTML/Markdown)' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Hero/banner image URL or path' })
  @IsString()
  @IsOptional()
  heroImage?: string;

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsString()
  @IsOptional()
  metaDescription?: string;
}

export class UpdateLandingPageDto extends PartialType(CreateLandingPageDto) {}

export class PublishLandingPageDto {
  @ApiProperty({
    description: 'Set to true to publish, false to unpublish',
    example: true,
  })
  @IsNotEmpty()
  publish!: boolean;
}
