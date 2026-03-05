import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CanCreate,
  CanDelete,
  CanRead,
  CanUpdate,
} from '../../common/decorators/permissions.decorator';
import { IdParamDto } from '../../common/dto/common.dto';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  PaymentQueryDto,
  UpdatePaymentDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── CREATE ───────────────────────────────────────────────────────

  /**
   * Record a new payment.
   *
   * Supports advance, partial, balance, and full payment types.
   * `remainingAmount` is auto-calculated as `totalAmount – paidAmount` when omitted.
   * An invoice number is auto-generated when not provided.
   */
  @Post()
  @CanCreate('payments')
  @ApiOperation({
    summary: 'Record a new payment',
    description:
      'Creates a payment record. Supports Full / Advance / Partial / Balance payment types. ' +
      '`remainingAmount` is auto-calculated. Invoice number is auto-generated if omitted.',
  })
  @ApiResponse({ status: 201, description: 'Payment created successfully.' })
  @ApiResponse({ status: 400, description: 'paidAmount exceeds totalAmount.' })
  createPayment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(tenantId, dto, user.id);
  }

  // ─── LIST ─────────────────────────────────────────────────────────

  /**
   * Retrieve all payments with optional filters.
   *
   * Filter by: studentId, serviceId, status, paymentType, paymentMethod,
   * dueDate range, invoiceNumber, or free-text search.
   */
  @Get()
  @CanRead('payments')
  @ApiOperation({
    summary: 'List payments with filters',
    description:
      'Returns paginated payments. Optional query params: studentId, serviceId, status, ' +
      'paymentType, paymentMethod, dueDateFrom, dueDateTo, invoiceNumber, search.',
  })
  getPayments(
    @TenantId() tenantId: string,
    @Query() queryDto: PaymentQueryDto,
  ) {
    return this.paymentsService.getPayments(tenantId, queryDto);
  }

  // ─── OVERDUE ──────────────────────────────────────────────────────

  /**
   * Get all payments whose `dueDate` is in the past and status is
   * still Pending or PartiallyPaid.
   */
  @Get('overdue')
  @CanRead('payments')
  @ApiOperation({
    summary: 'List overdue payments',
    description: 'Returns payments where dueDate < now and status is Pending or PartiallyPaid.',
  })
  getOverduePayments(
    @TenantId() tenantId: string,
    @Query() queryDto: PaymentQueryDto,
  ) {
    return this.paymentsService.getOverduePayments(tenantId, queryDto);
  }

  // ─── STUDENT PAYMENTS ─────────────────────────────────────────────

  /**
   * Retrieve all payment records for a specific student (ledger view).
   */
  @Get('student/:studentId')
  @CanRead('payments')
  @ApiOperation({
    summary: 'Get payment history for a student',
    description:
      'Returns all payments linked to the student. Supports the same filters as GET /payments.',
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  getStudentPayments(
    @TenantId() tenantId: string,
    @Param('studentId') studentId: string,
    @Query() queryDto: PaymentQueryDto,
  ) {
    return this.paymentsService.getStudentPayments(tenantId, studentId, queryDto);
  }

  /**
   * Get a high-level payment summary for a student:
   * total paid, total pending, remaining balance.
   */
  @Get('student/:studentId/summary')
  @CanRead('payments')
  @ApiOperation({
    summary: 'Get payment summary for a student',
    description:
      'Returns aggregated totals: totalPaid, totalPending, remainingBalance, and payment history.',
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  getStudentPaymentSummary(
    @TenantId() tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.paymentsService.getStudentPaymentSummary(tenantId, studentId);
  }

  // ─── SINGLE ───────────────────────────────────────────────────────

  @Get(':id')
  @CanRead('payments')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  getPaymentById(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
  ) {
    return this.paymentsService.getPaymentById(tenantId, params.id);
  }

  // ─── UPDATE ───────────────────────────────────────────────────────

  /**
   * Update an existing payment record.
   *
   * Typical use-cases:
   *  - Mark a `Pending` payment as `Completed` after confirmation
   *  - Attach a `transactionReference` once the bank transfer is confirmed
   *  - Record a `Refunded` status
   *  - Update `paidAmount` for a partial payment that was topped-up
   */
  @Put(':id')
  @CanUpdate('payments')
  @ApiOperation({
    summary: 'Update a payment',
    description:
      'Update status, method, amounts, reference, or dates. ' +
      '`remainingAmount` is recalculated when paidAmount or totalAmount changes.',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  updatePayment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.updatePayment(tenantId, params.id, dto, user.id);
  }

  // ─── DELETE ───────────────────────────────────────────────────────

  @Delete(':id')
  @CanDelete('payments')
  @ApiOperation({ summary: 'Delete a payment record' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  deletePayment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.paymentsService.deletePayment(tenantId, params.id, user.id);
  }
}
