import { Module, Global } from '@nestjs/common';
import { TenantPrismaFactory } from './tenant-prisma.factory';

@Global()
@Module({
  providers: [TenantPrismaFactory],
  exports: [TenantPrismaFactory],
})
export class TenantPrismaModule {}
