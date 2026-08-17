import { IsISO8601, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitTimesheetDto {
  @IsString() employeeId: string;
  @IsISO8601() date: string;
  @IsNumber() @Min(0) @Max(24) hours: number;
  @IsOptional() @IsString() projectId?: string;
}