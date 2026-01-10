import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { TenantService } from '../../common/tenant/tenant.service';
import { NotFoundException } from '@nestjs/common';

describe('LeadsService', () => {
  let service: LeadsService;
  let tenantService: TenantService;

  const mockPrismaService = {
    lead: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    student: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockTenantService = {
    getTenantPrisma: jest.fn().mockResolvedValue(mockPrismaService),
  };

  const mockTenantId = 'tenant-123';
  const mockLead = {
    id: 'lead-123',
    tenantId: mockTenantId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    status: 'New',
    priority: 'High',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    tenantService = module.get<TenantService>(TenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLead', () => {
    it('should create a lead successfully', async () => {
      const createLeadDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        priority: 'High' as const,
      };

      mockPrismaService.lead.create.mockResolvedValue({
        ...mockLead,
        assignedUser: null,
      });

      const result = await service.createLead(mockTenantId, createLeadDto);

      expect(mockTenantService.getTenantPrisma).toHaveBeenCalledWith(
        mockTenantId,
      );
      expect(mockPrismaService.lead.create).toHaveBeenCalledWith({
        data: {
          ...createLeadDto,
          tenantId: mockTenantId,
        },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
      expect(result.firstName).toBe('John');
    });
  });

  describe('getAllLeads', () => {
    it('should return paginated leads', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      const mockLeads = [mockLead];
      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);
      mockPrismaService.lead.count.mockResolvedValue(1);

      const result = await service.getAllLeads(mockTenantId, paginationDto);

      expect(result).toEqual({
        data: mockLeads,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        search: 'john',
      };

      mockPrismaService.lead.findMany.mockResolvedValue([mockLead]);
      mockPrismaService.lead.count.mockResolvedValue(1);

      await service.getAllLeads(mockTenantId, paginationDto);

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('getLeadById', () => {
    it('should return a lead by id', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue({
        ...mockLead,
        assignedUser: null,
      });

      const result = await service.getLeadById(mockTenantId, mockLead.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockLead.id);
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);

      await expect(service.getLeadById(mockTenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLead', () => {
    it('should update a lead', async () => {
      const updateDto = {
        status: 'Contacted' as const,
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLead,
        ...updateDto,
        assignedUser: null,
      });

      const result = await service.updateLead(mockTenantId, mockLead.id, updateDto);

      expect(result.status).toBe('Contacted');
    });
  });

  describe('deleteLead', () => {
    it('should delete a lead', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.lead.delete.mockResolvedValue(mockLead);

      const result = await service.deleteLead(mockTenantId, mockLead.id);

      expect(result).toEqual({
        success: true,
        message: 'Lead deleted successfully',
      });
    });
  });

  describe('convertToStudent', () => {
    it('should convert lead to student', async () => {
      const convertDto = {
        academicRecords: { degree: 'Bachelor' },
        testScores: { ielts: 7.5 },
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      
      const mockStudent = {
        id: 'student-123',
        tenantId: mockTenantId,
        leadId: mockLead.id,
        firstName: mockLead.firstName,
        lastName: mockLead.lastName,
        email: mockLead.email,
        status: 'Prospective',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          student: {
            create: jest.fn().mockResolvedValue(mockStudent),
          },
          lead: {
            update: jest.fn().mockResolvedValue({ ...mockLead, status: 'Converted' }),
          },
        });
      });

      const result = await service.convertToStudent(mockTenantId, mockLead.id, convertDto);

      expect(result).toBeDefined();
      expect(result.leadId).toBe(mockLead.id);
    });

    it('should throw error if lead already converted', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue({
        ...mockLead,
        status: 'Converted',
      });

      await expect(
        service.convertToStudent(mockTenantId, mockLead.id, {}),
      ).rejects.toThrow('Lead already converted');
    });
  });
});
