import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/common.dto';

export class WorkflowQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by active status (true = active only, false = inactive only)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
