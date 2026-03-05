import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityAction } from '../activity-logs/dto/activity-log.dto';
import { CreatePaymentDto, PaymentQueryDto, UpdatePaymentDto } from './dto/payment.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  constructor(
    private tenantService: TenantService,
    private activityLogsService: ActivityLogsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────

  private toDecimal(value: number | Decimal): number {
    return typeof value === 'number' ? value : Number(value.toFixed(2));
  }

  /** Auto-generate an invoice number using date + random suffix */
  private generateInvoiceNumber(): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `INV-${datePart}-${rand}`;
  }

  private buildPaymentInclude() {
    return {
      student: {
        select: { id: true, name: true, email: true },
      },
      service: {
        select: { id: true, name: true, price: true },
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Record a new payment (advance, partial, balance, or full).
   *
   * Business rules enforced here:
   *  - `paidAmount` must not exceed `totalAmount`
   *  - `remainingAmount` defaults to `totalAmount - paidAmount` when omitted
   *  - `invoiceNumber` is auto-generated when omitted
   */
  async createPayment(tenantId: string, dto: CreatePaymentDto, creatorId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const total = dto.totalAmount;
    const paid = dto.paidAmount;

    if (paid > total) {
      throw new BadRequestException(
        `paidAmount (${paid}) cannot exceed totalAmount (${total})`,
      );
    }

    const remaining =
      dto.remainingAmount !== undefined ? dto.remainingAmount : +(total - paid).toFixed(2);

    // Auto-generate invoice number when not provided
    const invoiceNumber = dto.invoiceNumber ?? this.generateInvoiceNumber();

    const payment = await tenantPrisma.payment.create({
      data: {
        tenantId,
        studentId: dto.studentId,
        serviceId: dto.serviceId,
        currency: dto.currency ?? 'USD',
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        paymentType: dto.paymentType,
        paymentMethod: dto.paymentMethod,
        status: dto.status,
        invoiceNumber,
        transactionReference: dto.transactionReference,
        notes: dto.notes,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: this.buildPaymentInclude(),
    });

    await this.activityLogsService.createLog(tenantId, {
      userId: creatorId,
      entityType: 'Payment',
      entityId: payment.id,
      action: ActivityAction.Created,
      metadata: {
        invoiceNumber: payment.invoiceNumber,
        paidAmount: paid,
        totalAmount: total,
        paymentType: payment.paymentType,
      },
    });

    return payment;
  }

  // ─────────────────────────────────────────────────────────────────
  // READ – list with filters
  // ─────────────────────────────────────────────────────────────────

  async getPayments(tenantId: string, queryDto: PaymentQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      studentId,
      serviceId,
      status,
      paymentType,
      paymentMethod,
      dueDateFrom,
      dueDateTo,
      invoiceNumber,
      search,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { tenantId };
    if (studentId) where.studentId = studentId;
    if (serviceId) where.serviceId = serviceId;
    if (status) where.status = status;
    if (paymentType) where.paymentType = paymentType;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (invoiceNumber)
      where.invoiceNumber = { contains: invoiceNumber, mode: 'insensitive' };
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { transactionReference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [payments, total] = await Promise.all([
      tenantPrisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: this.buildPaymentInclude(),
      }),
      tenantPrisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // READ – single payment
  // ─────────────────────────────────────────────────────────────────

  async getPaymentById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const payment = await tenantPrisma.payment.findFirst({
      where: { id, tenantId },
      include: this.buildPaymentInclude(),
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  // ─────────────────────────────────────────────────────────────────
  // READ – all payments for a student (payment history / ledger)
  // ─────────────────────────────────────────────────────────────────

  async getStudentPayments(tenantId: string, studentId: string, queryDto: PaymentQueryDto) {
    return this.getPayments(tenantId, { ...queryDto, studentId });
  }

  // ─────────────────────────────────────────────────────────────────
  // READ – payment summary for a student
  // ─────────────────────────────────────────────────────────────────

  async getStudentPaymentSummary(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const payments = await tenantPrisma.payment.findMany({
      where: { tenantId, studentId },
      orderBy: { createdAt: 'asc' },
    });

    const totalPaid = payments
      .filter((p) => p.status === 'Completed')
      .reduce((sum, p) => sum + this.toDecimal(p.paidAmount), 0);

    const totalPending = payments
      .filter((p) => p.status === 'Pending' || p.status === 'PartiallyPaid')
      .reduce((sum, p) => sum + this.toDecimal(p.paidAmount), 0);

    const latestPayment = payments[payments.length - 1];
    const remainingBalance = latestPayment
      ? this.toDecimal(latestPayment.remainingAmount)
      : 0;

    return {
      studentId,
      totalPayments: payments.length,
      totalPaid: +totalPaid.toFixed(2),
      totalPending: +totalPending.toFixed(2),
      remainingBalance,
      payments,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // READ – overdue payments
  // ─────────────────────────────────────────────────────────────────

  async getOverduePayments(tenantId: string, queryDto: PaymentQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'dueDate', sortOrder = 'asc' } = queryDto;
    const skip = (page - 1) * limit;

    const now = new Date();
    const where = {
      tenantId,
      dueDate: { lt: now },
      status: { in: ['Pending', 'PartiallyPaid'] as any[] },
    };

    const [payments, total] = await Promise.all([
      tenantPrisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: this.buildPaymentInclude(),
      }),
      tenantPrisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────

  async updatePayment(
    tenantId: string,
    id: string,
    dto: UpdatePaymentDto,
    updaterId?: string,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const existing = await this.getPaymentById(tenantId, id);

    // Re-compute remainingAmount if paidAmount or totalAmount changes
    const newTotal =
      dto.totalAmount !== undefined ? dto.totalAmount : this.toDecimal(existing.totalAmount);
    const newPaid =
      dto.paidAmount !== undefined ? dto.paidAmount : this.toDecimal(existing.paidAmount);

    if (newPaid > newTotal) {
      throw new BadRequestException(
        `paidAmount (${newPaid}) cannot exceed totalAmount (${newTotal})`,
      );
    }

    const newRemaining =
      dto.remainingAmount !== undefined ? dto.remainingAmount : +(newTotal - newPaid).toFixed(2);

    const updated = await tenantPrisma.payment.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
        ...(dto.paymentType && { paymentType: dto.paymentType }),
        ...(dto.totalAmount !== undefined && { totalAmount: newTotal }),
        ...(dto.paidAmount !== undefined && { paidAmount: newPaid }),
        ...(dto.invoiceNumber && { invoiceNumber: dto.invoiceNumber }),
        ...(dto.transactionReference && { transactionReference: dto.transactionReference }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.paymentDate && { paymentDate: new Date(dto.paymentDate) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        remainingAmount: newRemaining,
      },
      include: this.buildPaymentInclude(),
    });

    await this.activityLogsService.createLog(tenantId, {
      userId: updaterId,
      entityType: 'Payment',
      entityId: id,
      action: ActivityAction.Updated,
      metadata: {
        invoiceNumber: updated.invoiceNumber,
        status: updated.status,
      },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────

  async deletePayment(tenantId: string, id: string, deleterId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getPaymentById(tenantId, id); // throws 404 if missing

    await tenantPrisma.payment.delete({ where: { id } });

    await this.activityLogsService.createLog(tenantId, {
      userId: deleterId,
      entityType: 'Payment',
      entityId: id,
      action: ActivityAction.Deleted,
      metadata: {},
    });

    return { success: true, message: 'Payment deleted successfully' };
  }
}
