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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import {
  CreateClassDto,
  UpdateClassDto,
  EnrollStudentInClassDto,
  UpdateEnrollmentStatusDto,
} from './dto/class.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('classes')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Post()
  @CanCreate('services')
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createClass(@TenantId() tenantId: string, @Body() dto: CreateClassDto) {
    return this.classesService.createClass(tenantId, dto);
  }

  @Get()
  @CanRead('services')
  @ApiOperation({ summary: 'Get all classes with pagination' })
  @ApiResponse({ status: 200, description: 'Classes retrieved successfully' })
  getAllClasses(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.classesService.getAllClasses(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('services')
  @ApiOperation({ summary: 'Get class by ID' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  getClassById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.classesService.getClassById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('services')
  @ApiOperation({ summary: 'Update class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  updateClass(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.updateClass(tenantId, params.id, dto);
  }

  @Delete(':id')
  @CanDelete('services')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  deleteClass(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.classesService.deleteClass(tenantId, params.id);
  }

  @Post(':id/enroll')
  @CanCreate('services')
  @ApiOperation({ summary: 'Enroll a student in a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 201, description: 'Student enrolled successfully' })
  @ApiResponse({ status: 404, description: 'Class or student not found' })
  @ApiResponse({ status: 409, description: 'Student already enrolled in this class' })
  enrollStudent(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: EnrollStudentInClassDto,
  ) {
    return this.classesService.enrollStudent(tenantId, params.id, dto);
  }

  @Put(':id/students/:studentId/status')
  @CanUpdate('services')
  @ApiOperation({ summary: 'Update enrollment status for a student in a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Enrollment status updated successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  updateEnrollmentStatus(
    @TenantId() tenantId: string,
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateEnrollmentStatusDto,
  ) {
    return this.classesService.updateEnrollmentStatus(tenantId, classId, studentId, dto);
  }

  @Delete(':id/students/:studentId')
  @CanDelete('services')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unenroll a student from a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student unenrolled successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  unenrollStudent(
    @TenantId() tenantId: string,
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.unenrollStudent(tenantId, classId, studentId);
  }

  @Get(':id/students')
  @CanRead('services')
  @ApiOperation({ summary: 'Get all students enrolled in a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  getClassStudents(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.classesService.getClassStudents(tenantId, params.id, paginationDto);
  }
}
