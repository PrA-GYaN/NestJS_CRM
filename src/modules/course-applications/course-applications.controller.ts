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
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
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
	CourseApplicationResponseDto,
	CreateCourseApplicationDto,
	DeleteCourseApplicationResponseDto,
	PaginatedCourseApplicationsResponseDto,
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
	@ApiOperation({
		summary: 'Create course application (student only)',
		description: 'Create a new course application for the authenticated student user.',
	})
	@ApiBody({ type: CreateCourseApplicationDto })
	@ApiResponse({ status: 201, description: 'Course application created successfully', type: CourseApplicationResponseDto })
	@ApiResponse({ status: 400, description: 'Bad request - Invalid payload or validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
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
	@ApiOperation({ 
		summary: 'Get all course applications (admin/instructor)',
		description: 'Get all course applications with optional filtering. Required permission: course-applications:read'
	})
	@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
	@ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Accepted', 'Rejected'], description: 'Filter by application status' })
	@ApiQuery({ name: 'courseId', required: false, type: String, description: 'Filter by course ID (UUID)' })
	@ApiQuery({ name: 'studentId', required: false, type: String, description: 'Filter by student ID (UUID)' })
	@ApiResponse({ status: 200, description: 'Applications retrieved successfully', type: PaginatedCourseApplicationsResponseDto })
	@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
	@ApiResponse({ status: 403, description: 'Forbidden - Requires course-applications:read permission' })
	findAll(@TenantId() tenantId: string, @CurrentUser() user: any, @Query() query: StudentApplicationsQueryDto) {
		return this.courseApplicationsService.findAllForAdmin(tenantId, user, query);
	}

	@Get('my')
	@ApiOperation({
		summary: 'Get my course applications (student only)',
		description: 'Retrieve paginated course applications for the authenticated student.',
	})
	@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
	@ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Accepted', 'Rejected'], description: 'Filter by application status' })
	@ApiQuery({ name: 'courseId', required: false, type: String, description: 'Filter by course ID (UUID)' })
	@ApiResponse({ status: 200, description: 'Student applications retrieved successfully', type: PaginatedCourseApplicationsResponseDto })
	@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
	@ApiResponse({ status: 403, description: 'Only students can access this endpoint' })
	findMine(@TenantId() tenantId: string, @CurrentUser() user: any, @Query() query: ApplicationsQueryDto) {
		return this.courseApplicationsService.findMine(tenantId, user, query);
	}

	@Get('students/:studentId')
	@CanRead('course-applications')
	@ApiOperation({ 
		summary: 'Get applications by student ID (admin/instructor)',
		description: 'Retrieve all course applications for a specific student. Required permission: course-applications:read'
	})
	@ApiParam({ name: 'studentId', type: String, description: 'Student ID (UUID)' })
	@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
	@ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Accepted', 'Rejected'], description: 'Filter by application status' })
	@ApiQuery({ name: 'courseId', required: false, type: String, description: 'Filter by course ID (UUID)' })
	@ApiResponse({ status: 200, description: 'Student applications retrieved successfully', type: PaginatedCourseApplicationsResponseDto })
	@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
	@ApiResponse({ status: 403, description: 'Forbidden - Requires course-applications:read permission' })
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
	@ApiOperation({
		summary: 'Get application by ID (student owner or admin/instructor)',
		description: 'Retrieve a specific course application by ID. Students can only access their own application.',
	})
	@ApiParam({ name: 'id', type: String, description: 'Course application ID (UUID)' })
	@ApiResponse({ status: 200, description: 'Application retrieved successfully', type: CourseApplicationResponseDto })
	@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
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
	@ApiOperation({ 
		summary: 'Approve or reject application (admin/instructor)',
		description: 'Update the status of a specific course application. Required permission: course-applications:update'
	})
	@ApiParam({ name: 'id', type: String, description: 'Course application ID (UUID)' })
	@ApiBody({ type: UpdateApplicationStatusDto })
	@ApiResponse({ status: 200, description: 'Application status updated successfully', type: CourseApplicationResponseDto })
	@ApiResponse({ status: 400, description: 'Invalid status or rejection reason' })
	@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
	@ApiResponse({ status: 403, description: 'Forbidden - Requires course-applications:update permission' })
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
	@ApiOperation({
		summary: 'Delete course application (admin/instructor)',
		description: 'Delete a course application by ID. Required permission: course-applications:delete',
	})
	@ApiParam({ name: 'id', type: String, description: 'Course application ID (UUID)' })
	@ApiResponse({ status: 200, description: 'Application deleted successfully', type: DeleteCourseApplicationResponseDto })
	@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
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
