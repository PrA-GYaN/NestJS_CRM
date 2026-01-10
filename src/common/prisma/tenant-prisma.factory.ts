import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant-client';

interface TenantConnection {
  prisma: TenantPrismaClient;
  lastAccessed: Date;
}

@Injectable()
export class TenantPrismaFactory {
  private readonly logger = new Logger(TenantPrismaFactory.name);
  private tenantConnections: Map<string, TenantConnection> = new Map();
  private readonly CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Cleanup stale connections every 10 minutes
    setInterval(() => this.cleanupStaleConnections(), 10 * 60 * 1000);
  }

  /**
   * Get or create a Prisma client for a specific tenant database
   */
  async getTenantClient(databaseUrl: string, tenantId: string): Promise<TenantPrismaClient> {
    // Check if connection exists and is recent
    const existing = this.tenantConnections.get(tenantId);
    if (existing) {
      existing.lastAccessed = new Date();
      return existing.prisma;
    }

    // Create new connection
    this.logger.log(`Creating new connection for tenant: ${tenantId}`);
    
    const prisma = new TenantPrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: ['error', 'warn'],
    });

    try {
      // Test connection
      await prisma.$connect();
      
      // Cache the connection
      this.tenantConnections.set(tenantId, {
        prisma,
        lastAccessed: new Date(),
      });

      this.logger.log(`✅ Connected to tenant database: ${tenantId}`);
      return prisma;
    } catch (error) {
      this.logger.error(`❌ Failed to connect to tenant database ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Close a specific tenant connection
   */
  async closeTenantConnection(tenantId: string): Promise<void> {
    const connection = this.tenantConnections.get(tenantId);
    if (connection) {
      await connection.prisma.$disconnect();
      this.tenantConnections.delete(tenantId);
      this.logger.log(`Closed connection for tenant: ${tenantId}`);
    }
  }

  /**
   * Close all tenant connections
   */
  async closeAllConnections(): Promise<void> {
    this.logger.log(`Closing ${this.tenantConnections.size} tenant connections...`);
    
    const promises = Array.from(this.tenantConnections.entries()).map(
      async ([tenantId, connection]) => {
        try {
          await connection.prisma.$disconnect();
          this.logger.log(`Closed connection for tenant: ${tenantId}`);
        } catch (error) {
          this.logger.error(`Error closing connection for tenant ${tenantId}:`, error);
        }
      }
    );

    await Promise.all(promises);
    this.tenantConnections.clear();
    this.logger.log('All tenant connections closed');
  }

  /**
   * Cleanup stale connections that haven't been accessed recently
   */
  private async cleanupStaleConnections(): Promise<void> {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [tenantId, connection] of this.tenantConnections.entries()) {
      const timeSinceLastAccess = now.getTime() - connection.lastAccessed.getTime();
      
      if (timeSinceLastAccess > this.CONNECTION_TIMEOUT) {
        staleConnections.push(tenantId);
      }
    }

    if (staleConnections.length > 0) {
      this.logger.log(`Cleaning up ${staleConnections.length} stale connections`);
      
      for (const tenantId of staleConnections) {
        await this.closeTenantConnection(tenantId);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): { total: number; tenants: string[] } {
    return {
      total: this.tenantConnections.size,
      tenants: Array.from(this.tenantConnections.keys()),
    };
  }
}
