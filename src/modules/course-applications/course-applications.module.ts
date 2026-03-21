import { Module } from '@nestjs/common';
import { CourseApplicationsController } from './course-applications.controller';
import { CourseApplicationsService } from './course-applications.service';
import { CourseApplicationsRepository } from './course-applications.repository';

@Module({
  controllers: [CourseApplicationsController],
  providers: [CourseApplicationsService, CourseApplicationsRepository],
  exports: [CourseApplicationsService],
})
export class CourseApplicationsModule {}
