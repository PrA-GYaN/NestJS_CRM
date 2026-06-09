import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/tenant-client';
import { CourseApplicationsRepository } from './course-applications.repository';
import {
  ApplicationsQueryDto,
  CreateCourseApplicationDto,
  StudentApplicationsQueryDto,
  UpdateApplicationStatusDto,
} from './dto/course-application.dto';

@Injectable()
export class CourseApplicationsService {
  constructor(private readonly repository: CourseApplicationsRepository) {}

  async create(tenantId: string, currentUser: any, dto: CreateCourseApplicationDto) {
    this.ensureStudent(currentUser);

    const studentId = currentUser.studentId || currentUser.id;

    const [student, course, existingApplication] = await Promise.all([
      this.repository.findStudentById(tenantId, studentId),
      this.repository.findCourseWithUniversity(tenantId, dto.courseId),
      this.repository.findExistingByStudentAndCourse(tenantId, studentId, dto.courseId),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (existingApplication) {
      throw new ConflictException(
        'Duplicate application: student has already applied for this course',
      );
    }

    try {
      return await this.repository.createApplication(tenantId, {
        studentId,
        courseId: dto.courseId,
        universityId: course.universityId,
        intakePeriod: dto.intakePeriod,
        notes: dto.notes,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Duplicate application: student has already applied for this course',
        );
      }

      throw error;
    }
  }

  async findAllForAdmin(tenantId: string, currentUser: any, query: StudentApplicationsQueryDto) {
    await this.ensureAdminOrInstructor(tenantId, currentUser);

    return this.repository.findMany(
      tenantId,
      {
        studentId: query.studentId,
        courseId: query.courseId,
        status: query.status,
      },
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  async findMine(tenantId: string, currentUser: any, query: ApplicationsQueryDto) {
    this.ensureStudent(currentUser);

    const studentId = currentUser.studentId || currentUser.id;
    return this.repository.findMany(
      tenantId,
      {
        studentId,
        courseId: query.courseId,
        status: query.status,
      },
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  async findByStudentId(
    tenantId: string,
    currentUser: any,
    studentId: string,
    query: ApplicationsQueryDto,
  ) {
    await this.ensureAdminOrInstructor(tenantId, currentUser);

    const student = await this.repository.findStudentById(tenantId, studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.repository.findMany(
      tenantId,
      {
        studentId,
        courseId: query.courseId,
        status: query.status,
      },
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  async findById(tenantId: string, currentUser: any, id: string) {
    const application = await this.repository.findById(tenantId, id);

    if (!application) {
      throw new NotFoundException('Course application not found');
    }

    const isStudent = Boolean(currentUser?.isStudent);
    const studentId = currentUser?.studentId || currentUser?.id;

    if (isStudent && application.studentId !== studentId) {
      throw new ForbiddenException('Students can only access their own applications');
    }

    if (!isStudent) {
      await this.ensureAdminOrInstructor(tenantId, currentUser);
    }

    return application;
  }

  async updateStatus(
    tenantId: string,
    currentUser: any,
    id: string,
    dto: UpdateApplicationStatusDto,
  ) {
    await this.ensureAdminOrInstructor(tenantId, currentUser);

    const application = await this.repository.findById(tenantId, id);
    if (!application) {
      throw new NotFoundException('Course application not found');
    }

    if (dto.status === 'Rejected' && !dto.rejectionReason) {
      throw new BadRequestException('rejectionReason is required when status is Rejected');
    }

    return this.repository.updateStatus(tenantId, id, dto.status, dto.rejectionReason);
  }

  async delete(tenantId: string, currentUser: any, id: string) {
    await this.ensureAdminOrInstructor(tenantId, currentUser);

    const application = await this.repository.findById(tenantId, id);
    if (!application) {
      throw new NotFoundException('Course application not found');
    }

    return this.repository.deleteById(tenantId, id);
  }

  private ensureStudent(user: any) {
    if (!user?.isStudent) {
      throw new ForbiddenException('Only students can perform this action');
    }
  }

  private async ensureAdminOrInstructor(tenantId: string, user: any) {
    if (user?.isStudent) {
      throw new ForbiddenException('Students are not allowed to perform this action');
    }

    if (user?.isPlatformAdmin) {
      return;
    }

    const tenantUser = await this.repository.findTenantUserWithRole(tenantId, user?.id);
    if (!tenantUser) {
      throw new ForbiddenException('User not found for tenant');
    }

    const roleName = tenantUser.role?.name?.toLowerCase() || '';
    const isAllowedRole =
      tenantUser.role?.isAdmin || roleName.includes('admin') || roleName.includes('instructor');

    if (!isAllowedRole) {
      throw new ForbiddenException('Only admin or instructor can perform this action');
    }
  }
}
