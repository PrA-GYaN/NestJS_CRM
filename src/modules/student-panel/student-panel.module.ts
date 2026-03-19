import { Module } from '@nestjs/common';
import { TenantModule } from '../../common/tenant/tenant.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { WorkingHoursModule } from '../working-hours/working-hours.module';
import { ServicesModule } from '../services/services.module';
import { FilesModule } from '../files/files.module';
import { StudentPanelController } from './student-panel.controller';
import { StudentPanelService } from './student-panel.service';

@Module({
  imports: [TenantModule, AppointmentsModule, WorkingHoursModule, ServicesModule, FilesModule],
  controllers: [StudentPanelController],
  providers: [StudentPanelService],
  exports: [StudentPanelService],
})
export class StudentPanelModule {}
