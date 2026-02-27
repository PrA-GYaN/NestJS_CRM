import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
  BulkWorkingHoursDto,
  WorkingHoursQueryDto,
  DayOfWeekEnum,
} from './dto/working-hours.dto';

@Injectable()
export class WorkingHoursService {
  constructor(private tenantService: TenantService) {}

  /**
   * Create working hours for a specific day
   */
  async create(tenantId: string, createDto: CreateWorkingHoursDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Validate times if office is open
    if (createDto.isOpen) {
      if (!createDto.openTime || !createDto.closeTime) {
        throw new BadRequestException(
          'openTime and closeTime are required when isOpen is true',
        );
      }

      if (createDto.openTime >= createDto.closeTime) {
        throw new BadRequestException('openTime must be before closeTime');
      }
    }

    // Check if working hours for this day already exist
    const existing = await tenantPrisma.tenantWorkingHours.findUnique({
      where: {
        tenantId_dayOfWeek: {
          tenantId,
          dayOfWeek: createDto.dayOfWeek,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Working hours for ${createDto.dayOfWeek} already exist. Use update instead.`,
      );
    }

    return tenantPrisma.tenantWorkingHours.create({
      data: {
        tenantId,
        dayOfWeek: createDto.dayOfWeek,
        isOpen: createDto.isOpen,
        openTime: createDto.openTime ?? undefined,
        closeTime: createDto.closeTime ?? undefined,
        timezone: createDto.timezone,
      },
    });
  }

  /**
   * Get all working hours for a tenant
   */
  async findAll(tenantId: string, queryDto?: WorkingHoursQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = {
      tenantId,
      isActive: true,
    };

    if (queryDto?.dayOfWeek) {
      where.dayOfWeek = queryDto.dayOfWeek;
    }

    if (queryDto?.isOpen !== undefined) {
      where.isOpen = queryDto.isOpen;
    }

    return tenantPrisma.tenantWorkingHours.findMany({
      where,
      orderBy: [
        {
          dayOfWeek: 'asc',
        },
      ],
    });
  }

  /**
   * Get working hours for a specific day
   */
  async findByDay(tenantId: string, dayOfWeek: DayOfWeekEnum) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const workingHours = await tenantPrisma.tenantWorkingHours.findFirst({
      where: {
        tenantId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!workingHours) {
      throw new NotFoundException(
        `Working hours for ${dayOfWeek} not found`,
      );
    }

    return workingHours;
  }

  /**
   * Get working hours by ID
   */
  async findOne(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const workingHours = await tenantPrisma.tenantWorkingHours.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!workingHours) {
      throw new NotFoundException('Working hours not found');
    }

    return workingHours;
  }

  /**
   * Update working hours
   */
  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateWorkingHoursDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify working hours exist and belong to tenant
    await this.findOne(tenantId, id);

    // Validate times if provided
    if (updateDto.openTime && updateDto.closeTime) {
      if (updateDto.openTime >= updateDto.closeTime) {
        throw new BadRequestException('openTime must be before closeTime');
      }
    }

    // If setting isOpen to true, ensure times are provided
    if (updateDto.isOpen === true) {
      const current = await this.findOne(tenantId, id);
      const openTime = updateDto.openTime || current.openTime;
      const closeTime = updateDto.closeTime || current.closeTime;

      if (!openTime || !closeTime) {
        throw new BadRequestException(
          'openTime and closeTime are required when isOpen is true',
        );
      }
    }

    return tenantPrisma.tenantWorkingHours.update({
      where: { id },
      data: updateDto,
    });
  }

  /**
   * Bulk create/update working hours for all days
   */
  async bulkUpsert(tenantId: string, bulkDto: BulkWorkingHoursDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const scheduleItem of bulkDto.schedule) {
      try {
        // Validate times if office is open
        if (scheduleItem.isOpen) {
          if (!scheduleItem.openTime || !scheduleItem.closeTime) {
            results.errors.push(
              `${scheduleItem.dayOfWeek}: openTime and closeTime required when isOpen is true`,
            );
            continue;
          }

          if (scheduleItem.openTime >= scheduleItem.closeTime) {
            results.errors.push(
              `${scheduleItem.dayOfWeek}: openTime must be before closeTime`,
            );
            continue;
          }
        }

        // Check if exists
        const existing = await tenantPrisma.tenantWorkingHours.findUnique({
          where: {
            tenantId_dayOfWeek: {
              tenantId,
              dayOfWeek: scheduleItem.dayOfWeek,
            },
          },
        });

        if (existing) {
          // Update
          await tenantPrisma.tenantWorkingHours.update({
            where: { id: existing.id },
            data: {
              ...scheduleItem,
              timezone: bulkDto.timezone,
            },
          });
          results.updated++;
        } else {
          // Create
          await tenantPrisma.tenantWorkingHours.create({
            data: {
              tenantId,
              dayOfWeek: scheduleItem.dayOfWeek,
              isOpen: scheduleItem.isOpen,
              openTime: scheduleItem.openTime ?? undefined,
              closeTime: scheduleItem.closeTime ?? undefined,
              timezone: bulkDto.timezone,
            },
          });
          results.created++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(
          `${scheduleItem.dayOfWeek}: ${errorMessage}`,
        );
      }
    }

    return results;
  }

  /**
   * Delete working hours (soft delete by setting isActive to false)
   */
  async remove(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify working hours exist and belong to tenant
    await this.findOne(tenantId, id);

    return tenantPrisma.tenantWorkingHours.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Check if a given time is within working hours
   * @param tenantId Tenant ID
   * @param date Date to check (in tenant's timezone)
   * @param time Time to check in HH:MM format
   * @param dayOfWeek Day of week
   * @returns boolean indicating if time is within working hours
   */
  async isWithinWorkingHours(
    tenantId: string,
    dayOfWeek: DayOfWeekEnum,
    time: string,
  ): Promise<{ isWithin: boolean; workingHours?: any }> {
    try {
      const workingHours = await this.findByDay(tenantId, dayOfWeek);

      if (!workingHours.isOpen || !workingHours.openTime || !workingHours.closeTime) {
        return { isWithin: false, workingHours };
      }

      const isWithin =
        time >= workingHours.openTime && time < workingHours.closeTime;

      return { isWithin, workingHours };
    } catch (error) {
      // No working hours defined for this day
      return { isWithin: false };
    }
  }

  /**
   * Get timezone for tenant
   */
  async getTenantTimezone(tenantId: string): Promise<string> {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Get timezone from any working hours record (they should all be the same)
    const workingHours = await tenantPrisma.tenantWorkingHours.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        timezone: true,
      },
    });

    return workingHours?.timezone || 'UTC';
  }
}
