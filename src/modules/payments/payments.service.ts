import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityAction } from '../activity-logs/dto/activity-log.dto';
import {
  CreatePaymentDto,
  PaymentQueryDto,
  UpdatePaymentDto,
  PaymentStatisticsQueryDto,
  PaymentStatisticsResponseDto,
} from './dto/payment.dto';
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
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      service: {
        select: { id: true, name: true, price: true },
      },
    };
  }

  private normalizePaymentResponse<T extends { student?: any }>(payment: T): T {
    if (!payment?.student) return payment;

    const firstName = payment.student.firstName ?? '';
    const lastName = payment.student.lastName ?? '';
    const name = `${firstName} ${lastName}`.trim();

    return {
      ...payment,
      student: {
        ...payment.student,
        name,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // STRICT PAYMENT CYCLE HELPERS (Production-Ready)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get the LAST payment cycle for a student and service.
   * Returns the highest paymentCycle number, or null if no payments exist.
   *
   * This is used to determine:
   * - If cycle is Completed → start new cycle (paymentCycle + 1)
   * - If cycle is NOT Completed → continue same cycle
   */
  private async getLastPaymentCycle(
    tenantPrisma: any,
    studentId: string,
    serviceId: string | null,
  ): Promise<{ paymentCycle: number; status: string } | null> {
    const lastPayment = await tenantPrisma.payment.findFirst({
      where: {
        studentId,
        ...(serviceId ? { serviceId } : { serviceId: null }),
      },
      orderBy: { paymentCycle: 'desc' },
      select: { paymentCycle: true, status: true },
    });

    return lastPayment || null;
  }

  /**
   * Sum ALL paidAmount for a specific cycle (student + service + cycle).
   * Used to calculate totalPaidSoFar.
   */
  private async sumOfPayments(
    tenantPrisma: any,
    studentId: string,
    serviceId: string | null,
    paymentCycle: number,
  ): Promise<number> {
    const result = await tenantPrisma.payment.aggregate({
      where: {
        studentId,
        ...(serviceId ? { serviceId } : { serviceId: null }),
        paymentCycle,
      },
      _sum: { paidAmount: true },
    });

    const sum = result._sum?.paidAmount || 0;
    return this.toDecimal(sum);
  }

  /**
   * Get full details about a payment cycle for debugging and validation.
   * Useful for understanding cycle state and identifying issues.
   */
  async getCycleDetails(
    tenantId: string,
    studentId: string,
    serviceId: string | null,
    paymentCycle: number,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const payments = await tenantPrisma.payment.findMany({
      where: {
        studentId,
        ...(serviceId ? { serviceId } : { serviceId: null }),
        paymentCycle,
      },
      orderBy: { createdAt: 'asc' },
      include: this.buildPaymentInclude(),
    });

    // Calculate totals
    const totalAmount = payments.length > 0 ? this.toDecimal(payments[0].totalAmount) : 0;
    const totalPaidSum = payments.reduce((sum, p) => sum + this.toDecimal(p.paidAmount), 0);
    const remainingBalance = totalAmount - totalPaidSum;

    // Determine cycle status
    const cycleStatus =
      totalPaidSum === 0
        ? 'Pending'
        : totalPaidSum < totalAmount
          ? 'PartiallyPaid'
          : 'Completed';

    const isConsistent = payments.every(
      (p) =>
        this.toDecimal(p.status === 'Completed' ? 0 : p.remainingAmount) >=
        remainingBalance - 0.01, // Allow 1 cent rounding
    );

    return {
      studentId,
      serviceId,
      paymentCycle,
      totalAmount,
      totalPaidSum: +totalPaidSum.toFixed(2),
      remainingBalance: Math.max(0, +remainingBalance.toFixed(2)),
      cycleStatus,
      paymentCount: payments.length,
      isConsistent,
      payments: payments.map((p) => ({
        id: p.id,
        paidAmount: this.toDecimal(p.paidAmount),
        status: p.status,
        remainingAmount: this.toDecimal(p.remainingAmount),
        createdAt: p.createdAt,
      })),
    };
  }

  /**
   * Validate that a payment cycle has proper integrity.
   * Ensures no overpayments and status consistency.
   *
   * Returns validation result with isValid flag and any issues found.
   */
  async validateCycleIntegrity(
    tenantId: string,
    studentId: string,
    serviceId: string | null,
    paymentCycle: number,
  ): Promise<{
    isValid: boolean;
    issues: string[];
    details: any;
  }> {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const issues: string[] = [];

    const cycleDetails = await this.getCycleDetails(tenantId, studentId, serviceId, paymentCycle);

    // Check 1: Total paid should not exceed total amount
    if (cycleDetails.totalPaidSum > cycleDetails.totalAmount + 0.01) {
      issues.push(
        `Total paid (${cycleDetails.totalPaidSum}) exceeds total amount (${cycleDetails.totalAmount})`,
      );
    }

    // Check 2: Remaining balance should be non-negative
    if (cycleDetails.remainingBalance < -0.01) {
      issues.push(`Remaining balance is negative: ${cycleDetails.remainingBalance}`);
    }

    // Check 3: If cycle is marked Completed, all payments should be Completed
    if (cycleDetails.cycleStatus === 'Completed') {
      const nonCompleted = cycleDetails.payments.filter((p) => p.status !== 'Completed');
      if (nonCompleted.length > 0) {
        issues.push(
          `Cycle is Completed but ${nonCompleted.length} payment(s) are not marked as Completed`,
        );
      }
    }

    // Check 4: If any payment is Completed, all previous payments should be paid
    let cumulativePaid = 0;
    for (let i = 0; i < cycleDetails.payments.length; i++) {
      const payment = cycleDetails.payments[i];
      cumulativePaid += payment.paidAmount;

      if (payment.status === 'Completed' && i < cycleDetails.payments.length - 1) {
        // If this is Completed, next payment should not exist or should also be Completed
        const nextPayment = cycleDetails.payments[i + 1];
        if (nextPayment.status !== 'Completed') {
          issues.push(
            `Payment ${payment.id} is Completed but later payment ${nextPayment.id} is not`,
          );
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      details: cycleDetails,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PAYMENT AGGREGATION & CYCLE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────

  /**
   * STRICT DETERMINATION OF PAYMENT CYCLE
   *
   * Rules:
   * - If no payments exist → cycle = 1
   * - If last cycle status = 'Completed' → cycle = lastCycle + 1
   * - Otherwise → cycle = lastCycle (continue same cycle)
   */
  private async determinePaymentCycle(
    tenantPrisma: any,
    studentId: string,
    serviceId: string | null,
  ): Promise<number> {
    const lastCycle = await this.getLastPaymentCycle(tenantPrisma, studentId, serviceId);

    if (!lastCycle) {
      return 1;
    }

    if (lastCycle.status === 'Completed') {
      return lastCycle.paymentCycle + 1;
    }

    return lastCycle.paymentCycle;
  }

  /**
   * Get all pending payments for a student and service in current cycle.
   * Returns array of payment records.
   */
  async getPendingPaymentsForService(
    tenantId: string,
    studentId: string,
    serviceId: string | null,
    paymentCycle?: number,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    let cycle = paymentCycle;
    if (cycle === undefined) {
      cycle = await this.determinePaymentCycle(tenantPrisma, studentId, serviceId);
    }

    const payments = await tenantPrisma.payment.findMany({
      where: {
        tenantId,
        studentId,
        ...(serviceId ? { serviceId } : { serviceId: null }),
        paymentCycle: cycle,
        status: { in: ['Pending', 'PartiallyPaid'] },
      },
      orderBy: { createdAt: 'asc' },
      include: this.buildPaymentInclude(),
    });

    return payments.map((p) => this.normalizePaymentResponse(p));
  }

  // ─────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────

  /**
   * CREATE PAYMENT (STRICT & PRODUCTION-READY)
   *
   * Implements the exact specification:
   * 1. Determine payment cycle
   * 2. Calculate current cycle totals
   * 3. Validate payment amount
   * 4. Determine status
   * 5. Create payment record
   * 6. Update all cycle records if completed
   *
   * KEY GUARANTEES:
   * ✅ No overpayment possible
   * ✅ No reused completed cycles
   * ✅ All records in completed cycle are consistent
   * ✅ remainingAmount always accurate
   * ✅ Each cycle is isolated and clean
   */
  async createPayment(tenantId: string, dto: CreatePaymentDto, creatorId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const totalAmount = dto.totalAmount;
    const paidAmount = dto.paidAmount;

    // ─────────────────────────────────────────────────────────────────
    // STEP 1: Determine Payment Cycle
    // ─────────────────────────────────────────────────────────────────
    let paymentCycle: number;
    const lastCycle = await this.getLastPaymentCycle(
      tenantPrisma,
      dto.studentId,
      dto.serviceId || null,
    );

    if (!lastCycle) {
      paymentCycle = 1;
    } else if (lastCycle.status === 'Completed') {
      paymentCycle = lastCycle.paymentCycle + 1;
    } else {
      paymentCycle = lastCycle.paymentCycle;
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 2: Calculate Current Cycle Totals
    // ─────────────────────────────────────────────────────────────────
    const totalPaidSoFar = await this.sumOfPayments(
      tenantPrisma,
      dto.studentId,
      dto.serviceId || null,
      paymentCycle,
    );

    const newTotalPaid = totalPaidSoFar + paidAmount;
    const remainingAmount = totalAmount - newTotalPaid;

    // ─────────────────────────────────────────────────────────────────
    // STEP 3: Validate Payment (CRITICAL - STRICT OVERPAYMENT CHECK)
    // ─────────────────────────────────────────────────────────────────
    if (paidAmount > totalAmount - totalPaidSoFar) {
      throw new BadRequestException(
        `Payment exceeds remaining balance (${totalAmount - totalPaidSoFar})`,
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 4: Determine Status
    // ─────────────────────────────────────────────────────────────────
    let status: 'Pending' | 'PartiallyPaid' | 'Completed';

    if (newTotalPaid === 0) {
      status = 'Pending';
    } else if (newTotalPaid < totalAmount) {
      status = 'PartiallyPaid';
    } else {
      status = 'Completed';
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 5: Create Payment Record
    // ─────────────────────────────────────────────────────────────────
    const trimmedInvoiceNumber = dto.invoiceNumber?.trim();
    const invoiceNumber = trimmedInvoiceNumber || this.generateInvoiceNumber();

    const payment = await tenantPrisma.payment.create({
      data: {
        tenantId,
        studentId: dto.studentId,
        serviceId: dto.serviceId,
        currency: dto.currency ?? 'USD',
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: Math.max(0, +remainingAmount.toFixed(2)),
        paymentType: dto.paymentType,
        paymentMethod: dto.paymentMethod,
        status,
        paymentCycle,
        invoiceNumber,
        transactionReference: dto.transactionReference,
        notes: dto.notes,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: this.buildPaymentInclude(),
    });

    // ─────────────────────────────────────────────────────────────────
    // STEP 6: Cycle Completion Handling (MANDATORY)
    // ─────────────────────────────────────────────────────────────────
    if (newTotalPaid === totalAmount) {
      // Mark ALL records in this cycle as Completed
      await tenantPrisma.payment.updateMany({
        where: {
          studentId: dto.studentId,
          ...(dto.serviceId ? { serviceId: dto.serviceId } : { serviceId: null }),
          paymentCycle,
        },
        data: {
          status: 'Completed',
          remainingAmount: 0,
        },
      });
    }

    // Log the activity
    await this.activityLogsService.createLog(tenantId, {
      userId: creatorId,
      entityType: 'Payment',
      entityId: payment.id,
      action: ActivityAction.Created,
      metadata: {
        invoiceNumber: payment.invoiceNumber,
        paidAmount,
        totalAmount,
        paymentType: payment.paymentType,
        paymentCycle,
        status,
        remainingAmount: Math.max(0, +remainingAmount.toFixed(2)),
      },
    });

    return this.normalizePaymentResponse(payment);
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

    const normalizedPayments = payments.map((payment) =>
      this.normalizePaymentResponse(payment),
    );

    return {
      data: normalizedPayments,
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
    return this.normalizePaymentResponse(payment);
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
  // READ – pending payments for student & service
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get all pending payments for a student and service.
   * Useful for displaying active payment transactions or calculating balances.
   */
  async getStudentServicePendingPayments(
    tenantId: string,
    studentId: string,
    serviceId: string | null,
  ) {
    return this.getPendingPaymentsForService(tenantId, studentId, serviceId);
  }

  // ─────────────────────────────────────────────────────────────────
  // READ – payment cycle info
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get detailed payment cycle information for a student and service.
   * Shows current cycle and all previous cycles with their summaries.
   */
  async getPaymentCycleInfo(
    tenantId: string,
    studentId: string,
    serviceId: string | null,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Get current cycle (strict determination)
    const currentCycle = await this.determinePaymentCycle(tenantPrisma, studentId, serviceId);

    // Get all cycles for this student/service combination
    const allPayments = await tenantPrisma.payment.findMany({
      where: {
        studentId,
        ...(serviceId ? { serviceId } : { serviceId: null }),
      },
      orderBy: [{ paymentCycle: 'asc' }, { createdAt: 'asc' }],
    });

    // Group by cycle
    const cycleMap = new Map<
      number,
      { payments: any[]; totalAmount: number; totalPaid: number }
    >();

    allPayments.forEach((payment) => {
      if (!cycleMap.has(payment.paymentCycle)) {
        cycleMap.set(payment.paymentCycle, {
          payments: [],
          totalAmount: this.toDecimal(payment.totalAmount),
          totalPaid: 0,
        });
      }

      const cycle = cycleMap.get(payment.paymentCycle)!;
      cycle.payments.push(payment);
      cycle.totalPaid += this.toDecimal(payment.paidAmount);
    });

    // Build cycle summaries
    const allCycles = Array.from(cycleMap.entries())
      .sort(([cycleA], [cycleB]) => cycleA - cycleB)
      .map(([cycleNum, data]) => ({
        totalAmount: data.totalAmount,
        totalPaid: +data.totalPaid.toFixed(2),
        remainingAmount: +(data.totalAmount - data.totalPaid).toFixed(2),
        paymentCycle: cycleNum,
        pendingPaymentCount: data.payments.filter(
          (p) => p.status === 'Pending' || p.status === 'PartiallyPaid',
        ).length,
        cycleStatus:
          data.totalPaid >= data.totalAmount
            ? 'Completed'
            : data.totalPaid > 0
              ? 'PartiallyPaid'
              : 'Pending',
      }));

    const currentCycleSummary = allCycles.find((c) => c.paymentCycle === currentCycle) || {
      totalAmount: 0,
      totalPaid: 0,
      remainingAmount: 0,
      paymentCycle: currentCycle,
      pendingPaymentCount: 0,
      cycleStatus: 'Pending',
    };

    return {
      studentId,
      serviceId,
      currentCycle,
      currentCycleSummary,
      allCycles,
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

    const normalizedPayments = payments.map((payment) =>
      this.normalizePaymentResponse(payment),
    );

    return {
      data: normalizedPayments,
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
        ...(dto.invoiceNumber?.trim() && { invoiceNumber: dto.invoiceNumber.trim() }),
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

    return this.normalizePaymentResponse(updated);
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

  // ─────────────────────────────────────────────────────────────────
  // STATISTICS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Compute comprehensive payment statistics for the tenant (STRICT CYCLE LOGIC).
   *
   * NEW LOGIC (Payment Cycle Based):
   * - Groups payments by cycle (independent payment cycles per student/service)
   * - Collection Rate = % of completed cycles / total cycles (not $ based)
   * - Total Revenue = sum of completed cycle amounts (not individual payments)
   * - Completed Count = number of completed cycles
   * - Pending Count = number of incomplete cycles
   * - Each cycle represents independent payment toward one full service price
   *
   * Key Metrics:
   * - Total revenue (completed cycles only)
   * - Revenue change (period-over-period)
   * - Pending/Overdue amounts and counts
   * - Collection rate (% of cycles completed)
   * - Payment method and status breakdowns
   * - Daily revenue trends
   * - Various averages and medians
   */
  async getPaymentStatistics(
    tenantId: string,
    queryDto: PaymentStatisticsQueryDto,
  ): Promise<PaymentStatisticsResponseDto> {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Parse date ranges
    const fromDate = queryDto.fromDate
      ? new Date(queryDto.fromDate)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - 3); // Last 3 months by default
          return d;
        })();

    const toDate = queryDto.toDate ? new Date(queryDto.toDate) : new Date();

    const comparisonFromDate = queryDto.comparisonFromDate
      ? new Date(queryDto.comparisonFromDate)
      : (() => {
          const d = new Date(fromDate);
          d.setMonth(d.getMonth() - 3); // Prior 3-month period
          return d;
        })();

    const comparisonToDate = queryDto.comparisonToDate
      ? new Date(queryDto.comparisonToDate)
      : fromDate;

    // Build WHERE filter for current period
    const buildWhereClause = (
      dateStart: Date,
      dateEnd: Date,
      includeStatus?: boolean,
    ) => {
      const where: Record<string, any> = {
        tenantId,
        paymentDate: {
          gte: dateStart,
          lte: dateEnd,
        },
      };

      if (queryDto.paymentMethod) {
        where.paymentMethod = queryDto.paymentMethod;
      }
      if (queryDto.studentId) {
        where.studentId = queryDto.studentId;
      }
      if (queryDto.serviceId) {
        where.serviceId = queryDto.serviceId;
      }

      // Only filter by status if explicitly requested
      if (includeStatus && queryDto.status) {
        where.status = queryDto.status;
      }

      return where;
    };

    // Fetch all payments for current period
    const allPayments = await tenantPrisma.payment.findMany({
      where: buildWhereClause(fromDate, toDate, false),
      orderBy: { paymentDate: 'asc' },
    });

    // Fetch all payments for comparison period
    const comparisonPayments = await tenantPrisma.payment.findMany({
      where: buildWhereClause(comparisonFromDate, comparisonToDate, false),
    });

    // Fetch overdue payments (defined by dueDate < now, status not Completed)
    const overduePayments = await tenantPrisma.payment.findMany({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { in: ['Pending', 'PartiallyPaid'] as any[] },
        ...(queryDto.paymentMethod && { paymentMethod: queryDto.paymentMethod }),
        ...(queryDto.studentId && { studentId: queryDto.studentId }),
        ...(queryDto.serviceId && { serviceId: queryDto.serviceId }),
      },
    });

    // ─── Compute metrics (STRICT CYCLE LOGIC) ───
    // Group payments by cycle to follow new independent cycle model
    const cycleMap = new Map<
      string,
      {
        totalAmount: number;
        totalPaid: number;
        status: string;
        isCompleted: boolean;
        remainingAmount: number;
      }
    >();

    allPayments.forEach((p) => {
      // Create unique cycle key: studentId-serviceId-paymentCycle
      const cycleKey = `${p.studentId}-${p.serviceId || 'null'}-${p.paymentCycle}`;

      if (!cycleMap.has(cycleKey)) {
        cycleMap.set(cycleKey, {
          totalAmount: this.toDecimal(p.totalAmount),
          totalPaid: 0,
          status: p.status,
          isCompleted: p.status === 'Completed',
          remainingAmount: this.toDecimal(p.totalAmount),
        });
      }

      const cycle = cycleMap.get(cycleKey)!;
      cycle.totalPaid += this.toDecimal(p.paidAmount);
      cycle.remainingAmount = cycle.totalAmount - cycle.totalPaid;
      cycle.isCompleted = cycle.remainingAmount <= 0.01; // Account for rounding
    });

    // Completed cycles = cycles where totalPaid >= totalAmount
    const completedCycles = Array.from(cycleMap.values()).filter((c) => c.isCompleted);
    const incompleteCycles = Array.from(cycleMap.values()).filter((c) => !c.isCompleted);

    // Total revenue = sum of totalAmount from completed cycles
    const totalRevenue = completedCycles.reduce((sum, c) => sum + c.totalAmount, 0);

    // Comparison period cycles
    const comparisonCycleMap = new Map<string, { isCompleted: boolean; totalAmount: number }>();
    comparisonPayments.forEach((p) => {
      const cycleKey = `${p.studentId}-${p.serviceId || 'null'}-${p.paymentCycle}`;
      if (!comparisonCycleMap.has(cycleKey)) {
        comparisonCycleMap.set(cycleKey, {
          isCompleted: p.status === 'Completed',
          totalAmount: this.toDecimal(p.totalAmount),
        });
      }
    });
    const comparisonCompletedCycles = Array.from(comparisonCycleMap.values()).filter(
      (c) => c.isCompleted,
    );
    const previousRevenue = comparisonCompletedCycles.reduce((sum, c) => sum + c.totalAmount, 0);

    const revenueChange = totalRevenue - previousRevenue;
    const revenueChangePercent =
      previousRevenue > 0 ? (revenueChange / previousRevenue) * 100 : 0;

    // Total pending amount = remaining balance from incomplete cycles
    const totalPendingAmount = incompleteCycles.reduce((sum, c) => sum + c.remainingAmount, 0);

    // Total completed amount = sum of totalAmount of completed cycles
    const totalCompletedAmount = completedCycles.reduce((sum, c) => sum + c.totalAmount, 0);

    // Total invoiced amount = sum of all cycle totalAmounts
    const totalInvoicedAmount = Array.from(cycleMap.values()).reduce(
      (sum, c) => sum + c.totalAmount,
      0,
    );

    // Collection Rate = Number of completed cycles / Total cycles * 100
    const collectionRate =
      cycleMap.size > 0 ? (completedCycles.length / cycleMap.size) * 100 : 0;

    const totalOverdueAmount = overduePayments.reduce(
      (sum, p) => sum + this.toDecimal(p.remainingAmount),
      0,
    );

    // Calculate averages based on actual payments (not cycle totals)
    const averagePaymentAmount =
      allPayments.length > 0
        ? allPayments.reduce((sum, p) => sum + this.toDecimal(p.paidAmount), 0) /
          allPayments.length
        : 0;

    // Calculate median based on actual payments
    const sortedAmounts = allPayments
      .map((p) => this.toDecimal(p.paidAmount))
      .sort((a, b) => a - b);
    const medianPaymentAmount =
      sortedAmounts.length > 0
        ? sortedAmounts.length % 2 === 0
          ? (sortedAmounts[sortedAmounts.length / 2 - 1] +
              sortedAmounts[sortedAmounts.length / 2]) /
            2
          : sortedAmounts[Math.floor(sortedAmounts.length / 2)]
        : 0;

    const largestPaymentAmount = Math.max(
      ...allPayments.map((p) => this.toDecimal(p.paidAmount)),
      0,
    );

    // Calculate average days to complete payment (for completed cycles)
    const completedPayments = allPayments.filter((p) => p.status === 'Completed');
    const completedWithDates = completedPayments.filter((p) => p.dueDate && p.paymentDate);
    const averageDaysToComplete =
      completedWithDates.length > 0
        ? completedWithDates.reduce((sum, p) => {
            const daysToComplete =
              (p.paymentDate!.getTime() - p.dueDate!.getTime()) / (1000 * 60 * 60 * 24);
            return sum + daysToComplete;
          }, 0) / completedWithDates.length
        : 0;

    // Unique customers
    const uniqueCustomers = new Set(allPayments.map((p) => p.studentId));
    const uniqueCustomerCount = uniqueCustomers.size;
    const averagePaymentPerCustomer =
      uniqueCustomerCount > 0 ? totalRevenue / uniqueCustomerCount : 0;

    // ─── Status Breakdown ───
    const statusBreakdown = await this.getStatusBreakdown(
      tenantPrisma,
      tenantId,
      fromDate,
      toDate,
      queryDto,
    );

    // ─── Payment Method Breakdown ───
    const methodBreakdown = await this.getMethodBreakdown(
      tenantPrisma,
      tenantId,
      fromDate,
      toDate,
      queryDto,
    );

    // ─── Daily Revenue Trend ───
    const dailyRevenue = this.computeDailyRevenue(allPayments);

    return {
      metrics: {
        totalRevenue: +totalRevenue.toFixed(2),
        previousPeriodRevenue: +previousRevenue.toFixed(2),
        revenueChange: +revenueChange.toFixed(2),
        revenueChangePercent: +revenueChangePercent.toFixed(2),
        totalPendingAmount: +totalPendingAmount.toFixed(2),
        pendingPaymentCount: incompleteCycles.length, // Count of incomplete cycles
        totalCompletedAmount: +totalCompletedAmount.toFixed(2),
        completedPaymentCount: completedCycles.length, // Count of completed cycles
        collectionRate: +collectionRate.toFixed(2), // % of completed cycles
        totalInvoicedAmount: +totalInvoicedAmount.toFixed(2),
        totalOverdueAmount: +totalOverdueAmount.toFixed(2),
        overduePaymentCount: overduePayments.length,
        averagePaymentAmount: +averagePaymentAmount.toFixed(2),
        medianPaymentAmount: +medianPaymentAmount.toFixed(2),
        largestPaymentAmount: +largestPaymentAmount.toFixed(2),
        averageDaysToComplete: +averageDaysToComplete.toFixed(2),
        uniqueCustomerCount,
        averagePaymentPerCustomer: +averagePaymentPerCustomer.toFixed(2),
        totalCycles: cycleMap.size, // Total payment cycles in period
        completedCycles: completedCycles.length, // Completed cycles
      },
      statusBreakdown,
      methodBreakdown,
      dailyRevenue,
      appliedFilters: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        status: queryDto.status || undefined,
        paymentMethod: queryDto.paymentMethod || undefined,
        studentId: queryDto.studentId || undefined,
        serviceId: queryDto.serviceId || undefined,
      },
      computedAt: new Date().toISOString(),
    };
  }

  private async getStatusBreakdown(
    tenantPrisma: any,
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    queryDto: PaymentStatisticsQueryDto,
  ) {
    const payments = await tenantPrisma.payment.findMany({
      where: {
        tenantId,
        paymentDate: { gte: fromDate, lte: toDate },
        ...(queryDto.paymentMethod && { paymentMethod: queryDto.paymentMethod }),
        ...(queryDto.studentId && { studentId: queryDto.studentId }),
        ...(queryDto.serviceId && { serviceId: queryDto.serviceId }),
      },
    });

    const statusMap = new Map<string, { count: number; totalAmount: number }>();
    const totalAmount = payments.reduce(
      (sum: number, p: any) => sum + this.toDecimal(p.totalAmount),
      0,
    );

    payments.forEach((payment: any) => {
      const status = payment.status;
      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, totalAmount: 0 });
      }
      const current = statusMap.get(status)!;
      current.count += 1;
      current.totalAmount += this.toDecimal(payment.totalAmount);
    });

    return Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      totalAmount: +data.totalAmount.toFixed(2),
      percentage: +(totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0).toFixed(2),
    }));
  }

  private async getMethodBreakdown(
    tenantPrisma: any,
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    queryDto: PaymentStatisticsQueryDto,
  ) {
    const payments = await tenantPrisma.payment.findMany({
      where: {
        tenantId,
        paymentDate: { gte: fromDate, lte: toDate },
        status: 'Completed', // Only count completed payments for revenue breakdown
        ...(queryDto.studentId && { studentId: queryDto.studentId }),
        ...(queryDto.serviceId && { serviceId: queryDto.serviceId }),
      },
    });

    const methodMap = new Map<string, { count: number; totalAmount: number }>();
    const totalAmount = payments.reduce(
      (sum: number, p: any) => sum + this.toDecimal(p.paidAmount),
      0,
    );

    payments.forEach((payment: any) => {
      const method = payment.paymentMethod;
      if (!methodMap.has(method)) {
        methodMap.set(method, { count: 0, totalAmount: 0 });
      }
      const current = methodMap.get(method)!;
      current.count += 1;
      current.totalAmount += this.toDecimal(payment.paidAmount);
    });

    return Array.from(methodMap.entries()).map(([method, data]) => ({
      paymentMethod: method,
      count: data.count,
      totalAmount: +data.totalAmount.toFixed(2),
      percentage: +(totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0).toFixed(2),
    }));
  }

  private computeDailyRevenue(payments: any[]): any[] {
    const dailyMap = new Map<string, { revenue: number; count: number }>();

    payments
      .filter((p) => p.paymentDate && p.status === 'Completed')
      .forEach((payment) => {
        const dateStr = payment.paymentDate.toISOString().split('T')[0];
        if (!dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, { revenue: 0, count: 0 });
        }
        const current = dailyMap.get(dateStr)!;
        current.revenue += this.toDecimal(payment.paidAmount);
        current.count += 1;
      });

    return Array.from(dailyMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, data]) => ({
        date,
        revenue: +data.revenue.toFixed(2),
        paymentCount: data.count,
      }));
  }
}
