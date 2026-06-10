import { Module, Global } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { ScopeService } from './scope.service';

@Global()
@Module({
  providers: [PermissionsService, ScopeService],
  exports: [PermissionsService, ScopeService],
})
export class PermissionsModule {}
