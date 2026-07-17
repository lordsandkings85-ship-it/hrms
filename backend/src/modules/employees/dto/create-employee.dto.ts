import { IsArray, IsEmail, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  employeeCode: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

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
  @IsOptional() @IsArray() skills?: string[];
  
  @IsOptional() @IsString() password?: string;
  @IsOptional() workingDaysPerWeek?: number;
  @IsOptional() ctc?: number;
  @IsOptional() roleName?: string;
}
