import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  UploadDocumentDto,
  UpdateStudentDocumentDto,
  AssignCounselorDto,
} from './dto/students.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
  RequirePermissions,
} from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserScopes } from '../../common/decorators/user-scopes.decorator';

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
    description:
      'Creates a new student record in the tenant database. Optionally link to an existing Lead via `leadId`. Requires `students:create` permission.',
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
    description:
      'Returns a paginated list of all students in the tenant. Supports `page` and `limit` query parameters.',
  })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  getAllStudents(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @UserScopes() userScopes: Record<string, string>,
    @Query() paginationDto: PaginationDto,
  ) {
    const scope = userScopes['students'] || userScopes['__all__'] || 'own';
    return this.studentsService.getAllStudents(tenantId, paginationDto, user.id, scope);
  }

  @Get(':id')
  @CanRead('students')
  @ApiOperation({
    summary: 'Get student by ID',
    description:
      'Returns full student details including academic records, test scores, and identification documents.',
  })
  @ApiResponse({ status: 200, description: 'Student retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentById(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @UserScopes() userScopes: Record<string, string>,
    @Param() params: IdParamDto,
  ) {
    const scope = userScopes['students'] || userScopes['__all__'] || 'own';
    return this.studentsService.getStudentById(tenantId, params.id, user.id, scope);
  }

  @Put(':id')
  @CanUpdate('students')
  @ApiOperation({
    summary: 'Update student',
    description:
      'Updates a student record. Supports partial updates — only include fields you want to change.',
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
    description:
      'Permanently deletes a student record and all associated data. This action is irreversible.',
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
    description:
      'Attaches a document record to the student. The file should first be uploaded via `POST /files/upload`, then the returned path used here. Requires `students:manage-documents` permission.',
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

  @Delete(':id/documents/:documentId')
  @RequirePermissions('students:manage-documents')
  @ApiOperation({
    summary: 'Delete student document',
    description:
      'Deletes a student document end-to-end by removing the document record, linked file records, and physical file(s) from storage.',
  })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student or document not found' })
  @ApiResponse({ status: 500, description: 'Document records deleted but storage cleanup failed' })
  deleteStudentDocument(
    @TenantId() tenantId: string,
    @Param('id') studentId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.studentsService.deleteStudentDocument(tenantId, studentId, documentId);
  }

  @Patch(':id/documents/:documentId')
  @RequirePermissions('students:manage-documents')
  @ApiOperation({
    summary: 'Update student document record',
    description:
      'Partially or fully updates an existing student document record (metadata, verification, file details) without requiring file re-upload.',
  })
  @ApiBody({ type: UpdateStudentDocumentDto })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload or no update fields provided' })
  @ApiResponse({ status: 404, description: 'Student or document not found' })
  updateStudentDocument(
    @TenantId() tenantId: string,
    @Param('id') studentId: string,
    @Param('documentId') documentId: string,
    @Body() updateDocumentDto: UpdateStudentDocumentDto,
  ) {
    return this.studentsService.updateStudentDocument(
      tenantId,
      studentId,
      documentId,
      updateDocumentDto,
    );
  }

  @Put(':id/assign-counselor')
  @RequirePermissions('students:assign-counselor')
  @ApiOperation({
    summary: 'Assign a Counselor to a student',
    description:
      'Assigns a staff member with the Counselor role to a student. ' +
      'Requires the `students:assign-counselor` permission. ' +
      'Grant this permission to any role via the Role & Permission management API — no code changes needed.',
  })
  @ApiBody({ type: AssignCounselorDto })
  @ApiResponse({ status: 200, description: 'Counselor assigned successfully' })
  @ApiResponse({ status: 400, description: 'Staff member does not have Counselor role' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — requires students:assign-counselor',
  })
  @ApiResponse({ status: 404, description: 'Student or staff member not found' })
  assignCounselor(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: AssignCounselorDto,
  ) {
    return this.studentsService.assignCounselor(tenantId, params.id, dto);
  }
}
