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
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Student Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new student' })
  createStudent(@TenantId() tenantId: string, @Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.createStudent(tenantId, createStudentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all students' })
  getAllStudents(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.studentsService.getAllStudents(tenantId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  getStudentById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.getStudentById(tenantId, params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update student' })
  updateStudent(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.updateStudent(tenantId, params.id, updateStudentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete student' })
  deleteStudent(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.deleteStudent(tenantId, params.id);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload student document' })
  uploadDocument(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    return this.studentsService.uploadDocument(tenantId, params.id, uploadDocumentDto);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get student documents' })
  getStudentDocuments(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentsService.getStudentDocuments(tenantId, params.id);
  }
}
