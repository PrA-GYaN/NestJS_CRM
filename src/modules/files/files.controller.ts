import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Res,
  StreamableFile,
  BadRequestException,
  ForbiddenException,
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
import { PaginationDto } from '../../common/dto/common.dto';

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
      required: ['file', 'category', 'studentId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload (required)',
        },
        category: {
          type: 'string',
          enum: [
            'Passport', 'Transcript', 'VisaForm', 'Photo', 'Certificate',
            'OfferLetter', 'AcademicDocument', 'FinancialDocument',
            'LanguageTestResult', 'RecommendationLetter', 'Other',
          ],
          description: 'File category (required)',
        },
        studentId: {
          type: 'string',
          format: 'uuid',
          description: 'Student ID — required. Associates the file with a specific student.',
        },
        visaApplicationId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
          description: '(Optional) Associate file with a visa application. Leave empty for general or course-specific uploads.',
        },
        courseId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
          description: '(Optional) Associate file with a course. Leave empty for general or visa-specific uploads.',
        },
        metadata: {
          type: 'object',
          nullable: true,
          description: '(Optional) Arbitrary JSON metadata for the file',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file, missing required field, or file size exceeded' })
  @ApiResponse({ status: 403, description: 'Students may only upload documents for their own studentId' })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ) {
    // Students may only upload documents tied to their own studentId
    if (user?.isStudent) {
      if (!uploadDto.studentId) {
        throw new BadRequestException('studentId is required');
      }
      if (uploadDto.studentId !== (user.studentId || user.id)) {
        throw new ForbiddenException('Students can only upload documents for their own student record');
      }
    }

    return this.filesService.uploadFile(tenantId, file, {
      ...uploadDto,
      uploadedBy: user?.id,
    });
  }

  @Get('student/:studentId')
  @CanRead('documents')
  @ApiOperation({ summary: 'Get all files for a student' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of files' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentFiles(
    @TenantId() tenantId: string,
    @Param('studentId') studentId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.filesService.getStudentFiles(tenantId, studentId, paginationDto);
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
