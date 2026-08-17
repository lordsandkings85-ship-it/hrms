import { MailService } from './mail.service';

describe('MailService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reports not configured when SMTP_HOST is unset', () => {
    delete process.env.SMTP_HOST;
    const service = new MailService();
    expect(service.isConfigured()).toBe(false);
  });

  it('reports configured when SMTP_HOST is set', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    const service = new MailService();
    expect(service.isConfigured()).toBe(true);
  });

  it('throws a clear error when sending without configuration', async () => {
    delete process.env.SMTP_HOST;
    const service = new MailService();
    await expect(
      service.send({ to: 'a@b.co', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toThrow('SMTP is not configured');
  });

  it('sends via the injected transporter with from/subject/html', async () => {
    const sendMail = jest.fn(async () => ({ messageId: 'm1' }));
    const service = new MailService({ sendMail } as any);

    await service.send({ to: 'a@b.co', subject: 'Payslip', html: '<p>Hi</p>' });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.co', subject: 'Payslip', html: '<p>Hi</p>', from: expect.any(String) }),
    );
  });
});