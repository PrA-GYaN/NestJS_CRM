import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CanDelete, CanRead, CanUpdate } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourseApplicationsService } from './course-applications.service';
import {
	ApplicationsQueryDto,
	CreateCourseApplicationDto,
	StudentApplicationsQueryDto,
	UpdateApplicationStatusDto,
} from './dto/course-application.dto';

@ApiTags('Course Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('course-applications')
export class CourseApplicationsController {
	constructor(private readonly courseApplicationsService: CourseApplicationsService) {}

	@Post()
	@ApiOperation({ summary: 'Create course application (student only)' })
	@ApiResponse({ status: 201, description: 'Course application created successfully' })
	@ApiResponse({ status: 403, description: 'Only students can create applications' })
	@ApiResponse({ status: 404, description: 'Student or course not found' })
	@ApiResponse({ status: 409, description: 'Duplicate application exists for this student and course' })
	create(
		@TenantId() tenantId: string,
		@CurrentUser() user: any,
		@Body() dto: CreateCourseApplicationDto,
	) {
		return this.courseApplicationsService.create(tenantId, user, dto);
	}

	@Get()
	@CanRead('course-applications')
	@ApiOperation({ summary: 'Get all course applications (admin/instructor)' })
	@ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Only admin or instructor can view all applications' })
	findAll(@TenantId() tenantId: string, @CurrentUser() user: any, @Query() query: StudentApplicationsQueryDto) {
		return this.courseApplicationsService.findAllForAdmin(tenantId, user, query);
	}

	@Get('my')
	@ApiOperation({ summary: 'Get my course applications (student only)' })
	@ApiResponse({ status: 200, description: 'Student applications retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Only students can access this endpoint' })
	findMine(@TenantId() tenantId: string, @CurrentUser() user: any, @Query() query: ApplicationsQueryDto) {
		return this.courseApplicationsService.findMine(tenantId, user, query);
	}

	@Get('students/:studentId')
	@CanRead('course-applications')
	@ApiOperation({ summary: 'Get applications by student ID (admin/instructor)' })
	@ApiResponse({ status: 200, description: 'Student applications retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Only admin or instructor can access this endpoint' })
	@ApiResponse({ status: 404, description: 'Student not found' })
	findByStudentId(
		@TenantId() tenantId: string,
		@CurrentUser() user: any,
		@Param('studentId', new ParseUUIDPipe()) studentId: string,
		@Query() query: ApplicationsQueryDto,
	) {
		return this.courseApplicationsService.findByStudentId(tenantId, user, studentId, query);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get application by ID (student owner or admin/instructor)' })
	@ApiResponse({ status: 200, description: 'Application retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Not authorized to view this application' })
	@ApiResponse({ status: 404, description: 'Application not found' })
	findById(
		@TenantId() tenantId: string,
		@CurrentUser() user: any,
		@Param('id', new ParseUUIDPipe()) id: string,
	) {
		return this.courseApplicationsService.findById(tenantId, user, id);
	}

	@Patch(':id/status')
	@CanUpdate('course-applications')
	@ApiOperation({ summary: 'Approve or reject application (admin/instructor)' })
	@ApiResponse({ status: 200, description: 'Application status updated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid status or rejection reason' })
	@ApiResponse({ status: 403, description: 'Only admin or instructor can update status' })
	@ApiResponse({ status: 404, description: 'Application not found' })
	updateStatus(
		@TenantId() tenantId: string,
		@CurrentUser() user: any,
		@Param('id', new ParseUUIDPipe()) id: string,
		@Body() dto: UpdateApplicationStatusDto,
	) {
		return this.courseApplicationsService.updateStatus(tenantId, user, id, dto);
	}

	@Delete(':id')
	@CanDelete('course-applications')
	@ApiOperation({ summary: 'Delete course application (admin/instructor)' })
	@ApiResponse({ status: 200, description: 'Application deleted successfully' })
	@ApiResponse({ status: 403, description: 'Only admin or instructor can delete applications' })
	@ApiResponse({ status: 404, description: 'Application not found' })
	delete(
		@TenantId() tenantId: string,
		@CurrentUser() user: any,
		@Param('id', new ParseUUIDPipe()) id: string,
	) {
		return this.courseApplicationsService.delete(tenantId, user, id);
	}
}
