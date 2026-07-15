import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}
  @Post() upload(@Body() body: { employeeId: string; type: string; fileUrl: string }) {
    return this.service.upload(body.employeeId, body.type, body.fileUrl);
  }
  @Get('employee/:employeeId') list(@Param('employeeId') employeeId: string) { return this.service.listForEmployee(employeeId); }

  @Post(':id/sign')
  eSignDocument(
    @Param('id') id: string,
    @Body('employeeId') employeeId: string,
    @Req() req: Request
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    return this.service.eSignDocument(id, employeeId, ipAddress);
  }
}
