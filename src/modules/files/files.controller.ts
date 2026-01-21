import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Multer } from 'multer';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions, CanRead } from '../../common/decorators/permissions.decorator';

@ApiTags('File Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @RequirePermissions('documents:upload')
  @ApiOperation({ summary: 'Upload file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        category: { type: 'string' },
        studentId: { type: 'string' },
        visaApplicationId: { type: 'string' },
        courseId: { type: 'string' },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file size exceeded' })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ) {
    return this.filesService.uploadFile(tenantId, file, {
      ...uploadDto,
      uploadedBy: user?.id,
    });
  }

  @Get('student/:studentId')
  @CanRead('documents')
  @ApiOperation({ summary: 'Get all files for a student' })
  @ApiResponse({ status: 200, description: 'Returns list of files' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentFiles(@TenantId() tenantId: string, @Param('studentId') studentId: string) {
    return this.filesService.getStudentFiles(tenantId, studentId);
  }

  @Get('download/:fileId')
  @RequirePermissions('documents:download')
  @ApiOperation({ summary: 'Download file' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename, mimeType } = await this.filesService.downloadFile(
      tenantId,
      fileId,
      user?.id,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(buffer);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  deleteFile(@TenantId() tenantId: string, @Param('fileId') fileId: string) {
    return this.filesService.deleteFile(tenantId, fileId);
  }
}
