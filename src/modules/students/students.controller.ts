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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto, UploadDocumentDto } from './dto/students.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CanCreate, CanRead, CanUpdate, CanDelete, RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Student Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Post()
  @CanCreate('students')
  @ApiOperation({ summary: 'Create new student' })
  createStudent(@TenantId() tenantId: string, @Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.createStudent(tenantId, createStudentDto);
  }

  @Get()
  @CanRead('students')
  @ApiOperation({ summary: 'Get all students' })
  getAllStudents(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.studentsService.getAllStudents(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('students')
  @ApiOperation({ summary: 'Get student by ID' })
  getStudentById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.getStudentById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('students')
  @ApiOperation({ summary: 'Update student' })
  updateStudent(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.updateStudent(tenantId, params.id, updateStudentDto);
  }

  @Delete(':id')
  @CanDelete('students')
  @ApiOperation({ summary: 'Delete student' })
  deleteStudent(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.deleteStudent(tenantId, params.id);
  }

  @Post(':id/documents')
  @RequirePermissions('students:manage-documents')
  @ApiOperation({ summary: 'Upload student document' })
  uploadDocument(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    return this.studentsService.uploadDocument(tenantId, params.id, uploadDocumentDto);
  }

  @Get(':id/documents')
  @CanRead('students')
  @ApiOperation({ summary: 'Get student documents' })
  getStudentDocuments(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.getStudentDocuments(tenantId, params.id);
  }
}
