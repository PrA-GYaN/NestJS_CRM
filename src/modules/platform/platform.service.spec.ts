import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from './platform.service';
import { MasterPrismaService } from '../../common/prisma/master-prisma.service';
import { TenantService } from '../../common/tenant/tenant.service';
import { AuthService } from '../auth/auth.service';
import { ConflictException } from '@nestjs/common';

describe('PlatformService - Tenant Auto-Seeding', () => {
  let service: PlatformService;
  let masterPrismaService: MasterPrismaService;
  let tenantService: TenantService;
  let authService: AuthService;

  const mockPrisma = {
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    platformAdmin: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockTenantPrisma = {
    $transaction: jest.fn(),
    role: {
      create: jest.fn(),
    },
    permission: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    rolePermission: {
      createMany: jest.fn(),
    },
    user: {
      create: jest.fn(),
    },
  };

  const mockTenantService = {
    encrypt: jest.fn((password) => `encrypted_${password}`),
    decrypt: jest.fn((password) => password.replace('encrypted_', '')),
    getTenantPrisma: jest.fn(),
    closeTenantConnection: jest.fn(),
  };

  const mockAuthService = {
    hashPassword: jest.fn((password) => `hashed_${password}`),
    validateUser: jest.fn(),
    platformAdminLogin: jest.fn(),
    tenantUserLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        { provide: MasterPrismaService, useValue: mockPrisma },
        { provide: TenantService, useValue: mockTenantService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
    masterPrismaService = module.get<MasterPrismaService>(MasterPrismaService);
    tenantService = module.get<TenantService>(TenantService);
    authService = module.get<AuthService>(AuthService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createTenant', () => {
    it('should create a tenant and automatically seed the database', async () => {
      const createTenantDto = {
        name: 'Test Education Consultancy',
        subdomain: 'test',
        dbHost: 'localhost',
        dbName: 'tenant_test',
        dbUser: 'postgres',
        dbPassword: 'postgres',
        featurePackage: 'Advanced' as any,
      };

      const mockTenant = {
        id: 'tenant-123',
        ...createTenantDto,
        dbPassword: 'encrypted_postgres',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock tenant doesn't exist
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      // Mock tenant creation
      mockPrisma.tenant.create.mockResolvedValue(mockTenant);

      // Mock tenant database connection
      mockTenantService.getTenantPrisma.mockResolvedValue(mockTenantPrisma);

      // Mock transaction to capture the callback
      mockTenantPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTenantPrisma);
      });

      // Mock permission creation
      mockTenantPrisma.permission.upsert.mockImplementation(async (args) => ({
        id: `perm-${args.create.name}`,
        ...args.create,
        createdAt: new Date(),
      }));

      // Mock role creation
      mockTenantPrisma.role.create.mockResolvedValue({
        id: 'role-admin-123',
        tenantId: mockTenant.id,
        name: 'Admin',
        description: 'Full access administrator role',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock role permission assignment
      mockTenantPrisma.rolePermission.createMany.mockResolvedValue({ count: 50 });

      // Mock user creation
      mockTenantPrisma.user.create.mockResolvedValue({
        id: 'user-admin-123',
        tenantId: mockTenant.id,
        name: 'Test Education Consultancy Administrator',
        email: 'testeducationconsultancy@example.com',
        password: 'hashed_Admin@123456',
        roleId: 'role-admin-123',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const result = await service.createTenant(createTenantDto);

      // Assertions
      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { subdomain: 'test' },
      });
      expect(mockTenantService.encrypt).toHaveBeenCalledWith('postgres');
      expect(mockPrisma.tenant.create).toHaveBeenCalled();
      expect(mockTenantService.getTenantPrisma).toHaveBeenCalledWith('tenant-123');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('Admin@123456');
      expect(mockTenantPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException if subdomain already exists', async () => {
      const createTenantDto = {
        name: 'Test Consultancy',
        subdomain: 'existing',
        dbHost: 'localhost',
        dbName: 'tenant_existing',
        dbUser: 'postgres',
        dbPassword: 'postgres',
        featurePackage: 'Basic' as any,
      };

      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'existing-tenant-id',
        ...createTenantDto,
      });

      await expect(service.createTenant(createTenantDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it('should generate correct admin email from tenant name', async () => {
      const testCases = [
        { name: 'ABC Consultancy', expected: 'abcconsultancy@example.com' },
        { name: 'Global Education Services', expected: 'globaleducationserv@example.com' },
        { name: 'Study@Abroad!', expected: 'studyabroad@example.com' },
      ];

      for (const testCase of testCases) {
        mockPrisma.tenant.findUnique.mockResolvedValue(null);
        mockPrisma.tenant.create.mockResolvedValue({
          id: 'tenant-id',
          name: testCase.name,
          subdomain: 'test',
          dbHost: 'localhost',
          dbName: 'test',
          dbUser: 'postgres',
          dbPassword: 'encrypted_pass',
          featurePackage: 'Basic',
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        mockTenantService.getTenantPrisma.mockResolvedValue(mockTenantPrisma);
        mockTenantPrisma.$transaction.mockImplementation(async (callback) => {
          return callback(mockTenantPrisma);
        });

        mockTenantPrisma.permission.upsert.mockResolvedValue({
          id: 'perm-id',
          name: 'test',
          description: 'test',
          createdAt: new Date(),
        });

        mockTenantPrisma.role.create.mockResolvedValue({
          id: 'role-id',
          tenantId: 'tenant-id',
          name: 'Admin',
          description: 'Admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        mockTenantPrisma.user.create.mockImplementation(async (args: any) => {
          expect(args.data.email).toBe(testCase.expected);
          return {
            id: 'user-id',
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

        await service.createTenant({
          name: testCase.name,
          subdomain: 'test',
          dbHost: 'localhost',
          dbName: 'test',
          dbUser: 'postgres',
          dbPassword: 'pass',
          featurePackage: 'Basic' as any,
        });

        jest.clearAllMocks();
      }
    });

    it('should create all required permissions', async () => {
      const createTenantDto = {
        name: 'Test',
        subdomain: 'test',
        dbHost: 'localhost',
        dbName: 'test',
        dbUser: 'postgres',
        dbPassword: 'pass',
        featurePackage: 'Basic' as any,
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.create.mockResolvedValue({
        id: 'tenant-id',
        ...createTenantDto,
        dbPassword: 'encrypted_pass',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockTenantService.getTenantPrisma.mockResolvedValue(mockTenantPrisma);

      const permissionsCreated: string[] = [];

      mockTenantPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTenantPrisma);
      });

      mockTenantPrisma.permission.upsert.mockImplementation(async (args: any) => {
        permissionsCreated.push(args.create.name);
        return {
          id: `perm-${args.create.name}`,
          ...args.create,
          createdAt: new Date(),
        };
      });

      mockTenantPrisma.role.create.mockResolvedValue({
        id: 'role-id',
        tenantId: 'tenant-id',
        name: 'Admin',
        description: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockTenantPrisma.user.create.mockResolvedValue({
        id: 'user-id',
        tenantId: 'tenant-id',
        name: 'Admin',
        email: 'test@example.com',
        password: 'hashed',
        roleId: 'role-id',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createTenant(createTenantDto);

      // Verify essential permissions were created
      expect(permissionsCreated).toContain('users.view');
      expect(permissionsCreated).toContain('users.create');
      expect(permissionsCreated).toContain('leads.view');
      expect(permissionsCreated).toContain('students.view');
      expect(permissionsCreated).toContain('settings.update');
      
      // Verify at least 40 permissions were created
      expect(permissionsCreated.length).toBeGreaterThanOrEqual(40);
    });

    it('should handle seeding errors gracefully', async () => {
      const createTenantDto = {
        name: 'Test',
        subdomain: 'test',
        dbHost: 'localhost',
        dbName: 'test',
        dbUser: 'postgres',
        dbPassword: 'pass',
        featurePackage: 'Basic' as any,
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.create.mockResolvedValue({
        id: 'tenant-id',
        ...createTenantDto,
        dbPassword: 'encrypted_pass',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock getTenantPrisma to throw error
      mockTenantService.getTenantPrisma.mockRejectedValue(new Error('Database connection failed'));

      // Should still return the tenant even if seeding fails
      const result = await service.createTenant(createTenantDto);
      
      expect(result.id).toBe('tenant-id');
      // Error should be logged but not thrown
    });
  });
});
