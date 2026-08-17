import { Injectable, Logger, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(@Optional() transporter?: Transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (transporter) {
      this.transporter = transporter;
    } else if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass: pass || '' } : undefined,
      });
    } else {
      this.transporter = null;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(options: MailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP is not configured. Set SMTP_HOST (and SMTP_USER/SMTP_PASS) to enable email.');
    }
    const from = process.env.SMTP_FROM || 'no-reply@workora.app';
    await this.transporter.sendMail({ from, to: options.to, subject: options.subject, html: options.html });
    this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
  }
}