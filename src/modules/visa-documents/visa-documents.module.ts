import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { VisaDocumentsController } from './visa-documents.controller';
import { VisaDocumentsService } from './visa-documents.service';

@Module({
  imports: [PrismaModule],
  controllers: [VisaDocumentsController],
  providers: [VisaDocumentsService],
})
export class VisaDocumentsModule {}
