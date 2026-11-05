import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';
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

  /**
   * Company-wide document list. Group admins see everything; every other
   * caller only sees documents belonging to employees of their own company.
   */
  async listAll(userId: string, companyId: string) {
    const groupWide = await isGroupWideUser(this.prisma, userId);
    return this.prisma.employeeDocument.findMany({
      where: groupWide ? {} : { employee: { companyId } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async eSignDocument(documentId: string, employeeId: string, ipAddress: string, userId: string) {
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.employeeId !== employeeId) throw new BadRequestException('Unauthorized to sign this document');
    if (doc.isSigned) throw new BadRequestException('Document is already signed');

    // The signer must be the employee the document belongs to. HR/admin users
    // without a linked employee record may still sign on behalf, but the actor
    // is always recorded via userId.
    const signer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { employeeId: true },
    });
    if (signer?.employeeId && signer.employeeId !== employeeId) {
      throw new ForbiddenException('You can only sign your own documents');
    }

    // Generate cryptographic hash of document ID, timestamp, IP and actor
    const timestamp = new Date();
    const payload = `${documentId}-${employeeId}-${userId}-${ipAddress}-${timestamp.toISOString()}`;
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
