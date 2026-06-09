import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { TenantService } from '../../common/tenant/tenant.service';
import { StaffService } from '../staff/staff.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QueueItemStatusEnum, QueueTypeEnum, AssignmentReasonEnum } from './dto/queue.dto';

describe('QueueService', () => {
  let service: QueueService;
  let mockPrisma: any;
  let mockStaffService: any;

  const mockTenantId = 'tenant-123';
  const mockQueueId = 'queue-123';
  const mockLeadId = 'lead-123';
  const mockUserId = 'user-123';
  const mockStaffProfileId = 'staff-profile-123';
  const mockQueueItemId = 'queue-item-123';

  const mockQueue = {
    id: mockQueueId,
    tenantId: mockTenantId,
    type: 'NewLead',
    name: 'Test Queue',
    isActive: true,
  };

  const mockLead = {
    id: mockLeadId,
    tenantId: mockTenantId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    status: 'New',
    priority: 'Medium',
    assignedUserId: null,
  };

  const mockStaffProfile = {
    id: mockStaffProfileId,
    tenantId: mockTenantId,
    userId: mockUserId,
    staffType: 'Counselor',
    status: 'Available',
    maxWorkload: 100,
  };

  const mockQueueItem = {
    id: mockQueueItemId,
    tenantId: mockTenantId,
    queueId: mockQueueId,
    leadId: mockLeadId,
    assignedTo: null,
    status: 'Waiting',
    priority: 'Medium',
    enteredAt: new Date(),
    queue: { id: mockQueueId, type: 'NewLead', name: 'Test Queue' },
    lead: mockLead,
    assignedStaff: null,
    notes: null,
  };

  const mockTransaction = (callback: any) => callback(mockPrisma);

  beforeEach(async () => {
    mockPrisma = {
      queue: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      queueItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      lead: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      assignmentHistory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      staffProfile: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(mockTransaction),
    };

    mockStaffService = {
      getWorkload: jest.fn(),
      getBestCounselorForAssignment: jest.fn(),
    };

    const mockTenantService = {
      getTenantPrisma: jest.fn().mockResolvedValue(mockPrisma),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: TenantService, useValue: mockTenantService },
        { provide: StaffService, useValue: mockStaffService },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== Queue Management ====================

  describe('createQueue', () => {
    it('should create a queue', async () => {
      const dto = { type: QueueTypeEnum.NewLead, name: 'New Lead Queue' };
      mockPrisma.queue.create.mockResolvedValue({ ...mockQueue, type: 'NewLead' });

      const result = await service.createQueue(mockTenantId, dto);

      expect(mockPrisma.queue.create).toHaveBeenCalledWith({
        data: { tenantId: mockTenantId, type: 'NewLead', name: 'New Lead Queue', description: undefined },
      });
      expect(result).toBeDefined();
    });
  });

  // ==================== Queue Items / addToQueue ====================

  describe('addToQueue', () => {
    it('should add a lead to the queue', async () => {
      mockPrisma.queue.findFirst.mockResolvedValue(mockQueue);
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.queueItem.findFirst.mockResolvedValue(null);
      mockPrisma.queueItem.create.mockResolvedValue(mockQueueItem);

      const result = await service.addToQueue(mockTenantId, mockQueueId, { leadId: mockLeadId });

      expect(result).toBeDefined();
      expect(result.id).toBe(mockQueueItemId);
    });

    it('should throw if queue not found', async () => {
      mockPrisma.queue.findFirst.mockResolvedValue(null);

      await expect(
        service.addToQueue(mockTenantId, mockQueueId, { leadId: mockLeadId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if lead not found', async () => {
      mockPrisma.queue.findFirst.mockResolvedValue(mockQueue);
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.addToQueue(mockTenantId, mockQueueId, { leadId: mockLeadId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if lead already in active queue item', async () => {
      mockPrisma.queue.findFirst.mockResolvedValue(mockQueue);
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.queueItem.findFirst.mockResolvedValue(mockQueueItem);

      await expect(
        service.addToQueue(mockTenantId, mockQueueId, { leadId: mockLeadId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use transaction to prevent race conditions', async () => {
      const transactionSpy = jest.spyOn(mockPrisma, '$transaction');
      mockPrisma.queue.findFirst.mockResolvedValue(mockQueue);
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.queueItem.findFirst.mockResolvedValue(null);
      mockPrisma.queueItem.create.mockResolvedValue(mockQueueItem);

      await service.addToQueue(mockTenantId, mockQueueId, { leadId: mockLeadId });

      expect(transactionSpy).toHaveBeenCalled();
    });
  });

  // ==================== State Machine / updateQueueItemStatus ====================

  describe('updateQueueItemStatus', () => {
    it('should allow valid transition: Waiting -> Assigned', async () => {
      mockPrisma.queueItem.findFirst.mockResolvedValue(mockQueueItem);
      mockPrisma.queueItem.update.mockResolvedValue({ ...mockQueueItem, status: 'Assigned' });

      const result = await service.updateQueueItemStatus(mockTenantId, mockQueueItemId, {
        status: QueueItemStatusEnum.Assigned,
      });

      expect(result).toBeDefined();
    });

    it('should reject invalid transition: Waiting -> Completed', async () => {
      mockPrisma.queueItem.findFirst.mockResolvedValue(mockQueueItem);

      await expect(
        service.updateQueueItemStatus(mockTenantId, mockQueueItemId, {
          status: QueueItemStatusEnum.Completed,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition: Assigned -> Waiting', async () => {
      const assignedItem = { ...mockQueueItem, status: 'Assigned' };
      mockPrisma.queueItem.findFirst.mockResolvedValue(assignedItem);

      await expect(
        service.updateQueueItemStatus(mockTenantId, mockQueueItemId, {
          status: QueueItemStatusEnum.Waiting,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition: Completed -> InProgress', async () => {
      const completedItem = { ...mockQueueItem, status: 'Completed' };
      mockPrisma.queueItem.findFirst.mockResolvedValue(completedItem);

      await expect(
        service.updateQueueItemStatus(mockTenantId, mockQueueItemId, {
          status: QueueItemStatusEnum.InProgress,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition: Skipped -> Assigned', async () => {
      const skippedItem = { ...mockQueueItem, status: 'Skipped' };
      mockPrisma.queueItem.findFirst.mockResolvedValue(skippedItem);

      await expect(
        service.updateQueueItemStatus(mockTenantId, mockQueueItemId, {
          status: QueueItemStatusEnum.Assigned,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set completedAt when status is Completed', async () => {
      const assignedItem = { ...mockQueueItem, status: 'Assigned' };
      mockPrisma.queueItem.findFirst.mockResolvedValue(assignedItem);
      mockPrisma.queueItem.update.mockResolvedValue({ ...assignedItem, status: 'Completed' });

      const result = await service.updateQueueItemStatus(mockTenantId, mockQueueItemId, {
        status: QueueItemStatusEnum.InProgress,
      });

      mockPrisma.queueItem.findFirst.mockResolvedValue({ ...assignedItem, status: 'InProgress' });

      await service.updateQueueItemStatus(mockTenantId, mockQueueItemId, {
        status: QueueItemStatusEnum.Completed,
      });

      expect(mockPrisma.queueItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ==================== Assignment ====================

  describe('assignQueueItem', () => {
    it('should assign a waiting queue item to a staff profile', async () => {
      const waitingItem = { ...mockQueueItem, status: 'Waiting' };
      mockPrisma.queueItem.findFirst.mockResolvedValue(waitingItem);
      mockPrisma.staffProfile.findFirst.mockResolvedValue(mockStaffProfile);
      mockPrisma.queueItem.update.mockResolvedValue({
        ...waitingItem,
        status: 'Assigned',
        assignedTo: mockStaffProfileId,
      });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, assignedUserId: mockUserId });
      mockPrisma.assignmentHistory.create.mockResolvedValue({});

      const result = await service.assignQueueItem(mockTenantId, mockQueueItemId, {
        staffProfileId: mockStaffProfileId,
      });

      expect(result).toBeDefined();
      expect(mockPrisma.lead.update).toHaveBeenCalled();
      expect(mockPrisma.assignmentHistory.create).toHaveBeenCalled();
    });

    it('should reject assignment for non-Waiting items', async () => {
      const assignedItem = { ...mockQueueItem, status: 'InProgress' };
      mockPrisma.queueItem.findFirst.mockResolvedValue(assignedItem);

      await expect(
        service.assignQueueItem(mockTenantId, mockQueueItemId, {
          staffProfileId: mockStaffProfileId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Reassignment with Capacity ====================

  describe('reassignQueueItem', () => {
    it('should reject reassignment when target staff has exceeded capacity', async () => {
      const assignedItem = { ...mockQueueItem, status: 'Assigned', assignedTo: 'old-staff' };
      mockPrisma.queueItem.findFirst.mockResolvedValue(assignedItem);
      mockPrisma.staffProfile.findFirst.mockResolvedValue({
        ...mockStaffProfile,
        id: 'new-staff',
        status: 'Available',
      });
      mockStaffService.getWorkload.mockResolvedValue([{
        workloadPercentage: 95,
        name: 'Test Staff',
        staffType: 'Counselor',
      }]);

      await expect(
        service.reassignQueueItem(mockTenantId, mockQueueItemId, {
          toStaffProfileId: 'new-staff',
          reason: 'Workload balancing',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject reassignment when target staff is OnLeave or Offline', async () => {
      const assignedItem = { ...mockQueueItem, status: 'Assigned', assignedTo: 'old-staff' };
      mockPrisma.queueItem.findFirst.mockResolvedValue(assignedItem);
      mockPrisma.staffProfile.findFirst.mockResolvedValue({
        ...mockStaffProfile,
        id: 'new-staff',
        status: 'OnLeave',
      });
      mockStaffService.getWorkload.mockResolvedValue([{
        workloadPercentage: 30,
        name: 'Test Staff',
        staffType: 'Counselor',
      }]);

      await expect(
        service.reassignQueueItem(mockTenantId, mockQueueItemId, {
          toStaffProfileId: 'new-staff',
          reason: 'Reassign',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Revisit Lead ====================

  describe('handleRevisitLead', () => {
    const mockRevisitQueue = {
      id: 'revisit-queue',
      tenantId: mockTenantId,
      type: 'RevisitLead',
      name: 'Revisit Queue',
    };

    const mockAssignmentHistory = {
      id: 'hist-1',
      tenantId: mockTenantId,
      leadId: mockLeadId,
      toStaffId: mockStaffProfileId,
      toStaff: {
        ...mockStaffProfile,
        user: { id: mockUserId, status: 'Active', name: 'John', email: 'john@test.com' },
      },
    };

    beforeEach(() => {
      mockPrisma.queue.findFirst.mockResolvedValue(mockRevisitQueue);
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
    });

    it('should assign to previous counselor when available and has capacity', async () => {
      mockPrisma.assignmentHistory.findFirst.mockResolvedValue(mockAssignmentHistory);
      mockStaffService.getWorkload.mockResolvedValue([{ workloadPercentage: 40 }]);
      mockPrisma.queueItem.findFirst.mockResolvedValue(null);
      mockPrisma.queueItem.create.mockResolvedValue({
        ...mockQueueItem,
        status: 'Assigned',
        assignedTo: mockStaffProfileId,
      });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, assignedUserId: mockUserId });
      mockPrisma.assignmentHistory.create.mockResolvedValue({});

      const result = await service.handleRevisitLead(mockTenantId, mockLeadId);

      expect(result).toBeDefined();
      expect(mockPrisma.queueItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'Assigned',
            assignedTo: mockStaffProfileId,
          }),
        }),
      );
      expect(mockPrisma.lead.update).toHaveBeenCalled();
      expect(mockPrisma.assignmentHistory.create).toHaveBeenCalled();
    });

    it('should fall back to auto-assign when previous counselor is unavailable', async () => {
      const busyStaff = {
        ...mockAssignmentHistory,
        toStaff: {
          ...mockStaffProfile,
          status: 'Busy',
          user: { id: mockUserId, status: 'Active', name: 'John', email: 'john@test.com' },
        },
      };
      mockPrisma.assignmentHistory.findFirst.mockResolvedValue(busyStaff);
      mockPrisma.queueItem.findFirst
        .mockResolvedValueOnce(null)  // addToQueue duplicate check
        .mockResolvedValueOnce(mockQueueItem);  // getQueueItemById in autoAssign
      mockPrisma.queueItem.create.mockResolvedValue(mockQueueItem);
      mockStaffService.getBestCounselorForAssignment.mockResolvedValue({
        staffId: 'counselor-2',
        userId: 'user-2',
        workloadPercentage: 20,
      });
      mockPrisma.queueItem.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'Assigned',
        assignedTo: 'counselor-2',
      });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, assignedUserId: 'user-2' });
      mockPrisma.assignmentHistory.create.mockResolvedValue({});

      const result = await service.handleRevisitLead(mockTenantId, mockLeadId);

      expect(result).toBeDefined();
      expect(mockStaffService.getBestCounselorForAssignment).toHaveBeenCalled();
    });

    it('should fall back to auto-assign when previous counselor has no capacity', async () => {
      mockPrisma.assignmentHistory.findFirst.mockResolvedValue(mockAssignmentHistory);
      mockStaffService.getWorkload.mockResolvedValue([{ workloadPercentage: 90 }]);
      mockPrisma.queueItem.findFirst
        .mockResolvedValueOnce(null)  // addToQueue duplicate check
        .mockResolvedValueOnce(mockQueueItem);  // getQueueItemById in autoAssign
      mockPrisma.queueItem.create.mockResolvedValue(mockQueueItem);
      mockStaffService.getBestCounselorForAssignment.mockResolvedValue({
        staffId: 'counselor-2',
        userId: 'user-2',
        workloadPercentage: 20,
      });
      mockPrisma.queueItem.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'Assigned',
        assignedTo: 'counselor-2',
      });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, assignedUserId: 'user-2' });
      mockPrisma.assignmentHistory.create.mockResolvedValue({});

      const result = await service.handleRevisitLead(mockTenantId, mockLeadId);

      expect(result).toBeDefined();
      expect(mockStaffService.getBestCounselorForAssignment).toHaveBeenCalled();
    });

    it('should fall back to auto-assign when previous counselor is inactive', async () => {
      const inactiveStaff = {
        ...mockAssignmentHistory,
        toStaff: {
          ...mockStaffProfile,
          user: { id: mockUserId, status: 'Inactive', name: 'John', email: 'john@test.com' },
        },
      };
      mockPrisma.assignmentHistory.findFirst.mockResolvedValue(inactiveStaff);
      mockPrisma.queueItem.findFirst
        .mockResolvedValueOnce(null)  // addToQueue duplicate check
        .mockResolvedValueOnce(mockQueueItem);  // getQueueItemById in autoAssign
      mockPrisma.queueItem.create.mockResolvedValue(mockQueueItem);
      mockStaffService.getBestCounselorForAssignment.mockResolvedValue({
        staffId: 'counselor-2',
        userId: 'user-2',
        workloadPercentage: 20,
      });
      mockPrisma.queueItem.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'Assigned',
        assignedTo: 'counselor-2',
      });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, assignedUserId: 'user-2' });
      mockPrisma.assignmentHistory.create.mockResolvedValue({});

      const result = await service.handleRevisitLead(mockTenantId, mockLeadId);

      expect(result).toBeDefined();
      expect(mockStaffService.getBestCounselorForAssignment).toHaveBeenCalled();
    });

    it('should handle no previous assignment history (new revisit)', async () => {
      mockPrisma.assignmentHistory.findFirst.mockResolvedValue(null);
      mockPrisma.queueItem.findFirst.mockResolvedValue(null);
      mockPrisma.queueItem.create.mockResolvedValue(mockQueueItem);
      mockStaffService.getBestCounselorForAssignment.mockResolvedValue({
        staffId: 'counselor-1',
        userId: 'user-1',
        workloadPercentage: 10,
      });
      mockPrisma.queueItem.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'Assigned',
        assignedTo: 'counselor-1',
      });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, assignedUserId: 'user-1' });
      mockPrisma.assignmentHistory.create.mockResolvedValue({});

      const result = await service.handleRevisitLead(mockTenantId, mockLeadId);

      expect(result).toBeDefined();
    });
  });
});
