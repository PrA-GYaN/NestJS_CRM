// ===============================
// UNIVERSITY & COURSE MODULE
// ===============================
import { Module } from '@nestjs/common';
import { UniversitiesService } from './universities.service';
import { UniversitiesController } from './universities.controller';

@Module({
  providers: [UniversitiesService],
  controllers: [UniversitiesController],
})
export class UniversitiesModule {}
