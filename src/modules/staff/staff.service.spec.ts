import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { TenantService } from '../../common/tenant/tenant.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { StaffTypeEnum, StaffStatusEnum } from './dto/staff.dto';

describe('StaffService', () => {
  let service: StaffService;
  let mockPrisma: any;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockStaffProfileId = 'staff-123';
  const mockRoleId = 'role-123';

  const mockUser = {
    id: mockUserId,
    tenantId: mockTenantId,
    name: 'John Doe',
    email: 'john@example.com',
    roleId: mockRoleId,
    status: 'Active',
    role: {
      id: mockRoleId,
      name: 'Counselor',
    },
  };

  const mockStaffProfile = {
    id: mockStaffProfileId,
    tenantId: mockTenantId,
    userId: mockUserId,
    staffType: 'Counselor',
    status: 'Available',
    maxWorkload: 100,
    user: {
      id: mockUserId,
      name: 'John Doe',
      email: 'john@example.com',
      roleId: mockRoleId,
      status: 'Active',
    },
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findFirst: jest.fn(),
      },
      staffProfile: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      lead: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      task: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      activityLog: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      appointment: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      queueItem: {
        count: jest.fn(),
      },
    };

    const mockTenantService = {
      getTenantPrisma: jest.fn().mockResolvedValue(mockPrisma),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: TenantService, useValue: mockTenantService },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== StaffType Validation ====================

  describe('StaffType validation on createProfile', () => {
    it('should allow creating profile with matching StaffType and Role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.staffProfile.findFirst.mockResolvedValue(null);
      mockPrisma.staffProfile.create.mockResolvedValue(mockStaffProfile);

      const result = await service.createProfile(mockTenantId, {
        userId: mockUserId,
        staffType: StaffTypeEnum.Counselor,
      });

      expect(result).toBeDefined();
    });

    it('should reject creating profile with mismatched StaffType and Role', async () => {
      const financeRole = { ...mockUser, role: { id: mockRoleId, name: 'Finance Officer' } };
      mockPrisma.user.findFirst.mockResolvedValue(financeRole);
      mockPrisma.staffProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.createProfile(mockTenantId, {
          userId: mockUserId,
          staffType: StaffTypeEnum.Counselor,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when user has no role', async () => {
      const noRoleUser = { ...mockUser, role: null };
      mockPrisma.user.findFirst.mockResolvedValue(noRoleUser);

      await expect(
        service.createProfile(mockTenantId, {
          userId: mockUserId,
          staffType: StaffTypeEnum.Counselor,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow creating profile with StaffType.Other regardless of role', async () => {
      const anyRole = { ...mockUser, role: { id: mockRoleId, name: 'Custom Role' } };
      mockPrisma.user.findFirst.mockResolvedValue(anyRole);
      mockPrisma.staffProfile.findFirst.mockResolvedValue(null);
      mockPrisma.staffProfile.create.mockResolvedValue({
        ...mockStaffProfile,
        staffType: 'Other',
      });

      const result = await service.createProfile(mockTenantId, {
        userId: mockUserId,
        staffType: StaffTypeEnum.Other,
      });

      expect(result).toBeDefined();
    });

    it('should validate AdmissionsOfficer StaffType with corresponding role', async () => {
      const admissionsUser = {
        ...mockUser,
        role: { id: mockRoleId, name: 'Admission Officer' },
      };
      mockPrisma.user.findFirst.mockResolvedValue(admissionsUser);
      mockPrisma.staffProfile.findFirst.mockResolvedValue(null);
      mockPrisma.staffProfile.create.mockResolvedValue({
        ...mockStaffProfile,
        staffType: 'AdmissionOfficer',
      });

      const result = await service.createProfile(mockTenantId, {
        userId: mockUserId,
        staffType: StaffTypeEnum.AdmissionOfficer,
      });

      expect(result).toBeDefined();
    });
  });

  describe('StaffType validation on updateProfile', () => {
    it('should validate StaffType when updating to a new type', async () => {
      mockPrisma.staffProfile.findFirst.mockResolvedValue(mockStaffProfile);
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.staffProfile.update.mockResolvedValue({
        ...mockStaffProfile,
        staffType: 'AdmissionOfficer',
      });

      await expect(
        service.updateProfile(mockTenantId, mockStaffProfileId, {
          staffType: StaffTypeEnum.AdmissionOfficer,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow updating StaffType when role matches', async () => {
      const visaUser = {
        ...mockUser,
        role: { id: mockRoleId, name: 'Visa Officer' },
      };
      mockPrisma.staffProfile.findFirst.mockResolvedValue({
        ...mockStaffProfile,
        user: visaUser,
      });
      mockPrisma.user.findFirst.mockResolvedValue(visaUser);
      mockPrisma.staffProfile.update.mockResolvedValue({
        ...mockStaffProfile,
        staffType: 'VisaOfficer',
      });

      const result = await service.updateProfile(mockTenantId, mockStaffProfileId, {
        staffType: StaffTypeEnum.VisaOfficer,
      });

      expect(result).toBeDefined();
    });
  });

  // ==================== Counselor Filtering ====================

  describe('getAvailableCounselors', () => {
    it('should only return counselors', async () => {
      const mockWorkload = [
        {
          staffId: 's1',
          userId: 'u1',
          name: 'Counselor A',
          staffType: StaffTypeEnum.Counselor,
          status: StaffStatusEnum.Available,
          workloadPercentage: 30,
        },
        {
          staffId: 's2',
          userId: 'u2',
          name: 'Finance Officer B',
          staffType: StaffTypeEnum.FinanceOfficer,
          status: StaffStatusEnum.Available,
          workloadPercentage: 20,
        },
      ];

      mockPrisma.staffProfile.findMany.mockResolvedValue([
        { id: 's1', userId: 'u1', staffType: 'Counselor', status: 'Available', maxWorkload: 100, user: { name: 'Counselor A', email: 'a@test.com' } },
        { id: 's2', userId: 'u2', staffType: 'FinanceOfficer', status: 'Available', maxWorkload: 100, user: { name: 'Finance Officer B', email: 'b@test.com' } },
      ]);
      mockPrisma.lead.count.mockResolvedValue(0);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.activityLog.count.mockResolvedValue(0);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.queueItem.count.mockResolvedValue(0);

      const result = await service.getAvailableCounselors(mockTenantId);

      expect(result.length).toBe(1);
      expect(result[0].staffType).toBe(StaffTypeEnum.Counselor);
    });

    it('should return empty array if no counselors available', async () => {
      mockPrisma.staffProfile.findMany.mockResolvedValue([]);

      const result = await service.getAvailableCounselors(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('getBestCounselorForAssignment', () => {
    it('should only consider counselors for assignment', async () => {
      mockPrisma.staffProfile.findMany.mockResolvedValue([
        { id: 's1', userId: 'u1', staffType: 'Counselor', status: 'Available', maxWorkload: 100, user: { name: 'Counselor A', email: 'a@test.com' } },
        { id: 's2', userId: 'u2', staffType: 'VisaOfficer', status: 'Available', maxWorkload: 100, user: { name: 'Visa Officer B', email: 'b@test.com' } },
      ]);
      mockPrisma.lead.count.mockResolvedValue(0);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.activityLog.count.mockResolvedValue(0);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.queueItem.count.mockResolvedValue(0);

      const result = await service.getBestCounselorForAssignment(mockTenantId);

      expect(result).not.toBeNull();
      expect(result!.staffType).toBe(StaffTypeEnum.Counselor);
    });

    it('should return null if no counselors available', async () => {
      mockPrisma.staffProfile.findMany.mockResolvedValue([
        { id: 's1', userId: 'u1', staffType: 'FinanceOfficer', status: 'Available', maxWorkload: 100, user: { name: 'Finance A', email: 'a@test.com' } },
      ]);
      mockPrisma.lead.count.mockResolvedValue(10);
      mockPrisma.task.count.mockResolvedValue(5);
      mockPrisma.activityLog.count.mockResolvedValue(0);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.queueItem.count.mockResolvedValue(3);

      const result = await service.getBestCounselorForAssignment(mockTenantId);

      expect(result).toBeNull();
    });

    it('should prefer the preferred staff if available and has capacity', async () => {
      mockPrisma.staffProfile.findMany.mockResolvedValue([
        { id: 's1', userId: 'u1', staffType: 'Counselor', status: 'Available', maxWorkload: 100, user: { name: 'Counselor A', email: 'a@test.com' } },
        { id: 's2', userId: 'u2', staffType: 'Counselor', status: 'Available', maxWorkload: 100, user: { name: 'Counselor B', email: 'b@test.com' } },
      ]);
      mockPrisma.lead.count.mockResolvedValue(0);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.activityLog.count.mockResolvedValue(0);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.queueItem.count.mockResolvedValue(0);

      const result = await service.getBestCounselorForAssignment(mockTenantId, 's2');

      expect(result).not.toBeNull();
      expect(result!.staffId).toBe('s2');
    });
  });
});
