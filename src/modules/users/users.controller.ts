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
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateRoleDto,
  AssignPermissionsDto,
} from './dto/users.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Users & Access Control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  createUser(@TenantId() tenantId: string, @Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(tenantId, createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  getAllUsers(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.usersService.getAllUsers(tenantId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  getUserById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.usersService.getUserById(tenantId, params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  updateUser(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(tenantId, params.id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  deleteUser(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.usersService.deleteUser(tenantId, params.id);
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create new role' })
  createRole(@TenantId() tenantId: string, @Body() createRoleDto: CreateRoleDto) {
    return this.usersService.createRole(tenantId, createRoleDto);
  }

  @Get('roles/list')
  @ApiOperation({ summary: 'Get all roles' })
  getAllRoles(@TenantId() tenantId: string) {
    return this.usersService.getAllRoles(tenantId);
  }

  @Post('roles/:id/permissions')
  @ApiOperation({ summary: 'Assign permissions to role' })
  assignPermissions(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.usersService.assignPermissions(tenantId, params.id, dto);
  }
}
