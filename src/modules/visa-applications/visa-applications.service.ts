import { Injectable, NotFoundException, BadRequestException, ConflictException, PreconditionFailedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVisaApplicationDto, AdvanceVisaStepDto, DefaultFilterDto } from './dto/visa-application.dto';
import { VisaStatus, Prisma, VisaWorkflowStep } from '@prisma/tenant-client';

export interface HistoryEntry {
  stepId: string | null;
  status: string;
  timestamp: string;
  matchedSLA: boolean;
  remarks?: string;
}

@Injectable()
export class VisaApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createDto: CreateVisaApplicationDto) {
    const { studentId, visaTypeId, courseApplicationId, destinationCountry } = createDto;

    const student = await this.prisma.student.findUnique({
      where: { id: studentId, tenantId },
    });
    if (!student) throw new NotFoundException('Student not found for the given tenant');

    const visaType = await this.prisma.visaType.findUnique({
      where: { id: visaTypeId, tenantId },
      include: { workflows: { where: { isActive: true }, include: { steps: { where: { stepOrder: 1, isActive: true } } } } },
    });
    if (!visaType || !visaType.isActive) throw new NotFoundException('Active Visa Type not found for the given tenant');

    const workflow = visaType.workflows[0];
    if (!workflow) throw new BadRequestException('No active workflow found for this Visa Type');

    const firstStep = workflow.steps[0];
    if (!firstStep) throw new BadRequestException('The selected workflow has no configured first step');

    if (courseApplicationId) {
      const courseApp = await this.prisma.courseApplication.findUnique({ where: { id: courseApplicationId, tenantId } });
      if (!courseApp) throw new NotFoundException('Course Application not found for the given tenant');
      if (courseApp.studentId !== studentId) throw new BadRequestException('Course Application does not belong to the given student');
      if (courseApp.status !== 'OfferReceived' && courseApp.status !== 'Accepted') throw new BadRequestException('Course Application must be in OfferReceived or Accepted status');

      const existingVisa = await this.prisma.visaApplication.findFirst({
        where: { tenantId, courseApplicationId, status: { notIn: ['Rejected', 'Approved'] } },
      });
      if (existingVisa) throw new ConflictException('A non-resolved visa application already exists for this course application');
    }

    const initialHistory: HistoryEntry[] = [{ stepId: firstStep.id, status: 'Started', timestamp: new Date().toISOString(), matchedSLA: true, remarks: 'Application created' }];

    return this.prisma.visaApplication.create({
      data: {
        tenantId, studentId, visaTypeId, workflowId: workflow.id, courseApplicationId: courseApplicationId || null,
        destinationCountry: destinationCountry || null, status: VisaStatus.Pending, currentStepId: firstStep.id, notes: initialHistory as any, version: 1,
      },
      include: { student: true, workflow: true, visaType: true },
    });
  }

  async advanceStep(tenantId: string, id: string, advanceDto: AdvanceVisaStepDto) {
    const { expectedStepId, notes } = advanceDto;

    return this.prisma.$transaction(async (tx: any) => {
      const app = await tx.visaApplication.findUnique({
        where: { id, tenantId },
        include: { workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } }, documents: true },
      });
      if (!app) throw new NotFoundException('Visa Application not found');
      if (app.status === 'Approved' || app.status === 'Rejected') throw new BadRequestException(`Cannot advance a visa application that is ${app.status}`);
      if (app.currentStepId !== expectedStepId) throw new ConflictException('The workflow step state has changed since you loaded it.');

      const stepIndex = app.workflow.steps.findIndex((s: any) => s.id === app.currentStepId);
      if (stepIndex === -1) throw new BadRequestException('Current step not found in the workflow steps');
      const currentStep = app.workflow.steps[stepIndex];

      if (currentStep.requiresDocument && app.documents.length === 0) throw new PreconditionFailedException(`Documents are required before advancing from ${currentStep.name}`);

      const nextStep = app.workflow.steps[stepIndex + 1];
      const history: HistoryEntry[] = Array.isArray(app.notes) ? app.notes as any : [];
      
      let matchedSLA = true;
      if (history.length > 0 && currentStep.expectedDurationDays) {
        const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(history[history.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > currentStep.expectedDurationDays) matchedSLA = false;
      }
      history.push({ stepId: app.currentStepId, status: 'Completed', timestamp: new Date().toISOString(), matchedSLA, remarks: notes });

      // Determine updated status
      const updatedStatus = nextStep 
        ? (app.status === VisaStatus.Pending ? VisaStatus.Submitted : app.status) 
        : VisaStatus.Submitted;

      if (!nextStep) {
         history.push({ stepId: null, status: 'All Steps Completed', timestamp: new Date().toISOString(), matchedSLA: true, remarks: 'Automated transition to submitted state' });
      }

      const updatedApp = await tx.visaApplication.update({
        where: { id: app.id, version: app.version },
        data: {
          currentStepId: nextStep ? nextStep.id : null,
          status: updatedStatus,
          notes: history as any,
          version: { increment: 1 },
        },
      });

      return updatedApp;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findAll(tenantId: string, filters: DefaultFilterDto) {
    const { studentId, visaTypeId, courseApplicationId, status } = filters;
    return this.prisma.visaApplication.findMany({
      where: {
        tenantId,
        ...(studentId && { studentId }),
        ...(visaTypeId && { visaTypeId }),
        ...(courseApplicationId && { courseApplicationId }),
        ...(status && { status: status as VisaStatus }),
      },
      include: {
        student: true,
        visaType: true,
        workflow: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const visaApplication = await this.prisma.visaApplication.findFirst({
      where: { id, tenantId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        visaType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        workflow: {
          include: {
            steps: {
              where: { isActive: true },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
        courseApplication: {
          select: {
            id: true,
            status: true,
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        documents: {
          include: {
            studentDocument: {
              select: {
                id: true,
                documentType: true,
                filePath: true,
                verificationStatus: true,
              },
            },
          },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!visaApplication) {
      throw new NotFoundException('Visa application not found');
    }

    // Enhanced response with workflow step analysis and document requirements
    const currentStepIndex = visaApplication.workflow.steps.findIndex(
      (s: VisaWorkflowStep) => s.id === visaApplication.currentStepId,
    );

    const currentStep = currentStepIndex !== -1 ? visaApplication.workflow.steps[currentStepIndex] : null;
    const nextStep = currentStepIndex < visaApplication.workflow.steps.length - 1
      ? visaApplication.workflow.steps[currentStepIndex + 1]
      : null;

    // Calculate which steps need documents
    const stepDocumentRequirements = visaApplication.workflow.steps.map((step: VisaWorkflowStep) => {
      const documentsForStep = visaApplication.documents.filter((doc: any) => doc.workflowId === step.id);
      return {
        stepId: step.id,
        stepName: step.name,
        stepOrder: step.stepOrder,
        requiresDocument: step.requiresDocument,
        isDocumentSubmitted: documentsForStep.length > 0,
        submittedDocuments: documentsForStep,
      };
    });

    return {
      ...visaApplication,
      currentStep,
      nextStep,
      workflowProgress: {
        totalSteps: visaApplication.workflow.steps.length,
        currentStepIndex: currentStepIndex + 1,
        percentageComplete: ((currentStepIndex + 1) / visaApplication.workflow.steps.length) * 100,
      },
      stepDocumentRequirements,
      metadata: {
        createdDaysAgo: Math.floor((Date.now() - new Date(visaApplication.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        isCompleted: visaApplication.status === 'Approved' || visaApplication.status === 'Rejected',
      },
    };
  }
}
