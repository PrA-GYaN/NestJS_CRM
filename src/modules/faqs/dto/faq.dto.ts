import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class CreateFaqDto {
  @ApiPropertyOptional({ description: 'FAQ category (e.g., "Visa", "Admission", "General")' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'FAQ question' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ description: 'FAQ answer' })
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiPropertyOptional({ description: 'Sort order for custom ordering', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is the FAQ active?', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}

export class ReorderFaqDto {
  @ApiProperty({ description: 'New sort order', example: 5 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  sortOrder!: number;
}
