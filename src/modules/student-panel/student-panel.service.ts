import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import * as bcrypt from 'bcrypt';
import { Subject } from 'rxjs';

interface StudentNotificationEvent {
  tenantId: string;
  studentId: string;
  data: any;
}
import {
  UpdateStudentProfileDto,
  ChangePasswordDto,
  UploadStudentDocumentDto,
  CreateCourseApplicationDto,
  UpdateCourseApplicationDto,
  StudentApplicationsQueryDto,
  VisaApplicationsQueryDto,
  DocumentsQueryDto,
  NotificationsQueryDto,
  TasksQueryDto,
  PaymentsQueryDto,
  ServicesQueryDto,
  MarkNotificationReadDto,
  DashboardStatsResponseDto,
} from './dto/student-panel.dto';
import { AppointmentsQueryDto } from '../appointments/dto/appointment.dto';
import { FilesService } from '../files/files.service';

@Injectable()
export class StudentPanelService {
  private notificationSubject = new Subject<StudentNotificationEvent>();

  constructor(
    private tenantService: TenantService,
    private filesService: FilesService,
  ) {}

  /**
   * Returns the student notification stream observable for SSE.
   */
  getNotificationStream() {
    return this.notificationSubject.asObservable();
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  async getMyProfile(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const student = await tenantPrisma.student.findFirst({
      where: { id: studentId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        academicRecords: true,
        testScores: true,
        identificationDocs: true,
        status: true,
        profileCompleteness: true,
        emailVerified: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        assignedCounselor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return student;
  }

  async updateMyProfile(tenantId: string, studentId: string, updateDto: UpdateStudentProfileDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify student exists
    const student = await tenantPrisma.student.findFirst({
      where: { id: studentId, tenantId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // Calculate profile completeness
    const profileCompleteness = this.calculateProfileCompleteness({
      ...student,
      ...updateDto,
    });

    return tenantPrisma.student.update({
      where: { id: studentId },
      data: {
        ...updateDto,
        profileCompleteness,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        academicRecords: true,
        testScores: true,
        identificationDocs: true,
        status: true,
        profileCompleteness: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(tenantId: string, studentId: string, changePasswordDto: ChangePasswordDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Step 1: Verify student exists
    const student = await tenantPrisma.student.findFirst({
      where: { id: studentId, tenantId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Step 2: Validate that new password and confirm password match
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }

    // Step 3: Validate that new password is different from current password
    const passwordField = student.password || student.hashedPassword;
    if (!passwordField) {
      throw new BadRequestException('No password set for this account');
    }

    const isSamePassword = await bcrypt.compare(changePasswordDto.newPassword, passwordField);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    // Step 4: Verify current password is correct
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      passwordField,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Step 5: Hash and update the new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await tenantPrisma.student.update({
      where: { id: studentId },
      data: {
        password: hashedPassword,
        hashedPassword: hashedPassword,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboardStats(tenantId: string, studentId: string): Promise<DashboardStatsResponseDto> {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const now = new Date();

    // Get all stats in parallel
    const [
      totalApplications,
      pendingApplications,
      offersReceived,
      activeVisaApplications,
      pendingTasks,
      upcomingAppointments,
      unreadNotifications,
      documentsToUpload,
      student,
      visaApplications,
      recentActivity,
      upcomingTasks,
      upcomingAppointmentsList,
    ] = await Promise.all([
      // Total course applications
      tenantPrisma.courseApplication.count({
        where: { studentId, tenantId },
      }),
      // Pending or under review applications
      tenantPrisma.courseApplication.count({
        where: {
          studentId,
          tenantId,
          status: { in: ['Draft', 'Submitted', 'UnderReview'] },
        },
      }),
      // Offers received
      tenantPrisma.courseApplication.count({
        where: {
          studentId,
          tenantId,
          status: 'OfferReceived',
        },
      }),
      // Active visa applications
      tenantPrisma.visaApplication.count({
        where: {
          studentId,
          tenantId,
          status: { in: ['Pending', 'Submitted', 'UnderReview'] },
        },
      }),
      // Pending tasks
      tenantPrisma.task.count({
        where: {
          tenantId,
          relatedEntityType: 'Student',
          relatedEntityId: studentId,
          status: { in: ['Pending', 'InProgress'] },
        },
      }),
      // Upcoming appointments (next 30 days)
      tenantPrisma.appointment.count({
        where: {
          studentId,
          tenantId,
          status: { in: ['Pending', 'Booked', 'Scheduled'] },
          scheduledAt: {
            gte: now,
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Unread notifications
      tenantPrisma.studentNotification.count({
        where: {
          studentId,
          tenantId,
          isRead: false,
        },
      }),
      // Documents pending verification or rejected
      tenantPrisma.studentDocument.count({
        where: {
          studentId,
          tenantId,
          verificationStatus: { in: ['Pending', 'Rejected'] },
        },
      }),
      // Student profile
      tenantPrisma.student.findFirst({
        where: { id: studentId, tenantId },
        select: { profileCompleteness: true },
      }),
      // Detailed visa applications with workflow version steps
      tenantPrisma.visaApplication.findMany({
        where: {
          studentId,
          tenantId,
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          visaType: {
            select: {
              id: true,
              name: true,
              description: true,
              country: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
          workflowVersion: {
            select: {
              steps: {
                where: { isActive: true },
                orderBy: { stepOrder: 'asc' },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  stepOrder: true,
                  requiresDocument: true,
                  isActive: true,
                  expectedDurationDays: true,
                },
              },
            },
          },
        },
      }),
      // Recent activities from notifications
      tenantPrisma.studentNotification.findMany({
        where: {
          studentId,
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          metadata: true,
          createdAt: true,
        },
      }),
      // Upcoming tasks (top 5)
      tenantPrisma.task.findMany({
        where: {
          tenantId,
          relatedEntityType: 'Student',
          relatedEntityId: studentId,
          status: { in: ['Pending', 'InProgress'] },
          dueDate: { not: null, gte: now },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
        },
      }),
      // Upcoming appointments (top 5)
      tenantPrisma.appointment.findMany({
        where: {
          studentId,
          tenantId,
          status: { in: ['Pending', 'Booked', 'Scheduled'] },
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: {
          id: true,
          scheduledAt: true,
          endTime: true,
          duration: true,
          status: true,
          purpose: true,
          note: true,
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const visaApplicationsDetailed = visaApplications.map((application: any) => {
      const steps = application.workflowVersion?.steps ?? [];
      const currentStep = steps.find((step: any) => step.id === application.currentStepId) ?? null;

      return {
        id: application.id,
        status: application.status,
        destinationCountry: application.destinationCountry,
        submissionDate: application.submissionDate,
        decisionDate: application.decisionDate,
        currentStepId: application.currentStepId,
        visaType: application.visaType,
        workflow: {
          id: application.workflow.id,
          name: application.workflow.name,
          currentStep,
          steps,
        },
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      };
    });

    return {
      totalApplications,
      pendingApplications,
      offersReceived,
      activeVisaApplications,
      pendingTasks,
      upcomingAppointments,
      unreadNotifications,
      documentsToUpload,
      profileCompleteness: student?.profileCompleteness || 0,
      visaApplications: visaApplicationsDetailed,
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        category: activity.type,
        title: activity.title,
        description: activity.message,
        metadata: activity.metadata,
        createdAt: activity.createdAt,
      })),
      upcomingTasks: upcomingTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate as Date,
        createdAt: task.createdAt,
      })),
      upcomingAppointmentsList,
    };
  }

  // ============================================
  // DOCUMENTS
  // ============================================

  async getMyDocuments(tenantId: string, studentId: string, queryDto: DocumentsQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const { documentType, verificationStatus, page = 1, limit = 10 } = queryDto;

    const where: any = {
      studentId,
      tenantId,
    };

    if (documentType) {
      where.documentType = documentType;
    }

    if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }

    // Safe pagination values
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    // Get total count for pagination metadata
    const total = await tenantPrisma.studentDocument.count({ where });

    const documents = await tenantPrisma.studentDocument.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        version: true,
        verificationStatus: true,
        verificationDate: true,
        verificationNotes: true,
        rejectionReason: true,
        expiryDate: true,
        uploadedAt: true,
        metadata: true,
      },
      skip,
      take: safeLimit,
    });

    return {
      data: documents,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async uploadDocument(tenantId: string, studentId: string, uploadDto: UploadStudentDocumentDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check for existing documents of the same type
    const existingDocuments = await tenantPrisma.studentDocument.findMany({
      where: {
        studentId,
        tenantId,
        documentType: uploadDto.documentType,
      },
      orderBy: { version: 'desc' },
      take: 1,
    });

    // Determine version number
    const version = existingDocuments.length > 0 ? existingDocuments[0].version + 1 : 1;

    const document = await tenantPrisma.studentDocument.create({
      data: {
        tenantId,
        studentId,
        documentType: uploadDto.documentType,
        filePath: uploadDto.filePath,
        fileName: uploadDto.fileName,
        fileSize: uploadDto.fileSize,
        version,
        verificationStatus: 'Pending',
        expiryDate: uploadDto.expiryDate ? new Date(uploadDto.expiryDate) : null,
        metadata: uploadDto.metadata,
      },
    });

    // Create notification for document upload
    await this.createNotification(tenantId, studentId, {
      type: 'Document',
      title: 'Document Uploaded',
      message: `Your ${uploadDto.documentType} has been uploaded successfully and is pending verification.`,
    });

    return document;
  }

  async getDocumentById(tenantId: string, studentId: string, documentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const document = await tenantPrisma.studentDocument.findFirst({
      where: {
        id: documentId,
        studentId,
        tenantId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async deleteDocument(tenantId: string, studentId: string, documentId: string) {
    return this.filesService.deleteStudentDocument(tenantId, studentId, documentId);
  }

  // ============================================
  // COURSE APPLICATIONS
  // ============================================

  async getMyCourseApplications(
    tenantId: string,
    studentId: string,
    queryDto: StudentApplicationsQueryDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, status } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      studentId,
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      tenantPrisma.courseApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              fees: true,
              duration: true,
              requirements: true,
              intakePeriods: true,
            },
          },
          university: {
            select: {
              id: true,
              name: true,
              ranking: true,
              country: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
      tenantPrisma.courseApplication.count({ where }),
    ]);

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createCourseApplication(
    tenantId: string,
    studentId: string,
    createDto: CreateCourseApplicationDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify course and university exist
    const course = await tenantPrisma.course.findFirst({
      where: { id: createDto.courseId, tenantId },
      include: { university: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.universityId !== createDto.universityId) {
      throw new BadRequestException('Course does not belong to the specified university');
    }

    // Check if application already exists
    const existingApplication = await tenantPrisma.courseApplication.findFirst({
      where: {
        studentId,
        courseId: createDto.courseId,
        tenantId,
        status: { notIn: ['Rejected', 'Withdrawn'] },
      },
    });

    if (existingApplication) {
      throw new BadRequestException('You already have an active application for this course');
    }

    const application = await tenantPrisma.courseApplication.create({
      data: {
        tenantId,
        studentId,
        courseId: createDto.courseId,
        universityId: createDto.universityId,
        intakePeriod: createDto.intakePeriod,
        notes: createDto.notes,
        status: 'Draft',
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            fees: true,
            duration: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            ranking: true,
          },
        },
      },
    });

    // Create notification
    await this.createNotification(tenantId, studentId, {
      type: 'Application',
      title: 'Application Created',
      message: `Your application for ${course.name} at ${course.university.name} has been created.`,
    });

    return application;
  }

  async getCourseApplicationById(tenantId: string, studentId: string, applicationId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const application = await tenantPrisma.courseApplication.findFirst({
      where: {
        id: applicationId,
        studentId,
        tenantId,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            fees: true,
            duration: true,
            requirements: true,
            intakePeriods: true,
            deadlines: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            ranking: true,
            description: true,
            country: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async updateCourseApplication(
    tenantId: string,
    studentId: string,
    applicationId: string,
    updateDto: UpdateCourseApplicationDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const application = await this.getCourseApplicationById(tenantId, studentId, applicationId);

    // Students can only update draft applications
    if (application.status !== 'Draft') {
      throw new ForbiddenException('You can only update draft applications');
    }

    return tenantPrisma.courseApplication.update({
      where: { id: applicationId },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
      include: {
        course: true,
        university: true,
      },
    });
  }

  async withdrawApplication(tenantId: string, studentId: string, applicationId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const application = await this.getCourseApplicationById(tenantId, studentId, applicationId);

    // Cannot withdraw accepted or rejected applications
    if (['Accepted', 'Rejected', 'Withdrawn'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot withdraw ${application.status.toLowerCase()} application`,
      );
    }

    await tenantPrisma.courseApplication.update({
      where: { id: applicationId },
      data: {
        status: 'Withdrawn',
        updatedAt: new Date(),
      },
    });

    return { success: true, message: 'Application withdrawn successfully' };
  }

  // ============================================
  // APPOINTMENTS
  // ============================================

  async getMyAppointments(tenantId: string, studentId: string, upcoming: boolean = true) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = {
      studentId,
      tenantId,
    };

    if (upcoming) {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: ['Scheduled'] };
    }

    const appointments = await tenantPrisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: upcoming ? 'asc' : 'desc' },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      data: appointments,
      total: appointments.length,
    };
  }

  async getMyAppointmentsWithPagination(
    tenantId: string,
    studentId: string,
    queryDto: AppointmentsQueryDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10 } = queryDto;

    // Safe pagination values
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const where: any = {
      studentId,
      tenantId,
    };

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.from || queryDto.to) {
      where.scheduledAt = {};
      if (queryDto.from) {
        where.scheduledAt.gte = new Date(queryDto.from);
      }
      if (queryDto.to) {
        where.scheduledAt.lte = new Date(queryDto.to);
      }
    }

    const total = await tenantPrisma.appointment.count({ where });

    const appointments = await tenantPrisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: safeLimit,
    });

    return {
      data: appointments,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ============================================
  // TASKS
  // ============================================

  async getMyTasks(tenantId: string, studentId: string, queryDto?: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Handle legacy pendingOnly boolean parameter for backward compatibility
    const pendingOnly = queryDto?.pending === true || queryDto === true;
    const page = queryDto?.page ?? 1;
    const limit = queryDto?.limit ?? 10;

    // Safe pagination values
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const where: any = {
      tenantId,
      relatedEntityType: 'Student',
      relatedEntityId: studentId,
    };

    // Only apply the pending filter when explicitly requested
    if (pendingOnly === true) {
      where.status = { in: ['Pending', 'InProgress'] };
    }

    const total = await tenantPrisma.task.count({ where });

    const tasks = await tenantPrisma.task.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: safeLimit,
    });

    return {
      data: tasks,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async completeMyTask(tenantId: string, studentId: string, taskId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Find the task and ensure it belongs to this student
    const task = await tenantPrisma.task.findFirst({
      where: {
        id: taskId,
        tenantId,
        relatedEntityType: 'Student',
        relatedEntityId: studentId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found or not assigned to you');
    }

    if (task.status === 'Completed') {
      throw new BadRequestException('Task is already marked as completed');
    }

    if (task.status === 'Cancelled') {
      throw new BadRequestException('Cancelled tasks cannot be marked as completed');
    }

    const updatedTask = await tenantPrisma.task.update({
      where: { id: taskId },
      data: {
        status: 'Completed',
        updatedAt: new Date(),
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify the student of the completion
    await this.createNotification(tenantId, studentId, {
      type: 'Task',
      title: 'Task Completed',
      message: `You marked the task "${task.title}" as completed.`,
    });

    return updatedTask;
  }

  // ============================================
  // VISA APPLICATIONS
  // ============================================

  async getMyVisaApplications(
    tenantId: string,
    studentId: string,
    queryDto?: VisaApplicationsQueryDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const page = queryDto?.page ?? 1;
    const limit = queryDto?.limit ?? 10;

    // Safe pagination values
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const where = {
      studentId,
      tenantId,
    };

    const total = await tenantPrisma.visaApplication.count({ where });

    const applications = await tenantPrisma.visaApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        visaType: {
          select: {
            id: true,
            name: true,
            description: true,
            country: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            filePath: true,
            uploadedAt: true,
          },
        },
      },
      skip,
      take: safeLimit,
    });

    return {
      data: applications,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getMyDetailedVisaApplications(
    tenantId: string,
    studentId: string,
    queryDto: VisaApplicationsQueryDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page, limit } = queryDto;
    const shouldPaginate = page !== undefined || limit !== undefined;

    const safePage = Math.max(page ?? 1, 1);
    const safeLimit = Math.min(Math.max(limit ?? 10, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const where = {
      studentId,
      tenantId,
    };

    if (shouldPaginate) {
      const [applications, total] = await Promise.all([
        tenantPrisma.visaApplication.findMany({
          where,
          skip,
          take: safeLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                description: true,
                currentVersionId: true,
              },
            },
            workflowVersion: {
              include: {
                steps: {
                  orderBy: {
                    stepOrder: 'asc' as const,
                  },
                },
              },
            },
            courseApplication: true,
            documents: true,
          },
        }),
        tenantPrisma.visaApplication.count({ where }),
      ]);

      if (total === 0) {
        throw new NotFoundException('No visa applications found for this student');
      }

      const data = applications.map((application: any) => {
        const workflowSteps = application.workflowVersion?.steps || [];
        const currentStep = workflowSteps.find(
          (step: any) => step.id === application.currentStepId,
        );
        return {
          id: application.id,
          status: application.status,
          currentStepId: application.currentStepId,
          currentStep: currentStep || null,
          workflow: {
            id: application.workflow.id,
            name: application.workflow.name,
            description: application.workflow.description,
            defaultVersionId: application.workflow?.currentVersionId,
          },
          applicationVersionId: application.workflowVersion?.id,
          workflowVersion: {
            id: application.workflowVersion?.id,
            versionNumber: application.workflowVersion?.versionNumber,
            steps: workflowSteps,
          },
          courseApplication: application.courseApplication,
          documents: application.documents.map((document: any) => ({
            id: document.id,
            name: document.documentType,
            uploadedAt: document.uploadedAt,
          })),
          notes: application.notes,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        };
      });

      return {
        data,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    }

    const applications = await tenantPrisma.visaApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
            currentVersionId: true,
          },
        },
        workflowVersion: {
          include: {
            steps: {
              orderBy: {
                stepOrder: 'asc' as const,
              },
            },
          },
        },
        courseApplication: true,
        documents: true,
      },
    });

    if (applications.length === 0) {
      throw new NotFoundException('No visa applications found for this student');
    }

    return applications.map((application: any) => {
      const workflowSteps = application.workflowVersion?.steps || [];
      const currentStep = workflowSteps.find((step: any) => step.id === application.currentStepId);
      return {
        id: application.id,
        status: application.status,
        currentStepId: application.currentStepId,
        currentStep: currentStep || null,
        workflow: {
          id: application.workflow.id,
          name: application.workflow.name,
          description: application.workflow.description,
          defaultVersionId: application.workflow?.currentVersionId,
        },
        applicationVersionId: application.workflowVersion?.id,
        workflowVersion: {
          id: application.workflowVersion?.id,
          versionNumber: application.workflowVersion?.versionNumber,
          steps: workflowSteps,
        },
        courseApplication: application.courseApplication,
        documents: application.documents.map((document: any) => ({
          id: document.id,
          name: document.documentType,
          uploadedAt: document.uploadedAt,
        })),
        notes: application.notes,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      };
    });
  }

  async getVisaApplicationById(tenantId: string, studentId: string, visaApplicationId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const application = await tenantPrisma.visaApplication.findFirst({
      where: {
        id: visaApplicationId,
        tenantId,
      },
      include: {
        visaType: {
          select: {
            id: true,
            name: true,
            description: true,
            country: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
            currentVersionId: true,
          },
        },
        workflowVersion: {
          include: {
            steps: {
              where: { isActive: true },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
        documents: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Visa application not found');
    }

    if (application.studentId !== studentId) {
      throw new ForbiddenException('You can only access your own visa applications');
    }

    // Enhance response with current workflow step information from the actual workflow version used
    const workflowSteps = (application.workflowVersion as any)?.steps || [];
    const totalSteps = workflowSteps.length;

    let currentStepIndex: number;
    let currentStep: any;
    let nextStep: any;

    if (application.currentStepId === null) {
      // All steps completed — set progress to 100%
      currentStepIndex = totalSteps;
      currentStep = null;
      nextStep = null;
    } else {
      currentStepIndex = workflowSteps.findIndex(
        (step: any) => step.id === application.currentStepId,
      );
      currentStep = currentStepIndex !== -1 ? workflowSteps[currentStepIndex] : null;
      nextStep =
        currentStepIndex !== -1 && currentStepIndex < totalSteps - 1
          ? workflowSteps[currentStepIndex + 1]
          : null;
    }

    const progressIndex = Math.min(currentStepIndex, totalSteps);

    // Prepare the response with renamed workflow fields
    const { workflow, workflowVersion, ...rest } = application;

    return {
      ...rest,
      workflow: {
        ...workflow,
        defaultVersionId: (workflow as any)?.currentVersionId,
      },
      applicationVersionId: (workflowVersion as any)?.id,
      workflowVersion,
      currentStep,
      nextStep,
      workflowProgress: {
        totalSteps,
        currentStepIndex: progressIndex,
        percentageComplete: totalSteps > 0 ? (progressIndex / totalSteps) * 100 : 0,
      },
    };
  }

  // ============================================
  // PAYMENTS & SERVICES
  // ============================================

  async getMyPayments(tenantId: string, studentId: string, queryDto?: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const page = queryDto?.page ?? 1;
    const limit = queryDto?.limit ?? 10;

    // Safe pagination values
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const where = {
      studentId,
      tenantId,
    };

    const total = await tenantPrisma.payment.count({ where });

    const payments = await tenantPrisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
      },
      skip,
      take: safeLimit,
    });

    // Normalize response to include student name
    const normalizedPayments = payments.map((payment) => {
      const firstName = payment.student?.firstName ?? '';
      const lastName = payment.student?.lastName ?? '';
      const name = `${firstName} ${lastName}`.trim();

      return {
        ...payment,
        student: payment.student
          ? {
              ...payment.student,
              name,
            }
          : null,
      };
    });

    return {
      data: normalizedPayments,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getMyServices(tenantId: string, studentId: string, queryDto?: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const page = queryDto?.page ?? 1;
    const limit = queryDto?.limit ?? 10;

    // Safe pagination values
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const student = await tenantPrisma.student.findFirst({
      where: { id: studentId, tenantId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get total count for pagination
    const total = await tenantPrisma.service.count({ where: { tenantId } });

    const services = await tenantPrisma.service.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        studentServices: {
          where: { studentId },
          select: {
            id: true,
            assignedAt: true,
            notes: true,
          },
        },
        classes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            schedule: true,
            studentCapacity: true,
            createdAt: true,
            updatedAt: true,
            enrollments: {
              where: { studentId },
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            bookingRequests: {
              where: {
                studentId,
                // Exclude Approved and Rejected requests
                NOT: {
                  status: {
                    in: ['Approved', 'Rejected'],
                  },
                },
              },
              orderBy: { requestedAt: 'desc' },
              select: {
                id: true,
                status: true,
                requestedAt: true,
              },
            },
          },
        },
        tests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            studentCapacity: true,
            createdAt: true,
            updatedAt: true,
            assignments: {
              where: { studentId },
              select: {
                id: true,
                status: true,
                score: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            bookingRequests: {
              where: {
                studentId,
                // Exclude Approved and Rejected requests
                NOT: {
                  status: {
                    in: ['Approved', 'Rejected'],
                  },
                },
              },
              orderBy: { requestedAt: 'desc' },
              select: {
                id: true,
                status: true,
                requestedAt: true,
              },
            },
          },
        },
      },
      skip,
      take: safeLimit,
    });

    const mappedServices = services.map((service) => {
      const serviceAssignment = service.studentServices[0] || null;

      const classes = service.classes.map((cls) => {
        // Get the latest (most recent) booking request
        const latestBookingRequest = cls.bookingRequests[0] || null;
        const hasRequested = latestBookingRequest !== null;

        return {
          id: cls.id,
          name: cls.name,
          description: cls.description,
          schedule: cls.schedule,
          studentCapacity: cls.studentCapacity,
          createdAt: cls.createdAt,
          updatedAt: cls.updatedAt,
          assignment: {
            isAssigned: !!cls.enrollments[0],
            enrollmentId: cls.enrollments[0]?.id || null,
            status: cls.enrollments[0]?.status || null,
            assignedAt: cls.enrollments[0]?.createdAt || null,
            updatedAt: cls.enrollments[0]?.updatedAt || null,
          },
          hasRequested,
          latestRequestStatus: latestBookingRequest?.status || null,
        };
      });

      const tests = service.tests.map((test) => {
        const testAssignment = test.assignments[0] || null;
        // Get the latest (most recent) booking request
        const latestBookingRequest = test.bookingRequests[0] || null;
        const hasRequested = latestBookingRequest !== null;

        return {
          id: test.id,
          name: test.name,
          type: test.type,
          description: test.description,
          studentCapacity: test.studentCapacity,
          createdAt: test.createdAt,
          updatedAt: test.updatedAt,
          assignment: {
            isAssigned: !!testAssignment,
            assignmentId: testAssignment?.id || null,
            status: testAssignment?.status || null,
            score: testAssignment?.score ?? null,
            assignedAt: testAssignment?.createdAt || null,
            updatedAt: testAssignment?.updatedAt || null,
          },
          hasRequested,
          latestRequestStatus: latestBookingRequest?.status || null,
        };
      });

      return {
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
        assignment: {
          isAssigned: !!serviceAssignment,
          assignmentId: serviceAssignment?.id || null,
          assignedAt: serviceAssignment?.assignedAt || null,
          notes: serviceAssignment?.notes || null,
        },
        classes,
        tests,
      };
    });

    const assignedServices = mappedServices.filter(
      (service) => service.assignment.isAssigned,
    ).length;

    return {
      data: {
        tenantId,
        studentId,
        totalServices: mappedServices.length,
        assignedServices,
        services: mappedServices,
      },
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getMyServiceById(tenantId: string, studentId: string, serviceId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const student = await tenantPrisma.student.findFirst({
      where: { id: studentId, tenantId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const service = await tenantPrisma.service.findFirst({
      where: { id: serviceId, tenantId },
      include: {
        studentServices: {
          where: { studentId },
          select: {
            id: true,
            assignedAt: true,
            notes: true,
          },
        },
        classes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            schedule: true,
            studentCapacity: true,
            createdAt: true,
            updatedAt: true,
            enrollments: {
              where: { studentId },
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            bookingRequests: {
              where: {
                studentId,
                // Exclude Approved and Rejected requests
                NOT: {
                  status: {
                    in: ['Approved', 'Rejected'],
                  },
                },
              },
              orderBy: { requestedAt: 'desc' },
              select: {
                id: true,
                status: true,
                requestedAt: true,
              },
            },
          },
        },
        tests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            studentCapacity: true,
            createdAt: true,
            updatedAt: true,
            assignments: {
              where: { studentId },
              select: {
                id: true,
                status: true,
                score: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            bookingRequests: {
              where: {
                studentId,
                // Exclude Approved and Rejected requests
                NOT: {
                  status: {
                    in: ['Approved', 'Rejected'],
                  },
                },
              },
              orderBy: { requestedAt: 'desc' },
              select: {
                id: true,
                status: true,
                requestedAt: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const serviceAssignment = service.studentServices[0] || null;

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      assignment: {
        isAssigned: !!serviceAssignment,
        assignmentId: serviceAssignment?.id || null,
        assignedAt: serviceAssignment?.assignedAt || null,
        notes: serviceAssignment?.notes || null,
      },
      classes: service.classes.map((cls) => {
        const classAssignment = cls.enrollments[0] || null;
        // Get the latest (most recent) booking request
        const latestBookingRequest = cls.bookingRequests[0] || null;
        const hasRequested = latestBookingRequest !== null;

        return {
          id: cls.id,
          name: cls.name,
          description: cls.description,
          schedule: cls.schedule,
          studentCapacity: cls.studentCapacity,
          createdAt: cls.createdAt,
          updatedAt: cls.updatedAt,
          assignment: {
            isAssigned: !!classAssignment,
            enrollmentId: classAssignment?.id || null,
            status: classAssignment?.status || null,
            assignedAt: classAssignment?.createdAt || null,
            updatedAt: classAssignment?.updatedAt || null,
          },
          hasRequested,
          latestRequestStatus: latestBookingRequest?.status || null,
        };
      }),
      tests: service.tests.map((test) => {
        const testAssignment = test.assignments[0] || null;
        // Get the latest (most recent) booking request
        const latestBookingRequest = test.bookingRequests[0] || null;
        const hasRequested = latestBookingRequest !== null;

        return {
          id: test.id,
          name: test.name,
          type: test.type,
          description: test.description,
          studentCapacity: test.studentCapacity,
          createdAt: test.createdAt,
          updatedAt: test.updatedAt,
          assignment: {
            isAssigned: !!testAssignment,
            assignmentId: testAssignment?.id || null,
            status: testAssignment?.status || null,
            score: testAssignment?.score ?? null,
            assignedAt: testAssignment?.createdAt || null,
            updatedAt: testAssignment?.updatedAt || null,
          },
          hasRequested,
          latestRequestStatus: latestBookingRequest?.status || null,
        };
      }),
    };
  }

  // ============================================
  // PAYMENT BALANCE & STATUS (STRICT CYCLE LOGIC)
  // ============================================

  /**
   * Get payment status for a specific service.
   * Returns current cycle info, remaining balance, and completion status.
   * Follows the strict independent payment cycle logic.
   */
  async getServicePaymentStatus(tenantId: string, studentId: string, serviceId: string | null) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Helper to convert Decimal to number
    const toDecimal = (value: any): number => {
      return typeof value === 'number' ? value : Number(value?.toFixed?.(2) ?? value ?? 0);
    };

    // Get cycle info
    const payments = await tenantPrisma.payment.findMany({
      where: {
        studentId,
        tenantId,
        ...(serviceId ? { serviceId } : { serviceId: null }),
      },
      orderBy: [{ paymentCycle: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        paymentCycle: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        paymentDate: true,
      },
    });

    if (payments.length === 0) {
      return {
        hasPayments: false,
        currentCycle: null,
        totalServiceCost: 0,
        totalPaidInCycle: 0,
        remainingBalance: 0,
        cycleStatus: null,
        message: 'No payments recorded for this service',
      };
    }

    // Get the latest (current) cycle
    const maxCycle = Math.max(...payments.map((p) => p.paymentCycle));
    const currentCyclePayments = payments.filter((p) => p.paymentCycle === maxCycle);

    // Calculate cycle totals (convert Decimal to number)
    const totalServiceCost = toDecimal(currentCyclePayments[0]?.totalAmount);
    const totalPaidInCycle = currentCyclePayments.reduce(
      (sum, p) => sum + toDecimal(p.paidAmount),
      0,
    );
    const remainingBalance = totalServiceCost - totalPaidInCycle;

    // Determine cycle status (follows strict spec logic)
    let cycleStatus: 'Pending' | 'PartiallyPaid' | 'Completed';
    if (totalPaidInCycle === 0) {
      cycleStatus = 'Pending';
    } else if (totalPaidInCycle < totalServiceCost) {
      cycleStatus = 'PartiallyPaid';
    } else {
      cycleStatus = 'Completed';
    }

    // Count completed and incomplete cycles for history
    const completedCycles: Array<{
      cycleNumber: number;
      totalAmount: number;
      totalPaid: number;
      status: string;
      paymentDates: Date[];
    }> = [];
    const cycleMap = new Map<number, { payments: typeof payments; totalPaid: number }>();

    payments.forEach((p) => {
      if (!cycleMap.has(p.paymentCycle)) {
        cycleMap.set(p.paymentCycle, { payments: [], totalPaid: 0 });
      }
      const cycle = cycleMap.get(p.paymentCycle)!;
      cycle.payments.push(p);
      cycle.totalPaid += toDecimal(p.paidAmount);
    });

    cycleMap.forEach((cycle, cycleNum) => {
      const isCompleted = cycle.totalPaid >= toDecimal(cycle.payments[0].totalAmount);
      if (isCompleted && cycleNum < maxCycle) {
        completedCycles.push({
          cycleNumber: cycleNum,
          totalAmount: toDecimal(cycle.payments[0].totalAmount),
          totalPaid: cycle.totalPaid,
          status: 'Completed',
          paymentDates: cycle.payments.map((p) => p.paymentDate).filter(Boolean) as Date[],
        });
      }
    });

    return {
      hasPayments: true,
      currentCycle: maxCycle,
      totalServiceCost: Number(totalServiceCost),
      totalPaidInCycle: Number(totalPaidInCycle),
      remainingBalance: Math.max(0, Number(remainingBalance)),
      cycleStatus,
      canMakePayment: remainingBalance > 0,
      completedCycles: completedCycles.length,
      cycleHistory: completedCycles,
      payments: currentCyclePayments.map((p) => ({
        id: p.id,
        paidAmount: toDecimal(p.paidAmount),
        status: p.status,
        paymentDate: p.paymentDate,
      })),
    };
  }

  /**
   * Get payment status across all services for a student.
   * Returns summary of payment cycles and completion status per service.
   */
  async getMyPaymentStatus(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Helper to convert Decimal to number
    const toDecimal = (value: any): number => {
      return typeof value === 'number' ? value : Number(value?.toFixed?.(2) ?? value ?? 0);
    };

    // Get all payments for this student
    const allPayments = await tenantPrisma.payment.findMany({
      where: { studentId, tenantId },
      include: {
        service: {
          select: { id: true, name: true, price: true },
        },
      },
      orderBy: [{ serviceId: 'asc' }, { paymentCycle: 'asc' }, { createdAt: 'asc' }],
    });

    if (allPayments.length === 0) {
      return {
        totalServices: 0,
        totalPaymentAmount: 0,
        totalRemainingBalance: 0,
        completedServices: 0,
        serviceStatus: [],
      };
    }

    // Group by service
    const serviceMap = new Map<
      string,
      {
        serviceName: string;
        cycles: Map<number, { totalAmount: number; totalPaid: number; isCompleted: boolean }>;
      }
    >();

    allPayments.forEach((p) => {
      const serviceKey = p.serviceId || 'general';
      if (!serviceMap.has(serviceKey)) {
        serviceMap.set(serviceKey, {
          serviceName: p.service?.name || 'General Payment',
          cycles: new Map(),
        });
      }

      const serviceData = serviceMap.get(serviceKey)!;
      if (!serviceData.cycles.has(p.paymentCycle)) {
        serviceData.cycles.set(p.paymentCycle, {
          totalAmount: toDecimal(p.totalAmount),
          totalPaid: 0,
          isCompleted: false,
        });
      }

      const cycle = serviceData.cycles.get(p.paymentCycle)!;
      cycle.totalPaid += toDecimal(p.paidAmount);
      cycle.isCompleted = cycle.totalPaid >= cycle.totalAmount;
    });

    // Calculate summaries per service
    const serviceStatus: any[] = [];
    let totalPaymentAmount = 0;
    let totalRemainingBalance = 0;
    let completedServices = 0;

    serviceMap.forEach((serviceData, serviceKey) => {
      const cycles = Array.from(serviceData.cycles.values());
      const currentCycle = cycles[cycles.length - 1];

      const totalServiceCost = currentCycle.totalAmount;
      const totalPaid = cycles.reduce((sum, c) => sum + c.totalPaid, 0);
      const remainingInCurrentCycle = totalServiceCost - currentCycle.totalPaid;

      const completedCycleCount = cycles.filter((c) => c.isCompleted).length;
      const isServiceCompleted = currentCycle.isCompleted;

      serviceStatus.push({
        serviceId: serviceKey === 'general' ? null : serviceKey,
        serviceName: serviceData.serviceName,
        currentCycle: cycles.length,
        totalServiceCost: Number(totalServiceCost),
        totalPaidAcrossAllCycles: totalPaid,
        remainingInCurrentCycle: Math.max(0, remainingInCurrentCycle),
        currentCycleStatus: isServiceCompleted
          ? 'Completed'
          : remainingInCurrentCycle > 0
            ? 'PartiallyPaid'
            : 'Pending',
        completedCycles: completedCycleCount,
        canMakePayment: remainingInCurrentCycle > 0,
      });

      totalPaymentAmount += totalServiceCost;
      totalRemainingBalance += Math.max(0, remainingInCurrentCycle);
      if (isServiceCompleted) completedServices++;
    });

    return {
      totalServices: serviceStatus.length,
      totalPaymentAmount,
      totalRemainingBalance,
      completedServices,
      serviceStatus: serviceStatus.sort((a, b) => a.serviceName.localeCompare(b.serviceName)),
    };
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async getMyNotifications(tenantId: string, studentId: string, queryDto: NotificationsQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 20, unreadOnly } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      studentId,
      tenantId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      tenantPrisma.studentNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      tenantPrisma.studentNotification.count({ where }),
      tenantPrisma.studentNotification.count({
        where: { studentId, tenantId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markNotificationsAsRead(
    tenantId: string,
    studentId: string,
    markReadDto: MarkNotificationReadDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    await tenantPrisma.studentNotification.updateMany({
      where: {
        id: { in: markReadDto.notificationIds },
        studentId,
        tenantId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, message: 'Notifications marked as read' };
  }

  async markAllNotificationsAsRead(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    await tenantPrisma.studentNotification.updateMany({
      where: {
        studentId,
        tenantId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, message: 'All notifications marked as read' };
  }

  // ============================================
  // UNIVERSITIES & COURSES (READ-ONLY)
  // ============================================

  async getUniversities(tenantId: string, page: number = 1, limit: number = 10, search?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [universities, total] = await Promise.all([
      tenantPrisma.university.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          country: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              courses: true,
            },
          },
        },
      }),
      tenantPrisma.university.count({ where }),
    ]);

    return {
      data: universities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUniversityById(tenantId: string, universityId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const university = await tenantPrisma.university.findFirst({
      where: { id: universityId, tenantId },
      include: {
        country: true,
        courses: {
          select: {
            id: true,
            name: true,
            fees: true,
            duration: true,
            requirements: true,
            intakePeriods: true,
            deadlines: true,
          },
        },
      },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    return university;
  }

  async getCourses(
    tenantId: string,
    universityId?: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (universityId) {
      where.universityId = universityId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [courses, total] = await Promise.all([
      tenantPrisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          university: {
            select: {
              id: true,
              name: true,
              country: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
      tenantPrisma.course.count({ where }),
    ]);

    return {
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCourseById(tenantId: string, courseId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const course = await tenantPrisma.course.findFirst({
      where: { id: courseId, tenantId },
      include: {
        university: {
          include: {
            country: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateProfileCompleteness(student: any): number {
    let completeness = 0;
    const fields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'academicRecords',
      'testScores',
      'identificationDocs',
    ];

    fields.forEach((field) => {
      if (student[field]) {
        if (typeof student[field] === 'object') {
          // Check if JSON field has content
          completeness += Object.keys(student[field]).length > 0 ? 100 / fields.length : 0;
        } else {
          completeness += 100 / fields.length;
        }
      }
    });

    return Math.round(completeness);
  }

  private async createNotification(
    tenantId: string,
    studentId: string,
    data: {
      type: string;
      title: string;
      message: string;
      actionUrl?: string;
      metadata?: any;
    },
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const notification = await tenantPrisma.studentNotification.create({
      data: {
        tenantId,
        studentId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
      },
    });

    // Emit to the SSE stream so connected students receive it in real-time
    this.notificationSubject.next({
      tenantId,
      studentId,
      data: notification,
    });

    return notification;
  }
}
