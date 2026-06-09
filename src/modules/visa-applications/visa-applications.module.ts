import { Module } from '@nestjs/common';
import { VisaApplicationsController } from './visa-applications.controller';
import { VisaApplicationsService } from './visa-applications.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisaApplicationsController],
  providers: [VisaApplicationsService],
})
export class VisaApplicationsModule {}
