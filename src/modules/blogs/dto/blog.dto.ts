import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';

export enum ContentStatus {
  Draft = 'Draft',
  Published = 'Published',
  Unpublished = 'Unpublished',
}

export class CreateBlogDto {
  @ApiProperty({ description: 'Blog post title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ description: 'Short excerpt or summary' })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty({ description: 'Main blog content (HTML/Markdown)' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Featured image URL or path' })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiPropertyOptional({ description: 'Author name' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ description: 'Tags array', type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsString()
  @IsOptional()
  metaDescription?: string;
}

export class UpdateBlogDto extends PartialType(CreateBlogDto) {}

export class PublishBlogDto {
  @ApiProperty({
    description: 'Set to true to publish, false to unpublish',
    example: true,
  })
  @IsNotEmpty()
  publish!: boolean;
}
