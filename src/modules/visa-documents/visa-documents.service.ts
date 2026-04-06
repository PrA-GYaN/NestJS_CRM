import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentType } from '@prisma/tenant-client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVisaDocumentDto, UpdateVisaDocumentDto, VisaDocumentsQueryDto } from './dto';

@Injectable()
export class VisaDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVisaApplicationOrThrow(tenantId: string, visaApplicationId: string) {
    const visaApplication = await this.prisma.visaApplication.findFirst({
      where: { id: visaApplicationId, tenantId },
      select: { id: true, studentId: true, workflowId: true },
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

  /**
   * Validate documents for a specific workflow
   * Checks if all required documents for the current workflow step are present
   */
  private async validateWorkflowDocuments(
    tenantId: string,
    visaApplicationId: string,
    workflowId: string,
    currentFieldDocumentType?: DocumentType,
  ) {
    const workflowSteps = await this.prisma.visaWorkflowStep.findMany({
      where: { workflowId, isActive: true, requiresDocument: true },
      orderBy: { stepOrder: 'asc' },
    });

    if (workflowSteps.length === 0) {
      return true; // No document requirements
    }

    const existingDocs = await this.prisma.visaDocument.findMany({
      where: {
        tenantId,
        visaApplicationId,
        workflowId,
      },
      select: { documentType: true },
    });

    const existingDocTypes = new Set<DocumentType | null>(existingDocs.map(d => d.documentType).filter(Boolean));
    
    if (currentFieldDocumentType) {
      existingDocTypes.add(currentFieldDocumentType);
    }

    return existingDocTypes.size > 0;
  }

  async create(tenantId: string, dto: CreateVisaDocumentDto) {
    const hasDirectFields = !!dto.documentType || !!dto.filePath;

    if (dto.studentDocumentId && hasDirectFields) {
      throw new BadRequestException('Provide either studentDocumentId OR documentType/filePath, not both');
    }

    const visaApplication = await this.getVisaApplicationOrThrow(tenantId, dto.visaApplicationId);

    let documentType: DocumentType | undefined;
    let filePath: string | undefined;
    let studentDocumentRef: string | undefined;

    if (dto.studentDocumentId) {
      const sourceDocument = await this.resolveStudentDocumentForVisa(
        tenantId,
        dto.studentDocumentId,
        visaApplication,
      );

      documentType = sourceDocument.documentType as DocumentType;
      filePath = sourceDocument.filePath;
      studentDocumentRef = sourceDocument.id;
    } else {
      if (!dto.documentType || !dto.filePath) {
        throw new BadRequestException('documentType and filePath are required when studentDocumentId is not provided');
      }
      documentType = dto.documentType as DocumentType;
      filePath = dto.filePath;
    }

    // Validate workflow-specific documents if workflowId is provided
    if (dto.workflowId) {
      await this.validateWorkflowDocuments(tenantId, dto.visaApplicationId, dto.workflowId, documentType);
    }

    return this.prisma.visaDocument.create({
      data: {
        tenantId,
        visaApplicationId: dto.visaApplicationId,
        studentDocumentId: studentDocumentRef,
        documentType,
        filePath,
        workflowId: dto.workflowId,
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
        studentDocument: true,
      },
    });
  }

  async findAll(tenantId: string, query: VisaDocumentsQueryDto) {
    return this.prisma.visaDocument.findMany({
      where: {
        tenantId,
        ...(query.visaApplicationId && { visaApplicationId: query.visaApplicationId }),
        ...(query.workflowId && { workflowId: query.workflowId }),
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
        studentDocument: true,
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
        studentDocument: true,
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
          select: { id: true, studentId: true, workflowId: true },
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
      data.studentDocumentId = sourceDocument.id;
    } else {
      if (dto.documentType) {
        data.documentType = dto.documentType;
      }
      if (dto.filePath) {
        data.filePath = dto.filePath;
      }
      if (dto.documentType || dto.filePath) {
        data.studentDocumentId = null;
      }
    }

    if (dto.workflowId !== undefined) {
      data.workflowId = dto.workflowId;
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
        studentDocument: true,
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

  /**
   * Get documents for a specific visa application and workflow
   * Used for workflow-specific validation
   */
  async getWorkflowDocuments(
    tenantId: string,
    visaApplicationId: string,
    workflowId: string,
  ) {
    return this.prisma.visaDocument.findMany({
      where: {
        tenantId,
        visaApplicationId,
        workflowId,
      },
      select: {
        id: true,
        documentType: true,
        filePath: true,
        studentDocumentId: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Check if a visa application has all required documents for a workflow step
   */
  async checkWorkflowStepDocumentRequirements(
    tenantId: string,
    visaApplicationId: string,
    workflowId: string,
    stepOrder: number,
  ) {
    const step = await this.prisma.visaWorkflowStep.findFirst({
      where: { workflowId, stepOrder, tenantId },
    });

    if (!step) {
      throw new NotFoundException('Workflow step not found');
    }

    if (!step.requiresDocument) {
      return { hasFulfilled: true, requiredButMissing: false };
    }

    const documents = await this.getWorkflowDocuments(tenantId, visaApplicationId, workflowId);

    return {
      hasFulfilled: documents.length > 0,
      requiredButMissing: documents.length === 0,
      documents,
    };
  }
}

