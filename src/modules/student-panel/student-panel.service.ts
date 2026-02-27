import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import * as bcrypt from 'bcrypt';
import {
  UpdateStudentProfileDto,
  ChangePasswordDto,
  UploadStudentDocumentDto,
  CreateCourseApplicationDto,
  UpdateCourseApplicationDto,
  StudentApplicationsQueryDto,
  DocumentsQueryDto,
  NotificationsQueryDto,
  MarkNotificationReadDto,
  DashboardStatsResponseDto,
} from './dto/student-panel.dto';

@Injectable()
export class StudentPanelService {
  constructor(private tenantService: TenantService) {}

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

    const student = await tenantPrisma.student.findFirst({
      where: { id: studentId, tenantId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Verify current password
    const passwordField = student.password || student.hashedPassword;
    if (!passwordField) {
      throw new BadRequestException('No password set for this account');
    }

    const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, passwordField);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await tenantPrisma.student.update({
      where: { id: studentId },
      data: {
        password: hashedPassword,
        hashedPassword: hashedPassword,
      },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboardStats(tenantId: string, studentId: string): Promise<DashboardStatsResponseDto> {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

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
          status: 'Scheduled',
          scheduledAt: {
            gte: new Date(),
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
    ]);

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
    };
  }

  // ============================================
  // DOCUMENTS
  // ============================================

  async getMyDocuments(tenantId: string, studentId: string, queryDto: DocumentsQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = {
      studentId,
      tenantId,
    };

    if (queryDto.documentType) {
      where.documentType = queryDto.documentType;
    }

    if (queryDto.verificationStatus) {
      where.verificationStatus = queryDto.verificationStatus;
    }

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
    });

    return documents;
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

  // ============================================
  // COURSE APPLICATIONS
  // ============================================

  async getMyCourseApplications(tenantId: string, studentId: string, queryDto: StudentApplicationsQueryDto) {
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

  async createCourseApplication(tenantId: string, studentId: string, createDto: CreateCourseApplicationDto) {
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
      throw new BadRequestException(`Cannot withdraw ${application.status.toLowerCase()} application`);
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

    return appointments;
  }

  // ============================================
  // TASKS
  // ============================================

  async getMyTasks(tenantId: string, studentId: string, pending: boolean = true) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = {
      tenantId,
      relatedEntityType: 'Student',
      relatedEntityId: studentId,
    };

    if (pending) {
      where.status = { in: ['Pending', 'InProgress'] };
    }

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
    });

    return tasks;
  }

  // ============================================
  // VISA APPLICATIONS
  // ============================================

  async getMyVisaApplications(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const applications = await tenantPrisma.visaApplication.findMany({
      where: {
        studentId,
        tenantId,
      },
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
    });

    return applications;
  }

  async getVisaApplicationById(tenantId: string, studentId: string, visaApplicationId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const application = await tenantPrisma.visaApplication.findFirst({
      where: {
        id: visaApplicationId,
        studentId,
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
        documents: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Visa application not found');
    }

    return application;
  }

  // ============================================
  // PAYMENTS & SERVICES
  // ============================================

  async getMyPayments(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const payments = await tenantPrisma.payment.findMany({
      where: {
        studentId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
      },
    });

    return payments;
  }

  async getMyServices(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const services = await tenantPrisma.studentService.findMany({
      where: {
        studentId,
        tenantId,
      },
      orderBy: { assignedAt: 'desc' },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
      },
    });

    return services;
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

  async markNotificationsAsRead(tenantId: string, studentId: string, markReadDto: MarkNotificationReadDto) {
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

  async getCourses(tenantId: string, universityId?: string, page: number = 1, limit: number = 10, search?: string) {
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

  private async createNotification(tenantId: string, studentId: string, data: {
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.studentNotification.create({
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
  }
}
