import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}
  getSubscription(companyId: string) {
    return this.prisma.subscription.findFirst({ where: { companyId }, orderBy: { renewsAt: 'desc' } });
  }
  listInvoices(companyId: string) {
    return this.prisma.invoice.findMany({ where: { companyId }, orderBy: { issuedAt: 'desc' } });
  }
  async upgradePlan(companyId: string, planName: string) {
    const existing = await this.prisma.subscription.findFirst({ where: { companyId } });
    if (existing) {
      return this.prisma.subscription.update({ where: { id: existing.id }, data: { planName } });
    }
    return this.prisma.subscription.create({ data: { companyId, planName } });
  }

  async generateMonthlyInvoices() {
    const companies = await this.prisma.company.findMany({
      include: {
        subscription: true,
        _count: { select: { employees: { where: { status: 'active' } } } }
      }
    });

    let invoiceCount = 0;
    for (const company of companies) {
      const activeEmployees = company._count.employees;
      if (activeEmployees === 0) continue;

      // Price per active user based on tier (mock SaaS pricing)
      const sub = company.subscription[0];
      const planName = sub?.planName || 'Free';
      let perUserRate = 0;
      if (planName === 'Pro') perUserRate = 500;
      else if (planName === 'Enterprise') perUserRate = 1200;

      if (perUserRate === 0) continue; // Free plan

      const amount = activeEmployees * perUserRate;
      const gstAmount = amount * 0.18; // 18% GST

      await this.prisma.invoice.create({
        data: {
          companyId: company.id,
          subscriptionId: sub?.id,
          amount,
          gstAmount,
          status: 'unpaid'
        }
      });
      invoiceCount++;
    }

    return { success: true, message: `Generated ${invoiceCount} new SaaS invoices for this month.` };
  }
}
