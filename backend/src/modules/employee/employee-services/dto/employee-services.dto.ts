import { IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CompOffDto {
  @IsString() employeeId: string;
  @IsISO8601() date: string;
  @IsOptional() @IsString() reason?: string;
}

export class FlexibleHolidayDto {
  @IsString() employeeId: string;
  @IsISO8601() date: string;
  @IsOptional() @IsString() reason?: string;
}

export class OvertimeDto {
  @IsString() employeeId: string;
  @IsISO8601() date: string;
  @IsNumber() @Min(0) hours: number;
  @IsOptional() @IsString() reason?: string;
}

export class OptionalHolidayDto {
  @IsString() employeeId: string;
  @IsISO8601() date: string;
  @IsOptional() @IsString() holidayName?: string;
  @IsOptional() @IsString() reason?: string;
}

export class LoanDto {
  @IsString() employeeId: string;
  @IsOptional() @IsString() type?: string;
  @IsString() purpose: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsNumber() @Min(0) emiMonths?: number;
  @IsOptional() @IsNumber() @Min(0) emi?: number;
  @IsOptional() @IsString() notes?: string;
}

export class SalaryRevisionDto {
  @IsString() employeeId: string;
  @IsISO8601() effectiveFrom: string;
  @IsNumber() @Min(0) revisedCtc: number;
  @IsOptional() @IsNumber() @Min(0) previousCtc?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() remarks?: string;
}

export class TaxDeclarationDto {
  @IsString() employeeId: string;
  @IsOptional() @IsString() financialYear?: string;
  @IsString() section: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) declaredAmount: number;
}

export class ApproveTaxDeclarationDto {
  @IsOptional() @IsNumber() @Min(0) approvedAmount?: number;
}