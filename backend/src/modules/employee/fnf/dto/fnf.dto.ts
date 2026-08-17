import { IsInt, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InitiateFnfDto {
  @IsString()
  employeeId: string;

  @IsISO8601()
  lastWorkingDay: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;
}

export class FnfOverridesDto {
  @IsOptional() @IsNumber() @Min(0) noticeRecovery?: number;
  @IsOptional() @IsNumber() @Min(0) otherDeductions?: number;
  @IsOptional() @IsNumber() @Min(0) unpaidSalaryAmt?: number;
  @IsOptional() @IsInt() @Min(0) unpaidSalaryDays?: number;
}