import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { ReservationExpiryScheduler } from './schedulers/reservation-expiry.scheduler';
import { TenantModule } from '../../common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  providers: [ServicesService, ClassesService, TestsService, ReservationExpiryScheduler],
  controllers: [ServicesController, ClassesController, TestsController],
  exports: [ServicesService, ClassesService, TestsService],
})
export class ServicesModule {}
