import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowStepDto } from './create-workflow-step.dto';

export class UpdateWorkflowStepDto extends PartialType(CreateWorkflowStepDto) {}
