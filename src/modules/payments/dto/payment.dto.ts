import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus, PaymentType } from '@prisma/tenant-client';
import { PaginationDto } from '../../../common/dto/common.dto';

// ─────────────────────────────────────────────────────────────────
// Create Payment DTO
// ─────────────────────────────────────────────────────────────────
export class CreatePaymentDto {
  @ApiProperty({ description: 'Student UUID the payment belongs to' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiPropertyOptional({ description: 'Service UUID this payment relates to' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({
    description: 'Total invoice/deal amount for the service',
    example: 1000.0,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  totalAmount!: number;

  @ApiProperty({
    description: 'Amount paid in this specific transaction',
    example: 300.0,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  paidAmount!: number;

  @ApiPropertyOptional({
    description: 'Remaining balance after this payment (auto-calculated if omitted)',
    example: 700.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  remainingAmount?: number;

  @ApiPropertyOptional({ enum: PaymentType, default: PaymentType.Full })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.Cash })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.Pending })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'ISO currency code', example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Human-readable invoice reference (e.g. INV-2024-001)',
    example: 'INV-2024-001',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'Gateway or bank transaction reference',
  })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional({ description: 'Optional notes about this payment' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Date when the payment was actually received (ISO 8601)',
    example: '2024-03-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    description: 'Due date for this instalment (ISO 8601)',
    example: '2024-04-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

// ─────────────────────────────────────────────────────────────────
// Update Payment DTO  (all fields optional)
// ─────────────────────────────────────────────────────────────────
export class UpdatePaymentDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentType })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  paidAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  remainingAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'ISO currency code', example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

// ─────────────────────────────────────────────────────────────────
// Query / filter DTO
// ─────────────────────────────────────────────────────────────────
export class PaymentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by student UUID' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by service UUID' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentType })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter payments due from this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter payments due up to this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by invoice number (partial match)' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;
}
