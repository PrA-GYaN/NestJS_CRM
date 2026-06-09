import { BadRequestException } from '@nestjs/common';
import { StaffTypeEnum } from './dto/staff.dto';

const ROLE_TO_STAFF_TYPE: Record<string, StaffTypeEnum> = {
  COUNSELOR: StaffTypeEnum.Counselor,
  ADMISSIONOFFICER: StaffTypeEnum.AdmissionOfficer,
  VISAOFFICER: StaffTypeEnum.VisaOfficer,
  DOCUMENTATIONOFFICER: StaffTypeEnum.DocumentationOfficer,
  FINANCEOFFICER: StaffTypeEnum.FinanceOfficer,
};

const NORMALIZED_STAFF_ROLES = new Set(
  Object.keys(ROLE_TO_STAFF_TYPE),
);

export class StaffTypeMapping {
  static getStaffType(roleName: string): StaffTypeEnum | null {
    const normalized = roleName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return ROLE_TO_STAFF_TYPE[normalized] || null;
  }

  static isStaffRole(roleName: string): boolean {
    const normalized = roleName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return NORMALIZED_STAFF_ROLES.has(normalized);
  }

  static validateStaffTypeRole(staffType: StaffTypeEnum, roleName: string): void {
    const expected = StaffTypeMapping.getStaffType(roleName);
    if (expected && expected !== staffType) {
      throw new BadRequestException(
        `Staff type "${staffType}" does not match the role "${roleName}". Expected "${expected}".`,
      );
    }
  }
}
