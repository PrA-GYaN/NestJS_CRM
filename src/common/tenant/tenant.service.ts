import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantPrismaFactory } from '../prisma/tenant-prisma.factory';
import { TenantMigrationService, TenantDatabaseConfig } from './tenant-migration.service';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant-client';
import { PermissionsService } from '../permissions/permissions.service';
import * as crypto from 'crypto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32c';
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-cbc';

  constructor(
    private masterPrisma: MasterPrismaService,
    private tenantPrismaFactory: TenantPrismaFactory,
    private tenantMigration: TenantMigrationService,
    @Inject(forwardRef(() => PermissionsService))
    private permissionsService: PermissionsService,
  ) {}

  /**
   * Get Prisma client for a specific tenant by tenant ID
   */
  async getTenantPrisma(tenantId: string): Promise<TenantPrismaClient> {
    // Fetch tenant config from master database
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (tenant.status !== 'Active') {
      throw new Error(`Tenant is not active: ${tenantId}`);
    }

    // Decrypt the database password
    const decryptedPassword = this.decrypt(tenant.dbPassword);

    // Build database URL
    const databaseUrl = `postgresql://${tenant.dbUser}:${decryptedPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;

    // Get or create tenant Prisma client
    return this.tenantPrismaFactory.getTenantClient(databaseUrl, tenantId);
  }

  /**
   * Close a specific tenant connection
   */
  async closeTenantConnection(tenantId: string): Promise<void> {
    return this.tenantPrismaFactory.closeTenantConnection(tenantId);
  }

  /**
   * Provision a new tenant: create database + run migrations + seed
   */
  async provisionTenant(tenantId: string): Promise<void> {
    this.logger.log(`Starting tenant provisioning for: ${tenantId}`);

    // Fetch tenant config
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const decryptedPassword = this.decrypt(tenant.dbPassword);

    const dbConfig: TenantDatabaseConfig = {
      host: tenant.dbHost,
      port: tenant.dbPort,
      user: tenant.dbUser,
      password: decryptedPassword,
      database: tenant.dbName,
    };

    try {
      // Create database and run migrations
      await this.tenantMigration.provisionTenantDatabase(dbConfig);
// Seed permissions and roles
      this.logger.log(`Seeding permissions for tenant: ${tenantId}`);
      const tenantPrisma = await this.getTenantPrisma(tenantId);
      
      await this.permissionsService.seedPermissions(tenantPrisma, tenantId);
      await this.permissionsService.seedDefaultRoles(tenantPrisma, tenantId);

      
      this.logger.log(`✅ Tenant provisioned successfully: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to provision tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data (passwords, API keys)
   */
  encrypt(text: string): string {
    const key = Buffer.from(this.ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText: string): string {
    const key = Buffer.from(this.ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return this.tenantPrismaFactory.getConnectionStats();
  }
}
