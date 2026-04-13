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
/**
 * Create a new payment with automatic aggregation and status calculation.
 *
 * The backend automatically:
 * - Calculates `remainingAmount` as totalAmount - sum(paidAmount of all pending payments)
 * - Sets `status` to "Completed" if paidAmount == totalAmount, else "Pending"
 * - Determines and assigns the correct `paymentCycle`
 * - Updates all payment statuses when cumulative payments reach totalAmount
 *
 * Do NOT provide `remainingAmount` or `status` in the request.
 */
export class CreatePaymentDto {
  @ApiProperty({ description: 'Student UUID the payment belongs to' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiPropertyOptional({ description: 'Service UUID this payment relates to (optional)' })
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

  @ApiPropertyOptional({ enum: PaymentType, default: PaymentType.Full })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.Cash })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'ISO currency code', example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Human-readable invoice reference (e.g. INV-2024-001). Auto-generated if omitted.',
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

// ─────────────────────────────────────────────────────────────────
// Payment Statistics Query DTO
// ─────────────────────────────────────────────────────────────────
export class PaymentStatisticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for statistics period (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'End date for statistics period (ISO 8601)',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Start date for comparison period (ISO 8601)',
    example: '2025-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  comparisonFromDate?: string;

  @ApiPropertyOptional({
    description: 'End date for comparison period (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  comparisonToDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter by specific student UUID',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific service UUID',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}

// ─────────────────────────────────────────────────────────────────
// Payment Statistics Response DTOs
// ─────────────────────────────────────────────────────────────────

export class PaymentMethodBreakdownDto {
  @ApiProperty({ description: 'Payment method name', example: 'Cash' })
  paymentMethod!: string;

  @ApiProperty({ description: 'Count of payments', example: 45 })
  count!: number;

  @ApiProperty({ description: 'Total amount via this method', example: 25000.00 })
  totalAmount!: number;

  @ApiProperty({ description: 'Percentage of total revenue', example: 35.7 })
  percentage!: number;
}

export class PaymentStatusBreakdownDto {
  @ApiProperty({ description: 'Payment status', example: 'Completed' })
  status!: string;

  @ApiProperty({ description: 'Count of payments', example: 120 })
  count!: number;

  @ApiProperty({ description: 'Total amount for this status', example: 65000.00 })
  totalAmount!: number;

  @ApiProperty({ description: 'Percentage of total invoice amount', example: 75.2 })
  percentage!: number;
}

export class DailyRevenueDataDto {
  @ApiProperty({ description: 'Date', example: '2026-03-15' })
  date!: string;

  @ApiProperty({ description: 'Revenue for this day', example: 5000.00 })
  revenue!: number;

  @ApiProperty({ description: 'Count of payments', example: 12 })
  paymentCount!: number;
}

export class PaymentStatisticsMetricsDto {
  @ApiProperty({ description: 'Total revenue from all completed payments', example: 350000.00 })
  totalRevenue!: number;

  @ApiProperty({ description: 'Revenue from the previous comparison period', example: 320000.00 })
  previousPeriodRevenue!: number;

  @ApiProperty({
    description: 'Revenue change amount (current - previous)',
    example: 30000.00,
  })
  revenueChange!: number;

  @ApiProperty({
    description: 'Revenue change percentage',
    example: 9.37,
  })
  revenueChangePercent!: number;

  @ApiProperty({ description: 'Total amount pending/unpaid', example: 50000.00 })
  totalPendingAmount!: number;

  @ApiProperty({ description: 'Count of pending/partially paid amounts', example: 28 })
  pendingPaymentCount!: number;

  @ApiProperty({ description: 'Total amount completed/paid', example: 350000.00 })
  totalCompletedAmount!: number;

  @ApiProperty({ description: 'Count of completed payments', example: 120 })
  completedPaymentCount!: number;

  @ApiProperty({ description: 'Collection rate (completed / total invoiced)', example: 87.5 })
  collectionRate!: number;

  @ApiProperty({ description: 'Total invoiced amount across all payments', example: 400000.00 })
  totalInvoicedAmount!: number;

  @ApiProperty({ description: 'Total amount overdue (past due date, not completed)', example: 15000.00 })
  totalOverdueAmount!: number;

  @ApiProperty({ description: 'Count of overdue payments', example: 8 })
  overduePaymentCount!: number;

  @ApiProperty({ description: 'Average payment amount', example: 2916.67 })
  averagePaymentAmount!: number;

  @ApiProperty({ description: 'Median payment amount', example: 2500.00 })
  medianPaymentAmount!: number;

  @ApiProperty({ description: 'Largest single payment amount', example: 45000.00 })
  largestPaymentAmount!: number;

  @ApiProperty({ description: 'Average days to complete payment from due date', example: 8.5 })
  averageDaysToComplete!: number;

  @ApiProperty({ description: 'Total unique customers (students) with payments', example: 145 })
  uniqueCustomerCount!: number;

  @ApiProperty({ description: 'Average payment value per customer', example: 2413.79 })
  averagePaymentPerCustomer!: number;

  @ApiProperty({ description: 'Total payment cycles in the period (strict cycle logic)', example: 45 })
  totalCycles!: number;

  @ApiProperty({ description: 'Number of completed cycles (strict cycle logic)', example: 38 })
  completedCycles!: number;
}

export class PaymentStatisticsResponseDto {
  @ApiProperty({ type: PaymentStatisticsMetricsDto, description: 'Core statistics metrics' })
  metrics!: PaymentStatisticsMetricsDto;

  @ApiProperty({
    type: [PaymentStatusBreakdownDto],
    description: 'Breakdown of payments by status',
  })
  statusBreakdown!: PaymentStatusBreakdownDto[];

  @ApiProperty({
    type: [PaymentMethodBreakdownDto],
    description: 'Breakdown of payments by payment method',
  })
  methodBreakdown!: PaymentMethodBreakdownDto[];

  @ApiProperty({
    type: [DailyRevenueDataDto],
    description: 'Daily revenue trend data',
    isArray: true,
  })
  dailyRevenue!: DailyRevenueDataDto[];

  @ApiProperty({
    description: 'Filters applied to generate these statistics',
    example: {
      fromDate: '2026-01-01T00:00:00.000Z',
      toDate: '2026-03-31T23:59:59.999Z',
      status: null,
      paymentMethod: null,
      studentId: null,
      serviceId: null,
    },
  })
  appliedFilters!: {
    fromDate?: string;
    toDate?: string;
    status?: string;
    paymentMethod?: string;
    studentId?: string;
    serviceId?: string;
  };

  @ApiProperty({
    description: 'Timestamp when statistics were computed',
    example: '2026-04-06T10:30:00.000Z',
  })
  computedAt!: string;
}

// ─────────────────────────────────────────────────────────────────
// Pending Payments Query DTO
// ─────────────────────────────────────────────────────────────────
export class PendingPaymentsQueryDto {
  @ApiProperty({ description: 'Student UUID to fetch pending payments for' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiPropertyOptional({ description: 'Service UUID (optional to filter by specific service)' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Payment cycle number (defaults to current cycle)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paymentCycle?: number;
}

// ─────────────────────────────────────────────────────────────────
// Payment Summary Response DTO
// ─────────────────────────────────────────────────────────────────
export class PaymentSummaryDto {
  @ApiProperty({ description: 'Total amount for this service', example: 1000.0 })
  totalAmount!: number;

  @ApiProperty({ description: 'Sum of all paid amounts in this cycle', example: 300.0 })
  totalPaid!: number;

  @ApiProperty({ description: 'Remaining balance after all pending payments', example: 700.0 })
  remainingAmount!: number;

  @ApiProperty({ description: 'Current payment cycle number', example: 1 })
  paymentCycle!: number;

  @ApiProperty({ description: 'Number of pending payments in this cycle', example: 2 })
  pendingPaymentCount!: number;

  @ApiProperty({ description: 'Overall status of the cycle', example: 'PartiallyPaid' })
  cycleStatus!: string;
}

// ─────────────────────────────────────────────────────────────────
// Payment Cycle Info Response DTO
// ─────────────────────────────────────────────────────────────────
export class PaymentCycleInfoDto {
  @ApiProperty({ description: 'Student ID', example: 'uuid' })
  studentId!: string;

  @ApiProperty({ description: 'Service ID (null if not service-specific)', example: 'uuid' })
  serviceId!: string | null;

  @ApiProperty({ description: 'Current active payment cycle number', example: 1 })
  currentCycle!: number;

  @ApiProperty({ description: 'Summary of current cycle', type: PaymentSummaryDto })
  currentCycleSummary!: PaymentSummaryDto;

  @ApiProperty({ description: 'Array of payment cycle summaries', type: [PaymentSummaryDto] })
  allCycles!: PaymentSummaryDto[];
}
