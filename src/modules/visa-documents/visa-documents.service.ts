import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVisaDocumentDto, UpdateVisaDocumentDto, VisaDocumentsQueryDto } from './dto';

@Injectable()
export class VisaDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVisaApplicationOrThrow(tenantId: string, visaApplicationId: string) {
    const visaApplication = await this.prisma.visaApplication.findFirst({
      where: { id: visaApplicationId, tenantId },
      select: { id: true, studentId: true },
    });

    if (!visaApplication) {
      throw new NotFoundException('Visa application not found');
    }

    return visaApplication;
  }

  private async resolveStudentDocumentForVisa(
    tenantId: string,
    studentDocumentId: string,
    visaApplication: { id: string; studentId: string },
  ) {
    const studentDocument = await this.prisma.studentDocument.findFirst({
      where: { id: studentDocumentId, tenantId },
      select: {
        id: true,
        studentId: true,
        documentType: true,
        filePath: true,
      },
    });

    if (!studentDocument) {
      throw new NotFoundException('Student document not found');
    }

    if (studentDocument.studentId !== visaApplication.studentId) {
      throw new BadRequestException('Student document does not belong to the same student as the visa application');
    }

    return studentDocument;
  }

  async create(tenantId: string, dto: CreateVisaDocumentDto) {
    const hasDirectFields = !!dto.documentType || !!dto.filePath;

    if (dto.studentDocumentId && hasDirectFields) {
      throw new BadRequestException('Provide either studentDocumentId OR documentType/filePath, not both');
    }

    const visaApplication = await this.getVisaApplicationOrThrow(tenantId, dto.visaApplicationId);

    if (dto.studentDocumentId) {
      const sourceDocument = await this.resolveStudentDocumentForVisa(
        tenantId,
        dto.studentDocumentId,
        visaApplication,
      );

      return this.prisma.visaDocument.create({
        data: {
          tenantId,
          visaApplicationId: dto.visaApplicationId,
          documentType: sourceDocument.documentType,
          filePath: sourceDocument.filePath,
        },
      });
    }

    if (!dto.documentType || !dto.filePath) {
      throw new BadRequestException('documentType and filePath are required when studentDocumentId is not provided');
    }

    return this.prisma.visaDocument.create({
      data: {
        tenantId,
        visaApplicationId: dto.visaApplicationId,
        documentType: dto.documentType,
        filePath: dto.filePath,
      },
    });
  }

  async findAll(tenantId: string, query: VisaDocumentsQueryDto) {
    return this.prisma.visaDocument.findMany({
      where: {
        tenantId,
        ...(query.visaApplicationId && { visaApplicationId: query.visaApplicationId }),
        ...(query.studentId && { visaApplication: { studentId: query.studentId } }),
      },
      include: {
        visaApplication: {
          select: {
            id: true,
            studentId: true,
            visaTypeId: true,
            status: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const visaDocument = await this.prisma.visaDocument.findFirst({
      where: { id, tenantId },
      include: {
        visaApplication: {
          select: {
            id: true,
            studentId: true,
            visaTypeId: true,
            status: true,
          },
        },
      },
    });

    if (!visaDocument) {
      throw new NotFoundException('Visa document not found');
    }

    return visaDocument;
  }

  async update(tenantId: string, id: string, dto: UpdateVisaDocumentDto) {
    const existing = await this.prisma.visaDocument.findFirst({
      where: { id, tenantId },
      include: {
        visaApplication: {
          select: { id: true, studentId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Visa document not found');
    }

    if (dto.studentDocumentId && (dto.documentType || dto.filePath)) {
      throw new BadRequestException('When studentDocumentId is provided, do not provide documentType/filePath');
    }

    const targetVisaApplicationId = dto.visaApplicationId || existing.visaApplicationId;
    const targetVisaApplication =
      targetVisaApplicationId === existing.visaApplicationId
        ? existing.visaApplication
        : await this.getVisaApplicationOrThrow(tenantId, targetVisaApplicationId);

    const data: any = {};

    if (dto.visaApplicationId) {
      data.visaApplicationId = dto.visaApplicationId;
    }

    if (dto.studentDocumentId) {
      const sourceDocument = await this.resolveStudentDocumentForVisa(
        tenantId,
        dto.studentDocumentId,
        targetVisaApplication,
      );

      data.documentType = sourceDocument.documentType;
      data.filePath = sourceDocument.filePath;
    } else {
      if (dto.documentType) {
        data.documentType = dto.documentType;
      }
      if (dto.filePath) {
        data.filePath = dto.filePath;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    return this.prisma.visaDocument.update({
      where: { id },
      data,
      include: {
        visaApplication: {
          select: {
            id: true,
            studentId: true,
            visaTypeId: true,
            status: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.visaDocument.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Visa document not found');
    }

    await this.prisma.visaDocument.delete({ where: { id } });

    return {
      success: true,
      message: 'Visa document deleted successfully',
    };
  }
}
