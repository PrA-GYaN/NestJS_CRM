import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Multer } from 'multer';

@Injectable()
export class FilesService {
  private readonly rootPath: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    private tenantService: TenantService,
    private configService: ConfigService,
  ) {
    this.rootPath = this.configService.get('FILE_STORAGE_ROOT_PATH') || './uploads';
    this.maxFileSize = this.configService.get('MAX_FILE_SIZE') || 10 * 1024 * 1024; // 10MB default
    this.allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
  }

  /**
   * Upload a file with tenant and entity isolation
   */
  async uploadFile(
    tenantId: string,
    file: Express.Multer.File,
    uploadDto: {
      category: string;
      studentId?: string;
      visaApplicationId?: string;
      courseId?: string;
      uploadedBy?: string;
      metadata?: any;
    },
  ) {
    // Validate file
    this.validateFile(file);

    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify related entities exist if provided
    if (uploadDto.studentId) {
      const student = await tenantPrisma.student.findFirst({
        where: { id: uploadDto.studentId, tenantId },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }
    }

    if (uploadDto.visaApplicationId) {
      const visa = await tenantPrisma.visaApplication.findFirst({
        where: { id: uploadDto.visaApplicationId, tenantId },
      });
      if (!visa) {
        throw new NotFoundException('Visa application not found');
      }
    }

    if (uploadDto.courseId) {
      const course = await tenantPrisma.course.findFirst({
        where: { id: uploadDto.courseId, tenantId },
      });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
    }

    // Generate secure filename
    const fileExt = path.extname(file.originalname);
    const fileHash = crypto.randomBytes(16).toString('hex');
    const storedFileName = `${fileHash}${fileExt}`;

    // Build folder path
    const folderPath = this.buildFolderPath(tenantId, uploadDto);
    const fullPath = path.join(this.rootPath, folderPath);

    // Create directory if it doesn't exist
    await fs.mkdir(fullPath, { recursive: true });

    // Save file
    const filePath = path.join(fullPath, storedFileName);
    await fs.writeFile(filePath, file.buffer);

    // Store metadata in database
    const fileRecord = await tenantPrisma.fileUpload.create({
      data: {
        tenantId,
        studentId: uploadDto.studentId,
        visaApplicationId: uploadDto.visaApplicationId,
        courseId: uploadDto.courseId,
        category: uploadDto.category as any,
        originalFileName: file.originalname,
        storedFileName,
        filePath: path.join(folderPath, storedFileName),
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: uploadDto.uploadedBy,
        metadata: uploadDto.metadata,
      },
    });

    return fileRecord;
  }

  /**
   * Download file with authorization check
   */
  async downloadFile(tenantId: string, fileId: string, userId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const fileRecord = await tenantPrisma.fileUpload.findFirst({
      where: { id: fileId, tenantId },
    });

    if (!fileRecord) {
      throw new NotFoundException('File not found');
    }

    // TODO: Add authorization logic here
    // Check if user has permission to access this file

    const fullPath = path.join(this.rootPath, fileRecord.filePath);

    try {
      const fileBuffer = await fs.readFile(fullPath);
      return {
        buffer: fileBuffer,
        filename: fileRecord.originalFileName,
        mimeType: fileRecord.mimeType,
      };
    } catch (error) {
      throw new NotFoundException('File not found on disk');
    }
  }

  /**
   * Get files for a student
   */
  async getStudentFiles(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify student exists
    const student = await tenantPrisma.student.findFirst({
      where: { id: studentId, tenantId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return tenantPrisma.fileUpload.findMany({
      where: {
        tenantId,
        studentId,
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Delete file
   */
  async deleteFile(tenantId: string, fileId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const fileRecord = await tenantPrisma.fileUpload.findFirst({
      where: { id: fileId, tenantId },
    });

    if (!fileRecord) {
      throw new NotFoundException('File not found');
    }

    // Delete from disk
    const fullPath = path.join(this.rootPath, fileRecord.filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // File might not exist on disk, continue with DB deletion
    }

    // Delete from database
    await tenantPrisma.fileUpload.delete({
      where: { id: fileId },
    });

    return { success: true, message: 'File deleted successfully' };
  }

  /**
   * Build tenant-scoped folder path
   */
  private buildFolderPath(tenantId: string, uploadDto: any): string {
    let folderPath = `tenant_${tenantId}`;

    if (uploadDto.studentId) {
      folderPath = path.join(folderPath, `student_${uploadDto.studentId}`);

      if (uploadDto.visaApplicationId) {
        folderPath = path.join(folderPath, 'visa', `visaType_${uploadDto.visaApplicationId}`);
      } else if (uploadDto.courseId) {
        folderPath = path.join(folderPath, 'course', `course_${uploadDto.courseId}`);
      } else {
        folderPath = path.join(folderPath, 'documents');
      }
    }

    // Prevent directory traversal
    const normalized = path.normalize(folderPath);
    if (normalized.includes('..')) {
      throw new BadRequestException('Invalid folder path');
    }

    return normalized;
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }
}
