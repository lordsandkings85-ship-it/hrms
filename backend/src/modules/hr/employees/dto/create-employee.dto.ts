import { IsArray, IsEmail, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentInfoDto {
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() payeeName?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() branchCode?: string;
  @IsOptional() @IsString() branchName?: string;
  @IsOptional() @IsString() branchPhone?: string;
  @IsOptional() @IsString() accountNo?: string;
  @IsOptional() @IsString() accountType?: string;
  @IsOptional() @IsString() routingCode?: string;
  @IsOptional() @IsString() bsbCode?: string;
  @IsOptional() @IsString() ifscCode?: string;
}

export class ContactInfoDto {
  @IsOptional() @IsString() currentAddress?: string;
  @IsOptional() @IsString() currentCountry?: string;
  @IsOptional() @IsString() currentDistrict?: string;
  @IsOptional() @IsString() currentTaluka?: string;
  @IsOptional() @IsString() currentPost?: string;
  @IsOptional() @IsString() currentPhoneNo?: string;
  @IsOptional() @IsString() currentPersonalEmail?: string;
  @IsOptional() @IsString() currentState?: string;
  @IsOptional() @IsString() currentCity?: string;
  @IsOptional() @IsString() currentVillage?: string;
  @IsOptional() @IsString() currentPostCode?: string;
  @IsOptional() @IsString() currentMobileNo?: string;
  @IsOptional() isPermanentSameAsCurrent?: boolean;
  @IsOptional() @IsString() permanentAddress?: string;
  @IsOptional() @IsString() permanentCountry?: string;
  @IsOptional() @IsString() permanentDistrict?: string;
  @IsOptional() @IsString() permanentTaluka?: string;
  @IsOptional() @IsString() permanentPost?: string;
  @IsOptional() @IsString() permanentPhoneNo?: string;
  @IsOptional() @IsString() permanentState?: string;
  @IsOptional() @IsString() permanentCity?: string;
  @IsOptional() @IsString() permanentVillage?: string;
  @IsOptional() @IsString() permanentPostCode?: string;
  @IsOptional() @IsString() permanentMobileNo?: string;
}

export class AdminInfoDto {
  @IsOptional() @IsString() salaryOn?: string;
  @IsOptional() ptApplicable?: boolean;
  @IsOptional() esicApplicable?: boolean;
  @IsOptional() @IsString() esiNo?: string;
  @IsOptional() pfAsPerGovt?: boolean;
  @IsOptional() pfOnTotalBasic?: boolean;
  @IsOptional() employerPfAsPerGovt?: boolean;
  @IsOptional() pensionNotApplicable?: boolean;
  @IsOptional() @IsString() otApplicable?: string;
  @IsOptional() attendancePolicy?: boolean;
  @IsOptional() @IsString() rfidCardNo?: string;
  @IsOptional() @IsString() resignationNoticePeriod?: string;
  @IsOptional() geoTagging?: boolean;
  @IsOptional() tdsApplicable?: boolean;
  @IsOptional() compOffApplicable?: boolean;
  @IsOptional() employerEsicApplicable?: boolean;
  @IsOptional() @IsString() vpfPercentage?: string;
  @IsOptional() @IsString() pfNo?: string;
  @IsOptional() @IsString() uan?: string;
  @IsOptional() employerPfOnTotalBasic?: boolean;
  @IsOptional() gratuityApplicable?: boolean;
  @IsOptional() @IsString() gratuityNo?: string;
  @IsOptional() @IsString() aadhaarCardNo?: string;
  @IsOptional() @IsString() fingerPrintId?: string;
  @IsOptional() @IsString() voterCardNo?: string;
}

export class PersonalInfoDto {
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() religion?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() drivingLicenseNo?: string;
  @IsOptional() @IsString() panNo?: string;
  @IsOptional() @IsString() height?: string;
  @IsOptional() @IsString() weight?: string;
  @IsOptional() @IsString() identificationMark?: string;
  @IsOptional() @IsString() nomineeName?: string;
  @IsOptional() @IsString() nss?: string;
  @IsOptional() @IsString() relationship?: string;
}

export class FamilyMemberDto {
  @IsOptional() @IsString() id?: string;
  @IsString() relation: string;
  @IsString() name: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsISO8601() birthDate?: string;
}

export class EmergencyContactDto {
  @IsOptional() @IsString() id?: string;
  @IsString() name: string;
  @IsOptional() @IsString() address?: string;
  @IsString() mobileNo: string;
  @IsOptional() @IsString() telNo?: string;
}

export class ExperienceInfoDto {
  @IsOptional() @IsString() id?: string;
  @IsString() organization: string;
  @IsString() designation: string;
  @IsOptional() @IsISO8601() startDate?: string;
  @IsOptional() @IsISO8601() endDate?: string;
  @IsOptional() @IsString() lastSalary?: string;
  @IsOptional() @IsString() reasonForLeaving?: string;
}

export class ImmigrationInfoDto {
  @IsOptional() @IsString() id?: string;
  @IsString() type: string;
  @IsString() documentNumber: string;
  @IsOptional() @IsString() citizenship?: string;
  @IsOptional() @IsISO8601() issuedDate?: string;
  @IsOptional() @IsISO8601() expiryDate?: string;
  @IsOptional() @IsString() comments?: string;
}

export class DocumentInfoDto {
  @IsOptional() @IsString() id?: string;
  @IsString() documentName: string;
  @IsOptional() @IsString() documentFile?: string;
}

export class CertificationInfoDto {
  @IsOptional() @IsString() id?: string;
  @IsString() certification: string;
  @IsOptional() @IsString() certifiedBy?: string;
  @IsOptional() @IsString() year?: string;
  @IsOptional() @IsString() score?: string;
}

export class QualificationInfoDto {
  @IsOptional() @IsString() id?: string;
  @IsString() qualification: string;
  @IsOptional() @IsString() boardUniversity?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() score?: string;
  @IsOptional() @IsString() schoolCollege?: string;
  @IsOptional() @IsString() passingYear?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateEmployeeDto {
  @IsString() employeeCode: string;
  @IsString() firstName: string;
  @IsOptional() @IsString() middleName?: string;
  @IsString() lastName: string;
  @IsEmail() email: string;

  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() aadhaar?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() uan?: string;
  @IsOptional() @IsString() pfNumber?: string;
  @IsOptional() @IsString() esic?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() designationId?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @IsString() employmentType?: string;
  @IsOptional() @IsString() workLocation?: string;
  @IsOptional() @IsISO8601() joiningDate?: string;
  @IsOptional() @IsISO8601() confirmationDate?: string;
  @IsOptional() @IsISO8601() dob?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() subDepartment?: string;
  @IsOptional() @IsString() subDepartment1?: string;
  @IsOptional() @IsString() subDepartment2?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() subCategory?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() reportingManager?: string;
  @IsOptional() @IsString() reportingManager2?: string;
  @IsOptional() @IsString() probation?: string;
  @IsOptional() @IsArray() skills?: string[];

  @IsOptional() @IsString() password?: string;
  @IsOptional() workingDaysPerWeek?: number;
  @IsOptional() ctc?: number;
  @IsOptional() roleName?: string;
  @IsOptional() experience?: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  paymentInfo?: PaymentInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminInfoDto)
  adminInfo?: AdminInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo?: PersonalInfoDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FamilyMemberDto)
  familyMembers?: FamilyMemberDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceInfoDto)
  experiences?: ExperienceInfoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImmigrationInfoDto)
  immigrations?: ImmigrationInfoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentInfoDto)
  documentInfos?: DocumentInfoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationInfoDto)
  certifications?: CertificationInfoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationInfoDto)
  qualifications?: QualificationInfoDto[];
}
