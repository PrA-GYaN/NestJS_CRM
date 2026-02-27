import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/master-client';

@Injectable()
export class MasterPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MasterPrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.MASTER_DATABASE_URL,
        },
      },
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to Master Database');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Master Database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from Master Database');
  }

  /**
   * Clean disconnect for graceful shutdown
   */
  async enableShutdownHooks(app: any) {
    this.$on('beforeExit' as never, async () => {
      await app.close();
    });
  }
}
