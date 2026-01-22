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

  /**
   * Creates a new tenant with full transactional safety
   * All steps are atomic - if any step fails, everything is rolled back
   */
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

    let tenant = null;
    let tenantProvisioningSuccess = false;

    try {
      // Step 1: Create tenant in master database
      tenant = await this.masterPrisma.tenant.create({
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

      this.logger.log(`Step 1/3: Tenant record created - ${tenant.subdomain}`);

      // Step 2: Provision tenant database (create DB + run migrations)
      await this.tenantService.provisionTenant(tenant.id);
      tenantProvisioningSuccess = true;
      this.logger.log(`Step 2/3: Database provisioned - ${tenant.subdomain}`);

      // Step 3: Seed tenant database with SUPER_ADMIN and first user (transactional)
      await this.seedTenantDatabase(tenant.id, tenant.name, createTenantDto);
      this.logger.log(`Step 3/3: Tenant initialized - ${tenant.subdomain}`);

      this.logger.log(`✅ Tenant fully provisioned: ${tenant.subdomain}`);
      return tenant;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Tenant provisioning failed for ${createTenantDto.subdomain}:`, errorMessage);

      // ROLLBACK: Clean up based on how far we got
      if (tenant) {
        try {
          // If database was provisioned, drop it
          if (tenantProvisioningSuccess) {
            this.logger.warn(`Rolling back: Dropping tenant database...`);
            await this.tenantService.dropTenantDatabase(tenant.id);
          }

          // Delete tenant record from master database
          this.logger.warn(`Rolling back: Deleting tenant record...`);
          await this.masterPrisma.tenant.delete({ where: { id: tenant.id } });
          
          this.logger.warn(`✅ Rollback completed - no partial tenant data remains`);
        } catch (rollbackError) {
          const rollbackMsg = rollbackError instanceof Error ? rollbackError.message : 'Unknown error';
          this.logger.error(`❌ CRITICAL: Rollback failed - manual cleanup required:`, rollbackMsg);
          // Log critical details for manual intervention
          this.logger.error(`Tenant ID: ${tenant.id}, Subdomain: ${tenant.subdomain}`);
        }
      }

      throw new Error(`Tenant provisioning failed: ${errorMessage}`);
    }
  }

  /**
   * Seeds the tenant database with SUPER_ADMIN role and first user
   * All operations are within a transaction for atomicity
   */
  private async seedTenantDatabase(tenantId: string, tenantName: string, createTenantDto: CreateTenantDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Use first user details from tenant creation DTO if provided
    const adminEmail = createTenantDto.adminEmail || this.generateAdminEmail(tenantName);
    const adminName = createTenantDto.adminName || `${tenantName} Administrator`;
    const defaultPassword = createTenantDto.adminPassword || process.env.TENANT_DEFAULT_PASSWORD || 'Admin@123456';

    // Hash the password
    const hashedPassword = await this.authService.hashPassword(defaultPassword);

    // Execute everything in a transaction for atomicity
    await tenantPrisma.$transaction(async (tx) => {
      // 1. Create all permissions
      const permissions = await this.createAllPermissions(tx, tenantId);
      this.logger.log(`   Created ${permissions.length} permissions`);

      // 2. Create SUPER_ADMIN role with all permissions
      const superAdminRole = await tx.role.create({
        data: {
          tenantId: tenantId,
          name: 'SUPER_ADMIN',
          description: 'Immutable super administrator with full system access - cannot be deleted or modified',
          isAdmin: true,
        },
      });

      // 3. Assign all permissions to SUPER_ADMIN role
      const rolePermissions = permissions.map((permission) => ({
        tenantId: tenantId,
        roleId: superAdminRole.id,
        permissionId: permission.id,
      }));

      await tx.rolePermission.createMany({
        data: rolePermissions,
      });

      this.logger.log(`   Created SUPER_ADMIN role with ${permissions.length} permissions`);

      // 4. Create first admin user
      await tx.user.create({
        data: {
          tenantId: tenantId,
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          roleId: superAdminRole.id,
          status: 'Active',
        },
      });

      this.logger.log(`   Created first user: ${adminEmail} with SUPER_ADMIN role`);
    });

    // Transaction completed successfully
    this.logger.log(`✅ Tenant database seeded successfully for: ${tenantName}`);
  }

  /**
   * Creates all system permissions based on existing modules
   * Uses module:action naming convention
   */
  private async createAllPermissions(prisma: any, tenantId: string) {
    const permissionsList = [
      // User Management
      { name: 'users:create', module: 'users', action: 'create', description: 'Create users' },
      { name: 'users:read', module: 'users', action: 'read', description: 'View users' },
      { name: 'users:update', module: 'users', action: 'update', description: 'Update users' },
      { name: 'users:delete', module: 'users', action: 'delete', description: 'Delete users' },
      
      // Role Management
      { name: 'roles:create', module: 'roles', action: 'create', description: 'Create roles' },
      { name: 'roles:read', module: 'roles', action: 'read', description: 'View roles' },
      { name: 'roles:update', module: 'roles', action: 'update', description: 'Update roles' },
      { name: 'roles:delete', module: 'roles', action: 'delete', description: 'Delete roles' },
      
      // Lead Management
      { name: 'leads:create', module: 'leads', action: 'create', description: 'Create leads' },
      { name: 'leads:read', module: 'leads', action: 'read', description: 'View leads' },
      { name: 'leads:update', module: 'leads', action: 'update', description: 'Update leads' },
      { name: 'leads:delete', module: 'leads', action: 'delete', description: 'Delete leads' },
      { name: 'leads:export', module: 'leads', action: 'export', description: 'Export leads' },
      { name: 'leads:assign', module: 'leads', action: 'assign', description: 'Assign leads' },
      { name: 'leads:convert', module: 'leads', action: 'convert', description: 'Convert leads to students' },
      
      // Student Management
      { name: 'students:create', module: 'students', action: 'create', description: 'Create students' },
      { name: 'students:read', module: 'students', action: 'read', description: 'View students' },
      { name: 'students:update', module: 'students', action: 'update', description: 'Update students' },
      { name: 'students:delete', module: 'students', action: 'delete', description: 'Delete students' },
      { name: 'students:export', module: 'students', action: 'export', description: 'Export students' },
      
      // University Management
      { name: 'universities:create', module: 'universities', action: 'create', description: 'Create universities' },
      { name: 'universities:read', module: 'universities', action: 'read', description: 'View universities' },
      { name: 'universities:update', module: 'universities', action: 'update', description: 'Update universities' },
      { name: 'universities:delete', module: 'universities', action: 'delete', description: 'Delete universities' },
      { name: 'universities:export', module: 'universities', action: 'export', description: 'Export universities' },
      
      // Task Management
      { name: 'tasks:create', module: 'tasks', action: 'create', description: 'Create tasks' },
      { name: 'tasks:read', module: 'tasks', action: 'read', description: 'View tasks' },
      { name: 'tasks:update', module: 'tasks', action: 'update', description: 'Update tasks' },
      { name: 'tasks:delete', module: 'tasks', action: 'delete', description: 'Delete tasks' },
      { name: 'tasks:assign', module: 'tasks', action: 'assign', description: 'Assign tasks' },
      { name: 'tasks:complete', module: 'tasks', action: 'complete', description: 'Complete tasks' },
      
      // Appointment Management
      { name: 'appointments:create', module: 'appointments', action: 'create', description: 'Create appointments' },
      { name: 'appointments:read', module: 'appointments', action: 'read', description: 'View appointments' },
      { name: 'appointments:update', module: 'appointments', action: 'update', description: 'Update appointments' },
      { name: 'appointments:delete', module: 'appointments', action: 'delete', description: 'Delete appointments' },
      { name: 'appointments:cancel', module: 'appointments', action: 'cancel', description: 'Cancel appointments' },
      
      // File Management
      { name: 'files:create', module: 'files', action: 'create', description: 'Upload files' },
      { name: 'files:read', module: 'files', action: 'read', description: 'View files' },
      { name: 'files:update', module: 'files', action: 'update', description: 'Update files' },
      { name: 'files:delete', module: 'files', action: 'delete', description: 'Delete files' },
      { name: 'files:download', module: 'files', action: 'download', description: 'Download files' },
      
      // Dashboard
      { name: 'dashboard:read', module: 'dashboard', action: 'read', description: 'View dashboard' },
      
      // Workflow Management
      { name: 'workflows:create', module: 'workflows', action: 'create', description: 'Create workflows' },
      { name: 'workflows:read', module: 'workflows', action: 'read', description: 'View workflows' },
      { name: 'workflows:update', module: 'workflows', action: 'update', description: 'Update workflows' },
      { name: 'workflows:delete', module: 'workflows', action: 'delete', description: 'Delete workflows' },
      { name: 'workflows:execute', module: 'workflows', action: 'execute', description: 'Execute workflows' },
      
      // Messaging
      { name: 'messaging:create', module: 'messaging', action: 'create', description: 'Create messages' },
      { name: 'messaging:read', module: 'messaging', action: 'read', description: 'View messages' },
      { name: 'messaging:send', module: 'messaging', action: 'send', description: 'Send messages' },
      { name: 'messaging:delete', module: 'messaging', action: 'delete', description: 'Delete messages' },
      
      // Template Management
      { name: 'templates:create', module: 'templates', action: 'create', description: 'Create templates' },
      { name: 'templates:read', module: 'templates', action: 'read', description: 'View templates' },
      { name: 'templates:update', module: 'templates', action: 'update', description: 'Update templates' },
      { name: 'templates:delete', module: 'templates', action: 'delete', description: 'Delete templates' },
      
      // Service Management
      { name: 'services:create', module: 'services', action: 'create', description: 'Create services' },
      { name: 'services:read', module: 'services', action: 'read', description: 'View services' },
      { name: 'services:update', module: 'services', action: 'update', description: 'Update services' },
      { name: 'services:delete', module: 'services', action: 'delete', description: 'Delete services' },
      { name: 'services:assign', module: 'services', action: 'assign', description: 'Assign services' },
      
      // Visa Type Management
      { name: 'visa-types:create', module: 'visa-types', action: 'create', description: 'Create visa types' },
      { name: 'visa-types:read', module: 'visa-types', action: 'read', description: 'View visa types' },
      { name: 'visa-types:update', module: 'visa-types', action: 'update', description: 'Update visa types' },
      { name: 'visa-types:delete', module: 'visa-types', action: 'delete', description: 'Delete visa types' },
      
      // Country Management
      { name: 'countries:create', module: 'countries', action: 'create', description: 'Create countries' },
      { name: 'countries:read', module: 'countries', action: 'read', description: 'View countries' },
      { name: 'countries:update', module: 'countries', action: 'update', description: 'Update countries' },
      { name: 'countries:delete', module: 'countries', action: 'delete', description: 'Delete countries' },
      
      // Scholarship Management
      { name: 'scholarships:create', module: 'scholarships', action: 'create', description: 'Create scholarships' },
      { name: 'scholarships:read', module: 'scholarships', action: 'read', description: 'View scholarships' },
      { name: 'scholarships:update', module: 'scholarships', action: 'update', description: 'Update scholarships' },
      { name: 'scholarships:delete', module: 'scholarships', action: 'delete', description: 'Delete scholarships' },
      { name: 'scholarships:export', module: 'scholarships', action: 'export', description: 'Export scholarships' },
      
      // Blog Management
      { name: 'blogs:create', module: 'blogs', action: 'create', description: 'Create blogs' },
      { name: 'blogs:read', module: 'blogs', action: 'read', description: 'View blogs' },
      { name: 'blogs:update', module: 'blogs', action: 'update', description: 'Update blogs' },
      { name: 'blogs:delete', module: 'blogs', action: 'delete', description: 'Delete blogs' },
      { name: 'blogs:publish', module: 'blogs', action: 'publish', description: 'Publish blogs' },
      
      // FAQ Management
      { name: 'faqs:create', module: 'faqs', action: 'create', description: 'Create FAQs' },
      { name: 'faqs:read', module: 'faqs', action: 'read', description: 'View FAQs' },
      { name: 'faqs:update', module: 'faqs', action: 'update', description: 'Update FAQs' },
      { name: 'faqs:delete', module: 'faqs', action: 'delete', description: 'Delete FAQs' },
      
      // Landing Page Management
      { name: 'landing-pages:create', module: 'landing-pages', action: 'create', description: 'Create landing pages' },
      { name: 'landing-pages:read', module: 'landing-pages', action: 'read', description: 'View landing pages' },
      { name: 'landing-pages:update', module: 'landing-pages', action: 'update', description: 'Update landing pages' },
      { name: 'landing-pages:delete', module: 'landing-pages', action: 'delete', description: 'Delete landing pages' },
      { name: 'landing-pages:publish', module: 'landing-pages', action: 'publish', description: 'Publish landing pages' },
    ];

    const createdPermissions = [];
    
    for (const perm of permissionsList) {
      const permission = await prisma.permission.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: perm.name,
          },
        },
        update: {},
        create: {
          tenantId,
          name: perm.name,
          module: perm.module,
          action: perm.action,
          description: perm.description,
        },
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
