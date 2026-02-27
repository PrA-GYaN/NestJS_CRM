import { Module } from '@nestjs/common';
import { TenantModule } from '../../common/tenant/tenant.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { StudentPanelController } from './student-panel.controller';
import { StudentPanelService } from './student-panel.service';

@Module({
  imports: [TenantModule, AppointmentsModule],
  controllers: [StudentPanelController],
  providers: [StudentPanelService],
  exports: [StudentPanelService],
})
export class StudentPanelModule {}
