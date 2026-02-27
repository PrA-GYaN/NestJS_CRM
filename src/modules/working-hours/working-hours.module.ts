import { Module } from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursController } from './working-hours.controller';
import { TenantModule } from '../../common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  providers: [WorkingHoursService],
  controllers: [WorkingHoursController],
  exports: [WorkingHoursService],
})
export class WorkingHoursModule {}
