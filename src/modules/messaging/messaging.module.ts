import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { TenantModule } from '../../common/tenant/tenant.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [TenantModule, TemplatesModule],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
