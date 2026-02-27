import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, Length } from 'class-validator';

export class CreateCountryDto {
  @ApiProperty({
    description: 'Country name',
    example: 'United States',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'ISO country code (2-3 characters)',
    example: 'US',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 3)
  code!: string;

  @ApiProperty({
    description: 'Whether the country is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
