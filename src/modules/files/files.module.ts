import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { TenantModule } from '../../common/tenant/tenant.module';

@Module({
  imports: [
    TenantModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        limits: {
          fileSize: configService.get('MAX_FILE_SIZE') || 10 * 1024 * 1024,
        },
      }),
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
