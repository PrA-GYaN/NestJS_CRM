import { Module } from '@nestjs/common';
import { EmailTemplatesController, SmsTemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { TenantModule } from '../../common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [EmailTemplatesController, SmsTemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
