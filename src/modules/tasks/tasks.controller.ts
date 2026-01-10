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
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks & Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create task' })
  createTask(@TenantId() tenantId: string, @Body() data: any) {
    return this.tasksService.createTask(tenantId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  getAllTasks(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.tasksService.getAllTasks(tenantId, paginationDto);
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Get tasks assigned to current user' })
  getMyTasks(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.tasksService.getTasksByUser(tenantId, user.id, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  getTaskById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.tasksService.getTaskById(tenantId, params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  updateTask(@TenantId() tenantId: string, @Param() params: IdParamDto, @Body() data: any) {
    return this.tasksService.updateTask(tenantId, params.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  deleteTask(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.tasksService.deleteTask(tenantId, params.id);
  }
}
