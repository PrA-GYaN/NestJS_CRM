import { Module, Global } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantMigrationService } from './tenant-migration.service';
import { MasterPrismaModule } from '../prisma/master-prisma.module';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';

@Global()
@Module({
  imports: [MasterPrismaModule, TenantPrismaModule],
  providers: [TenantService, TenantMigrationService],
  exports: [TenantService, TenantMigrationService],
})
export class TenantModule {}
