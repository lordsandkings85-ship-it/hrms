import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/** Default SaaS pricing used when a company has no custom BILLING_PRICING config.
 *  Admins can override per company via the `BILLING_PRICING` setting
 *  (e.g. { "Pro": 500, "Enterprise": 1200, "gstRate": 0.18 }). */
const DEFAULT_PRICING = { Pro: 500, Enterprise: 1200, gstRate: 0.18 };

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
    await this.prisma.$transaction(async (tx) => {
      for (const company of companies) {
        const activeEmployees = company._count.employees;
        if (activeEmployees === 0) continue;

        const sub = company.subscription[0];
        const planName = sub?.planName || 'Free';

        // Pricing is read from the company's BILLING_PRICING setting (config-driven),
        // falling back to the documented default table.
        const setting = await tx.setting.findUnique({
          where: { companyId_key: { companyId: company.id, key: 'BILLING_PRICING' } },
        });
        const pricing = (setting?.value as any) ?? DEFAULT_PRICING;
        const perUserRate = Number(pricing?.[planName] ?? 0);
        const gstRate = Number(pricing?.gstRate ?? 0.18);

        if (perUserRate <= 0) continue; // Free plan / no price configured

        const amount = activeEmployees * perUserRate;
        const gstAmount = Math.round(amount * gstRate * 100) / 100;

        await tx.invoice.create({
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
    });

    return { success: true, message: `Generated ${invoiceCount} new SaaS invoices for this month.` };
  }
}

