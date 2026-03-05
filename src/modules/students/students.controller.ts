import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto, UploadDocumentDto, AssignCounselorDto } from './dto/students.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CanCreate, CanRead, CanUpdate, CanDelete, RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Student Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Post()
  @CanCreate('students')
  @ApiOperation({
    summary: 'Create new student',
    description: 'Creates a new student record in the tenant database. Optionally link to an existing Lead via `leadId`. Requires `students:create` permission.',
  })
  @ApiBody({ type: CreateStudentDto })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or duplicate email' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  createStudent(@TenantId() tenantId: string, @Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.createStudent(tenantId, createStudentDto);
  }

  @Get()
  @CanRead('students')
  @ApiOperation({
    summary: 'Get all students',
    description: 'Returns a paginated list of all students in the tenant. Supports `page` and `limit` query parameters.',
  })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  getAllStudents(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.studentsService.getAllStudents(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('students')
  @ApiOperation({
    summary: 'Get student by ID',
    description: 'Returns full student details including academic records, test scores, and identification documents.',
  })
  @ApiResponse({ status: 200, description: 'Student retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.getStudentById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('students')
  @ApiOperation({
    summary: 'Update student',
    description: 'Updates a student record. Supports partial updates — only include fields you want to change.',
  })
  @ApiBody({ type: UpdateStudentDto })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  updateStudent(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.updateStudent(tenantId, params.id, updateStudentDto);
  }

  @Delete(':id')
  @CanDelete('students')
  @ApiOperation({
    summary: 'Delete student',
    description: 'Permanently deletes a student record and all associated data. This action is irreversible.',
  })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  deleteStudent(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.deleteStudent(tenantId, params.id);
  }

  @Post(':id/documents')
  @RequirePermissions('students:manage-documents')
  @ApiOperation({
    summary: 'Upload student document',
    description: 'Attaches a document record to the student. The file should first be uploaded via `POST /files/upload`, then the returned path used here. Requires `students:manage-documents` permission.',
  })
  @ApiBody({ type: UploadDocumentDto })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  uploadDocument(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    return this.studentsService.uploadDocument(tenantId, params.id, uploadDocumentDto);
  }

  @Get(':id/documents')
  @CanRead('students')
  @ApiOperation({
    summary: 'Get student documents',
    description: 'Returns all documents associated with a student.',
  })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentDocuments(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.getStudentDocuments(tenantId, params.id);
  }

  @Put(':id/assign-counselor')
  @CanUpdate('students')
  @ApiOperation({
    summary: 'Assign a Counselor to a student',
    description:
      'Assigns a staff member with the Counselor role to a student. Only Admin users can call this endpoint.',
  })
  @ApiBody({ type: AssignCounselorDto })
  @ApiResponse({ status: 200, description: 'Counselor assigned successfully' })
  @ApiResponse({ status: 400, description: 'Staff member does not have Counselor role' })
  @ApiResponse({ status: 403, description: 'Only Admin users can assign counselors' })
  @ApiResponse({ status: 404, description: 'Student or staff member not found' })
  assignCounselor(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() dto: AssignCounselorDto,
  ) {
    // Only Admin users may assign or change a student's counselor
    if (!user?.isAdmin && user?.roleName !== 'Admin') {
      throw new ForbiddenException('Only Admin users can assign a counselor to a student');
    }
    return this.studentsService.assignCounselor(tenantId, params.id, dto);
  }
}
