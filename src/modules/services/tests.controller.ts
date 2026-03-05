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
import { TestsService } from './tests.service';
import {
  CreateTestDto,
  UpdateTestDto,
  AssignTestToStudentDto,
  UpdateTestAssignmentDto,
} from './dto/test.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tests')
export class TestsController {
  constructor(private testsService: TestsService) {}

  @Post()
  @CanCreate('services')
  @ApiOperation({ summary: 'Create a new test' })
  @ApiResponse({ status: 201, description: 'Test created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createTest(@TenantId() tenantId: string, @Body() dto: CreateTestDto) {
    return this.testsService.createTest(tenantId, dto);
  }

  @Get()
  @CanRead('services')
  @ApiOperation({ summary: 'Get all tests with pagination' })
  @ApiResponse({ status: 200, description: 'Tests retrieved successfully' })
  getAllTests(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.testsService.getAllTests(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('services')
  @ApiOperation({ summary: 'Get test by ID' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  @ApiResponse({ status: 200, description: 'Test retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  getTestById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.testsService.getTestById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('services')
  @ApiOperation({ summary: 'Update test' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  @ApiResponse({ status: 200, description: 'Test updated successfully' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  updateTest(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: UpdateTestDto,
  ) {
    return this.testsService.updateTest(tenantId, params.id, dto);
  }

  @Delete(':id')
  @CanDelete('services')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete test' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  @ApiResponse({ status: 200, description: 'Test deleted successfully' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  deleteTest(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.testsService.deleteTest(tenantId, params.id);
  }

  @Post(':id/assign')
  @CanCreate('services')
  @ApiOperation({ summary: 'Assign a test to a student' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  @ApiResponse({ status: 201, description: 'Test assigned to student successfully' })
  @ApiResponse({ status: 404, description: 'Test or student not found' })
  @ApiResponse({ status: 409, description: 'Test already assigned to this student' })
  assignTestToStudent(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: AssignTestToStudentDto,
  ) {
    return this.testsService.assignTestToStudent(tenantId, params.id, dto);
  }

  @Put('assignments/:assignmentId')
  @CanUpdate('services')
  @ApiOperation({ summary: 'Update test assignment (score / status)' })
  @ApiParam({ name: 'assignmentId', description: 'Test Assignment ID' })
  @ApiResponse({ status: 200, description: 'Test assignment updated successfully' })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
  updateTestAssignment(
    @TenantId() tenantId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateTestAssignmentDto,
  ) {
    return this.testsService.updateTestAssignment(tenantId, assignmentId, dto);
  }

  @Delete('assignments/:assignmentId')
  @CanDelete('services')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a test assignment' })
  @ApiParam({ name: 'assignmentId', description: 'Test Assignment ID' })
  @ApiResponse({ status: 200, description: 'Test assignment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
  deleteTestAssignment(
    @TenantId() tenantId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.testsService.deleteTestAssignment(tenantId, assignmentId);
  }

  @Get(':id/assignments')
  @CanRead('services')
  @ApiOperation({ summary: 'Get all student assignments for a test' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  getTestAssignments(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.testsService.getTestAssignments(tenantId, params.id, paginationDto);
  }
}
