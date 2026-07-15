import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}
  upload(employeeId: string, type: string, fileUrl: string) {
    return this.prisma.employeeDocument.create({ data: { employeeId, type, fileUrl } });
  }
  listForEmployee(employeeId: string) {
    return this.prisma.employeeDocument.findMany({ where: { employeeId } });
  }

  async eSignDocument(documentId: string, employeeId: string, ipAddress: string) {
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.employeeId !== employeeId) throw new BadRequestException('Unauthorized to sign this document');
    if (doc.isSigned) throw new BadRequestException('Document is already signed');

    // Generate cryptographic hash of document ID, timestamp, and IP to simulate secure E-Sign
    const timestamp = new Date();
    const payload = `${documentId}-${employeeId}-${ipAddress}-${timestamp.toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(payload).digest('hex');

    return this.prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        isSigned: true,
        signedAt: timestamp,
        signatureHash,
      },
    });
  }
}
