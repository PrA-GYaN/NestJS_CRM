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
import { TasksService } from './tasks.service';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

@ApiTags('Tasks & Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @CanCreate('tasks')
  @ApiOperation({ summary: 'Create task' })
  createTask(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() data: any) {
    return this.tasksService.createTask(tenantId, data, user.id);
  }

  @Get()
  @CanRead('tasks')
  @ApiOperation({ summary: 'Get all tasks' })
  getAllTasks(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.tasksService.getAllTasks(tenantId, paginationDto);
  }

  @Get('my-tasks')
  @CanRead('tasks')
  @ApiOperation({ summary: 'Get tasks assigned to current user' })
  getMyTasks(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.tasksService.getTasksByUser(tenantId, user.id, paginationDto);
  }

  @Get('overdue')
  @CanRead('tasks')
  @ApiOperation({ summary: 'Get all overdue tasks (SUPERADMIN only)' })
  getOverdueTasks(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.tasksService.findOverdueTasks(tenantId, paginationDto);
  }

  @Post('notify-overdue')
  @CanRead('tasks')
  @ApiOperation({ summary: 'Notify SUPERADMIN users about overdue tasks' })
  notifyOverdueTasks(@TenantId() tenantId: string) {
    return this.tasksService.notifySuperAdminsAboutOverdueTasks(tenantId);
  }

  @Get(':id')
  @CanRead('tasks')
  @ApiOperation({ summary: 'Get task by ID' })
  getTaskById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.tasksService.getTaskById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('tasks')
  @ApiOperation({ summary: 'Update task' })
  updateTask(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() data: any,
  ) {
    return this.tasksService.updateTask(tenantId, params.id, data, user.id);
  }

  @Delete(':id')
  @CanDelete('tasks')
  @ApiOperation({ summary: 'Delete task' })
  deleteTask(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.tasksService.deleteTask(tenantId, params.id, user.id);
  }
}
