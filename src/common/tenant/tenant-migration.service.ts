import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface TenantDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  /**
   * Create a new PostgreSQL database for the tenant
   */
  async createTenantDatabase(config: TenantDatabaseConfig): Promise<void> {
    const { host, port, user, password, database } = config;

    try {
      this.logger.log(`Creating database: ${database}`);

      // PostgreSQL connection string for admin database (postgres)
      const adminDbUrl = `postgresql://${user}:${password}@${host}:${port}/postgres`;

      // Check if database exists
      const checkCmd = `psql "${adminDbUrl}" -tAc "SELECT 1 FROM pg_database WHERE datname='${database}'"`;
      
      try {
        const { stdout } = await execAsync(checkCmd);
        
        if (stdout.trim() === '1') {
          this.logger.log(`Database ${database} already exists`);
          return;
        }
      } catch (error) {
        // Database doesn't exist, continue with creation
      }

      // Create database
      const createCmd = `psql "${adminDbUrl}" -c "CREATE DATABASE ${database}"`;
      await execAsync(createCmd);

      this.logger.log(`✅ Database created: ${database}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to create database ${database}:`, errorMessage);
      throw new Error(`Database creation failed: ${errorMessage}`);
    }
  }

  /**
   * Run Prisma migrations on the tenant database
   */
  async runTenantMigrations(config: TenantDatabaseConfig): Promise<void> {
    const { host, port, user, password, database } = config;

    try {
      this.logger.log(`Running migrations for database: ${database}`);

      // Build the tenant database URL
      const tenantDatabaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;

      // Get the absolute path to the tenant schema
      const schemaPath = path.join(process.cwd(), 'prisma', 'tenant', 'schema.prisma');

      // Run Prisma migrate deploy (production-safe)
      const migrateCmd = `npx prisma migrate deploy --schema="${schemaPath}"`;

      const { stdout, stderr } = await execAsync(migrateCmd, {
        env: {
          ...process.env,
          TENANT_DATABASE_URL: tenantDatabaseUrl,
        },
      });

      if (stdout) this.logger.log(stdout);
      if (stderr) this.logger.warn(stderr);

      this.logger.log(`✅ Migrations completed for: ${database}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Migration failed for ${database}:`, errorMessage);
      throw new Error(`Migration failed: ${errorMessage}`);
    }
  }

  /**
   * Complete tenant provisioning: create database + run migrations
   */
  async provisionTenantDatabase(config: TenantDatabaseConfig): Promise<void> {
    this.logger.log(`🚀 Starting tenant database provisioning: ${config.database}`);

    try {
      // Step 1: Create database
      await this.createTenantDatabase(config);

      // Step 2: Run migrations
      await this.runTenantMigrations(config);

      this.logger.log(`🎉 Tenant database provisioned successfully: ${config.database}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Tenant provisioning failed for ${config.database}:`, errorMessage);
      throw error;
    }
  }

  /**
   * Drop a tenant database (use with caution!)
   */
  async dropTenantDatabase(config: TenantDatabaseConfig): Promise<void> {
    const { host, port, user, password, database } = config;

    try {
      this.logger.warn(`⚠️  Dropping database: ${database}`);

      const adminDbUrl = `postgresql://${user}:${password}@${host}:${port}/postgres`;

      // Terminate existing connections
      const terminateCmd = `psql "${adminDbUrl}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${database}' AND pid <> pg_backend_pid()"`;
      await execAsync(terminateCmd);

      // Drop database
      const dropCmd = `psql "${adminDbUrl}" -c "DROP DATABASE IF EXISTS ${database}"`;
      await execAsync(dropCmd);

      this.logger.log(`✅ Database dropped: ${database}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to drop database ${database}:`, errorMessage);
      throw error;
    }
  }

  /**
   * Check if migrations are needed
   */
  async checkMigrationStatus(config: TenantDatabaseConfig): Promise<{ pending: boolean; migrations: string[] }> {
    const { host, port, user, password, database } = config;

    try {
      const tenantDatabaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
      const schemaPath = path.join(process.cwd(), 'prisma', 'tenant', 'schema.prisma');

      const statusCmd = `npx prisma migrate status --schema="${schemaPath}"`;

      const { stdout } = await execAsync(statusCmd, {
        env: {
          ...process.env,
          TENANT_DATABASE_URL: tenantDatabaseUrl,
        },
      });

      // Parse output to determine if migrations are pending
      const pending = stdout.includes('following migration have not yet been applied') || 
                     stdout.includes('Database schema is not up to date');

      return {
        pending,
        migrations: pending ? [stdout] : [],
      };
    } catch (error) {
      this.logger.error(`Error checking migration status for ${database}:`, error);
      return { pending: true, migrations: [] };
    }
  }
}
