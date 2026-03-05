import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';

@Module({
  providers: [ServicesService, ClassesService, TestsService],
  controllers: [ServicesController, ClassesController, TestsController],
  exports: [ServicesService, ClassesService, TestsService],
})
export class ServicesModule {}
