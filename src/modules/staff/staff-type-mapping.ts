import { BadRequestException } from '@nestjs/common';
import { StaffTypeEnum } from './dto/staff.dto';

const STAFF_TYPE_ROLE_MAP: Record<StaffTypeEnum, string[]> = {
  [StaffTypeEnum.Counselor]: ['Counselor'],
  [StaffTypeEnum.AdmissionOfficer]: ['Admission Officer', 'AdmissionOfficer'],
  [StaffTypeEnum.VisaOfficer]: ['Visa Officer', 'VisaOfficer'],
  [StaffTypeEnum.DocumentationOfficer]: ['Documentation Officer', 'DocumentationOfficer'],
  [StaffTypeEnum.FinanceOfficer]: ['Finance Officer', 'FinanceOfficer'],
  [StaffTypeEnum.Other]: [],
};

export class StaffTypeMapping {
  static isRoleAllowedForStaffType(
    staffType: StaffTypeEnum,
    roleName: string,
  ): boolean {
    const allowedRoles = STAFF_TYPE_ROLE_MAP[staffType];
    if (!allowedRoles) return false;
    if (allowedRoles.length === 0) return true;
    return allowedRoles.some(
      (allowed) => allowed.toLowerCase() === roleName.toLowerCase(),
    );
  }

  static validateStaffTypeRole(
    staffType: StaffTypeEnum,
    roleName: string,
  ): void {
    if (!StaffTypeMapping.isRoleAllowedForStaffType(staffType, roleName)) {
      throw new BadRequestException(
        `StaffType "${staffType}" is not compatible with role "${roleName}". ` +
        `Allowed role(s) for ${staffType}: ${(STAFF_TYPE_ROLE_MAP[staffType] || []).join(', ') || 'any'}`,
      );
    }
  }

  static getAllowedRolesForStaffType(staffType: StaffTypeEnum): string[] {
    return STAFF_TYPE_ROLE_MAP[staffType] || [];
  }
}
