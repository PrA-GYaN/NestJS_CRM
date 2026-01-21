import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { MasterPrismaService } from '../../common/prisma/master-prisma.service';
import { TenantService } from '../../common/tenant/tenant.service';
import { AuthService } from '../auth/auth.service';
import { CreateTenantDto, UpdateTenantDto, CreatePlatformAdminDto } from './dto/platform.dto';
import { PaginationDto } from '../../common/dto/common.dto';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant-client';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private masterPrisma: MasterPrismaService,
    private tenantService: TenantService,
    private authService: AuthService,
  ) {}

  async createTenant(createTenantDto: CreateTenantDto) {
    // Check if subdomain already exists
    const existingTenant = await this.masterPrisma.tenant.findUnique({
      where: { subdomain: createTenantDto.subdomain },
    });

    if (existingTenant) {
      throw new ConflictException('Subdomain already exists');
    }

    // Encrypt database password
    const encryptedPassword = this.tenantService.encrypt(createTenantDto.dbPassword);

    // Create tenant in master database
    const tenant = await this.masterPrisma.tenant.create({
      data: {
        name: createTenantDto.name,
        subdomain: createTenantDto.subdomain,
        dbHost: createTenantDto.dbHost,
        dbPort: createTenantDto.dbPort || 5432,
        dbName: createTenantDto.dbName,
        dbUser: createTenantDto.dbUser,
        dbPassword: encryptedPassword,
        featurePackage: createTenantDto.featurePackage || 'Basic',
        status: 'Active',
      },
    });

    // Provision tenant database (create DB + run migrations)
    try {
      await this.tenantService.provisionTenant(tenant.id);
      
      // Seed tenant database with default admin
      await this.seedTenantDatabase(tenant.id, tenant.name);
      
      this.logger.log(`✅ Tenant created and provisioned: ${tenant.subdomain}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to provision tenant ${tenant.subdomain}:`, errorMessage);
      
      // Optionally: Rollback tenant creation
      // await this.masterPrisma.tenant.delete({ where: { id: tenant.id } });
      
      throw new Error(`Tenant provisioning failed: ${errorMessage}`);
    }

    return tenant;
  }

  /**
   * Seeds the tenant database with default admin user and permissions
   */
  private async seedTenantDatabase(tenantId: string, tenantName: string) {
    // Get tenant database connection
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Generate admin email from tenant name
    const adminEmail = this.generateAdminEmail(tenantName);
    const defaultPassword = process.env.TENANT_DEFAULT_PASSWORD || 'Admin@123456';

    // Hash the password
    const hashedPassword = await this.authService.hashPassword(defaultPassword);

    // Start transaction to ensure atomicity
    await tenantPrisma.$transaction(async (tx) => {
      // 1. Create all permissions
      const permissions = await this.createAllPermissions(tx);

      // 2. Create Admin role
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenantId,
          name: 'Admin',
          description: 'Full access administrator role',
        },
      });

      // 3. Assign all permissions to Admin role
      const rolePermissions = permissions.map((permission) => ({
        tenantId: tenantId,
        roleId: adminRole.id,
        permissionId: permission.id,
      }));

      await tx.rolePermission.createMany({
        data: rolePermissions,
      });

      // 4. Create default admin user
      await tx.user.create({
        data: {
          tenantId: tenantId,
          name: `${tenantName} Administrator`,
          email: adminEmail,
          password: hashedPassword,
          roleId: adminRole.id,
          status: 'Active',
        },
      });

      this.logger.log(`✅ Created default admin user: ${adminEmail} for tenant: ${tenantName}`);
    });
  }

  /**
   * Creates all system permissions
   */
  private async createAllPermissions(prisma: any) {
    const permissionsList = [
      // User Management
      { name: 'users.view', description: 'View users' },
      { name: 'users.create', description: 'Create users' },
      { name: 'users.update', description: 'Update users' },
      { name: 'users.delete', description: 'Delete users' },
      
      // Role Management
      { name: 'roles.view', description: 'View roles' },
      { name: 'roles.create', description: 'Create roles' },
      { name: 'roles.update', description: 'Update roles' },
      { name: 'roles.delete', description: 'Delete roles' },
      
      // Lead Management
      { name: 'leads.view', description: 'View leads' },
      { name: 'leads.create', description: 'Create leads' },
      { name: 'leads.update', description: 'Update leads' },
      { name: 'leads.delete', description: 'Delete leads' },
      { name: 'leads.convert', description: 'Convert leads to students' },
      
      // Student Management
      { name: 'students.view', description: 'View students' },
      { name: 'students.create', description: 'Create students' },
      { name: 'students.update', description: 'Update students' },
      { name: 'students.delete', description: 'Delete students' },
      
      // University Management
      { name: 'universities.view', description: 'View universities' },
      { name: 'universities.create', description: 'Create universities' },
      { name: 'universities.update', description: 'Update universities' },
      { name: 'universities.delete', description: 'Delete universities' },
      
      // Course Management
      { name: 'courses.view', description: 'View courses' },
      { name: 'courses.create', description: 'Create courses' },
      { name: 'courses.update', description: 'Update courses' },
      { name: 'courses.delete', description: 'Delete courses' },
      
      // Appointment Management
      { name: 'appointments.view', description: 'View appointments' },
      { name: 'appointments.create', description: 'Create appointments' },
      { name: 'appointments.update', description: 'Update appointments' },
      { name: 'appointments.delete', description: 'Delete appointments' },
      
      // Task Management
      { name: 'tasks.view', description: 'View tasks' },
      { name: 'tasks.create', description: 'Create tasks' },
      { name: 'tasks.update', description: 'Update tasks' },
      { name: 'tasks.delete', description: 'Delete tasks' },
      
      // Application Management
      { name: 'applications.view', description: 'View applications' },
      { name: 'applications.create', description: 'Create applications' },
      { name: 'applications.update', description: 'Update applications' },
      { name: 'applications.delete', description: 'Delete applications' },
      
      // Visa Management
      { name: 'visas.view', description: 'View visa applications' },
      { name: 'visas.create', description: 'Create visa applications' },
      { name: 'visas.update', description: 'Update visa applications' },
      { name: 'visas.delete', description: 'Delete visa applications' },
      
      // Payment Management
      { name: 'payments.view', description: 'View payments' },
      { name: 'payments.create', description: 'Create payments' },
      { name: 'payments.update', description: 'Update payments' },
      { name: 'payments.delete', description: 'Delete payments' },
      
      // Report Access
      { name: 'reports.view', description: 'View reports and analytics' },
      { name: 'reports.export', description: 'Export reports' },
      
      // Settings
      { name: 'settings.view', description: 'View settings' },
      { name: 'settings.update', description: 'Update settings' },
    ];

    const createdPermissions = [];
    
    for (const perm of permissionsList) {
      const permission = await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
      createdPermissions.push(permission);
    }

    return createdPermissions;
  }

  /**
   * Generates admin email from tenant name
   */
  private generateAdminEmail(tenantName: string): string {
    const emailPrefix = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    return `${emailPrefix}@example.com`;
  }

  async getAllTenants(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as any } },
            { subdomain: { contains: search, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const [tenants, total] = await Promise.all([
      this.masterPrisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.masterPrisma.tenant.count({ where }),
    ]);

    return {
      data: tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTenantById(id: string) {
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateTenant(id: string, updateTenantDto: UpdateTenantDto) {
    await this.getTenantById(id);

    const updateData: any = { ...updateTenantDto };

    // Encrypt password if provided
    if (updateTenantDto.dbPassword) {
      updateData.dbPassword = this.tenantService.encrypt(updateTenantDto.dbPassword);
    }

    return this.masterPrisma.tenant.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteTenant(id: string) {
    await this.getTenantById(id);

    // Close any open connections
    await this.tenantService.closeTenantConnection(id);

    // Delete tenant from master database
    await this.masterPrisma.tenant.delete({
      where: { id },
    });

    // Note: Tenant database is NOT automatically dropped
    // This is a safety measure - manual intervention required

    return { success: true, message: 'Tenant deleted from master database' };
  }

  async createPlatformAdmin(createAdminDto: CreatePlatformAdminDto) {
    const existingAdmin = await this.masterPrisma.platformAdmin.findUnique({
      where: { email: createAdminDto.email },
    });

    if (existingAdmin) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await this.authService.hashPassword(createAdminDto.password);

    return this.masterPrisma.platformAdmin.create({
      data: {
        ...createAdminDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
