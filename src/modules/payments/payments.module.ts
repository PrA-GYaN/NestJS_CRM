import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TenantModule } from '../../common/tenant/tenant.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [TenantModule, ActivityLogsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
