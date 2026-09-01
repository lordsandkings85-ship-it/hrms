import { jsPDF } from 'jspdf';
import { getLogo } from './payslipPDF';

const BRAND: [number, number, number] = [238, 87, 64];
const DARK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const FAINT: [number, number, number] = [148, 163, 184];
const BORDER: [number, number, number] = [226, 232, 240];
const ROW_BG: [number, number, number] = [248, 250, 252];

const fmt = (n?: number) => 'Rs. ' + Math.round(n ?? 0).toLocaleString('en-IN');

export interface Form16Data {
  financialYear: string;
  status: string;
  partA: {
    totalTaxDeducted: number;
    totalTaxDeposited: number;
    quarters: { quarter: string; amount: number; status: string }[];
  };
  partB: {
    grossSalary: number;
    standardDeduction: number;
    professionalTax: number;
    taxableIncome: number;
    totalTaxPayable: number;
    tdsDeducted: number;
    basic?: number;
    hra?: number;
  };
}

export interface CompanyInfo {
  name?: string;
  pan?: string;
  gst?: string;
  address?: string;
}

export async function generateForm16PDF(data: Form16Data, employee: { name: string; code?: string; pan?: string }, company: CompanyInfo = {}): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const companyName = company.name || 'Company Name';

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 24, 'F');

  const logo = await getLogo();
  let leftTextX = 14;
  if (logo) {
    const logoBoxH = 12;
    let logoW = logoBoxH * (logo.width / logo.height);
    if (logoW > 40) logoW = 40;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(11, (24 - logoBoxH - 3) / 2, logoW + 2, logoBoxH + 3, 1, 1, 'F');
    doc.addImage(logo.dataUrl, 'PNG', 12, (24 - logoBoxH) / 2, logoW, logoBoxH, undefined, 'FAST');
    leftTextX = 14 + logoW + 4;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, leftTextX, 10.5);
  const meta = [company.pan && `PAN: ${company.pan}`, company.gst && `GSTIN: ${company.gst}`].filter(Boolean).join('  |  ');
  if (meta) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(254, 215, 205);
    doc.text(meta, leftTextX, 14.5);
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FORM 16 (PART A & B)', pageWidth - 14, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(254, 215, 205);
  doc.text(`Financial Year: ${data.financialYear}`, pageWidth - 14, 16, { align: 'right' });
  doc.text(`Certificate under Section 203 of the Income-tax Act, 1961`, pageWidth - 14, 20.5, { align: 'right' });

  let y = 32;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('EMPLOYEE DETAILS', 14, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(14, y + 1.5, 14 + 82, y + 1.5);
  y += 7;

  const detailRow = (label: string, value: string) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(value || '-', 14 + 40, y);
    y += 4.4;
  };
  detailRow('Name', employee.name);
  detailRow('PAN', employee.pan || '-');
  detailRow('Employer', companyName);
  y += 2;

  const section = (title: string) => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(title, 14, y);
    doc.setDrawColor(...BORDER);
    doc.line(14, y + 1.5, 14 + 82, y + 1.5);
    y += 6;
  };

  const amountRow = (label: string, value: string, bold = false) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(label, 14, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...DARK);
    doc.text(value, pageWidth - 14, y, { align: 'right' });
    y += 4.6;
  };

  section('PART A — TDS DEDUCTED & DEPOSITED');
  amountRow('Total tax deducted at source', fmt(data.partA.totalTaxDeducted), true);
  amountRow('Total tax deposited to the Government', fmt(data.partA.totalTaxDeposited), true);
  if (data.partA.quarters?.length) {
    y += 1;
    amountRow('Quarterly deposits', '');
    for (const q of data.partA.quarters) {
      amountRow(`  ${q.quarter} (${q.status})`, fmt(q.amount));
    }
  }
  y += 2;

  section('PART B — INCOME & TAX DETAILS');
  amountRow('Gross salary received', fmt(data.partB.grossSalary));
  amountRow('Standard deduction', `- ${fmt(data.partB.standardDeduction)}`);
  amountRow('Professional tax', `- ${fmt(data.partB.professionalTax)}`);
  amountRow('Income chargeable under "Salaries"', fmt(data.partB.taxableIncome), true);
  amountRow('Tax on income', fmt(data.partB.totalTaxPayable), true);
  amountRow('TDS deducted during the year', fmt(data.partB.tdsDeducted));

  y += 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FAINT);
  doc.text(
    `This certificate is generated from payroll records. Form 16 issued on ${new Date().toLocaleDateString('en-IN')}.`,
    14,
    282,
  );
  doc.setFont('helvetica', 'normal');
  doc.text(`Page 1 of 1 | ${companyName}`, 14, 287);

  doc.save(`Form16_${data.financialYear.replace(/\s+/g, '_')}.pdf`);
}
