import { Module } from '@nestjs/common';
import { VisaTypesController } from './visa-types.controller';
import { VisaTypesService } from './visa-types.service';
import { TenantModule } from '../../common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [VisaTypesController],
  providers: [VisaTypesService],
  exports: [VisaTypesService],
})
export class VisaTypesModule {}
