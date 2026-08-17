import { IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RequestTravelDto {
  @IsString() employeeId: string;
  @IsISO8601() fromDate: string;
  @IsISO8601() toDate: string;
  @IsOptional() @IsString() purpose?: string;
  @IsOptional() @IsNumber() @Min(0) advance?: number;
}