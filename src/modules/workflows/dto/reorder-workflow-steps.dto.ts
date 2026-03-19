import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderStepItemDto {
  @ApiProperty({ description: 'The ID of the workflow step' })
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'The new order value for the step' })
  @IsNumber()
  @IsNotEmpty()
  order!: number;
}
