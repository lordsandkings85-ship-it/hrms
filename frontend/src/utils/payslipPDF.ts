import { jsPDF } from 'jspdf';
import companyLogoUrl from '../assets/logo.png';

const BRAND: [number, number, number] = [238, 87, 64];
const DARK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const FAINT: [number, number, number] = [148, 163, 184];
const BORDER: [number, number, number] = [226, 232, 240];
const ROW_BG: [number, number, number] = [248, 250, 252];

const fmt = (n?: number) => {
  const v = Math.round(n ?? 0);
  return 'Rs. ' + v.toLocaleString('en-IN');
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface PayslipData {
  payslip?: any;
  employee?: any;
  company?: any;
  generatedBy?: string;
  generatedAt?: string;
}

type Row = { label: string; amount?: number; text?: string; isTotal?: boolean; bold?: boolean };

/** Loads the company logo once; resolves to a data URL plus natural dimensions, or null if it can't load. */
let logoPromise: Promise<{ dataUrl: string; width: number; height: number } | null> | null = null;
export function getLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = companyLogoUrl;
    });
  }
  return logoPromise;
}

function monthYear(payslip: any): { month: string; year: string | number } {
  const month =
    payslip?.payrollCycle?.month && MONTH_NAMES[payslip.payrollCycle.month - 1] || '-';
  const year = payslip?.payrollCycle?.year || '-';
  return { month, year };
}

/** Section heading with an underline rule, left-aligned within the given column. */
function heading(doc: jsPDF, x: number, y: number, title: string) {
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(title.toUpperCase(), x, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(x, y + 1.5, x + 82, y + 1.5);
  return y + 6;
}

/** Label / value row for the two-column detail grids. */
function detailRow(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  bold = false,
) {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  doc.text(label, x, y);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(...DARK);
  doc.text(value || '-', x + 34, y);
  return y + 4.4;
}

/** A titled, boxed table used for EARNINGS / DEDUCTIONS / STATUTORY blocks. */
function drawTable(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  rows: Row[],
  opts: { showHeader?: boolean } = {},
): number {
  const left = x + 2;
  const right = x + width - 2;
  const rowH = 4.6;

  let cursor = heading(doc, x, y, title);

  // Table header
  const showHeader = opts.showHeader ?? false;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, cursor - 1, width, 4 + rows.length * rowH + (showHeader ? rowH : 0), 1.5, 1.5, 'S');
  doc.roundedRect(x, cursor - 1, width, 4 + rows.length * rowH + (showHeader ? rowH : 0), 1.5, 1.5, 'S');

  if (showHeader) {
    doc.setFillColor(...ROW_BG);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('Component', left + 1, cursor + 2.5);
    doc.text('Amount', right - 1, cursor + 2.5, { align: 'right' });
    cursor += rowH;
  }

  rows.forEach((row, idx) => {
    if (row.isTotal) {
      doc.setFillColor(255, 245, 242);
      doc.rect(x + 0.4, cursor - 0.4, width - 0.8, rowH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND);
    } else {
      if (idx % 2 === 0) {
        doc.setFillColor(...ROW_BG);
        doc.rect(x + 0.4, cursor - 0.4, width - 0.8, rowH, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
    }

    doc.setFontSize(7);
    doc.text(row.label, left + 1, cursor + 2.5);
    const value = row.text ?? fmt(row.amount);
    doc.setFont(row.isTotal || row.bold ? 'helvetica' : 'helvetica', row.isTotal || row.bold ? 'bold' : 'normal');
    doc.text(value, right - 1, cursor + 2.5, { align: 'right' });
    cursor += rowH;
  });

  return cursor + 2;
}

/** Percentage derived from an amount over a base, formatted to 1 decimal. */
function pctOf(amount: number | undefined, base: number | undefined): string {
  if (!amount || !base || base <= 0) return '—';
  const pct = Math.round((amount / base) * 1000) / 10;
  return `${pct.toFixed(1)}%`;
}

export async function generatePayslipPDF(data: PayslipData, opts?: { save?: boolean }): Promise<Blob> {
  const { payslip, employee, company, generatedBy, generatedAt } = data;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;

  const companyName = company?.name || 'Company Name';
  const { month, year } = monthYear(payslip);

  // ── Header band (brand red) ─────────────────────────────────────
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Company logo (white chip so the logo stays readable on the red band)
  const logo = await getLogo();
  let leftTextX = 14;
  if (logo) {
    const logoBoxH = 12;
    let logoW = logoBoxH * (logo.width / logo.height);
    if (logoW > 44) logoW = 44;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(11, (24 - logoBoxH - 3) / 2, logoW + 2, logoBoxH + 3, 1, 1, 'F');
    doc.addImage(logo.dataUrl, 'PNG', 12, (24 - logoBoxH) / 2, logoW, logoBoxH, undefined, 'FAST');
    leftTextX = 14 + logoW + 4;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, leftTextX, 11);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(company?.address || '', leftTextX, 17);
  doc.setFontSize(6);
  doc.setTextColor(254, 215, 205);
  doc.text(
    `GST: ${company?.gst || '-'} | PAN: ${company?.pan || '-'}${company?.cin ? ` | CIN: ${company.cin}` : ''}`,
    leftTextX,
    21,
  );

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY SALARY SLIP', pageWidth - 14, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(254, 215, 205);
  doc.text(`${month} ${year}`, pageWidth - 14, 16, { align: 'right' });
  doc.setFontSize(6);
  doc.text(`Payroll Period: ${month} ${year}`, pageWidth - 14, 20.5, { align: 'right' });

  // ── Body: two-column layout ─────────────────────────────────────
  const colLeft = 14;
  const colRight = 108;
  const colWidth = 88;
  let y = 30;

  // Row 1 — Employee details | Statutory details
  y = heading(doc, colLeft, y, 'Employee Details');
  y = heading(doc, colRight, y - 6, 'Statutory / Tax Details');

  const empName = employee
    ? `${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`.trim()
    : '-';
  const empCode = employee?.employeeCode || employee?.code || 'N/A';
  const department = employee?.department?.name || '-';
  const designation = employee?.designation?.title || '-';
  const doj = employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : '-';

  let ly = y;
  ly = detailRow(doc, colLeft, ly, 'Name', empName, true);
  ly = detailRow(doc, colLeft, ly, 'Employee Code', empCode);
  ly = detailRow(doc, colLeft, ly, 'Designation', designation);
  ly = detailRow(doc, colLeft, ly, 'Department', department);
  detailRow(doc, colLeft, ly, 'Date of Joining', String(doj));

  let ry = y;
  ry = detailRow(doc, colRight, ry, 'PAN', employee?.pan || '-', true);
  ry = detailRow(doc, colRight, ry, 'UAN', employee?.uan || '-');
  ry = detailRow(doc, colRight, ry, 'PF No.', employee?.pfNumber || '-');
  ry = detailRow(doc, colRight, ry, 'ESIC No.', employee?.esic || '-');
  detailRow(doc, colRight, ry, 'Aadhaar', employee?.aadhaar || '-');

  y = Math.max(ly, ry) + 4;

  // Row 2 — Earnings (left) | Deductions (right), side by side
  const b = payslip?.breakdown || {};
  const earnings: Row[] = [
    { label: 'Basic', amount: b.basic },
    { label: 'House Rent Allowance', amount: b.hra },
    { label: 'Dearness Allowance', amount: b.da },
    { label: 'Conveyance', amount: b.conveyance },
    { label: 'Medical Allowance', amount: b.medical },
    { label: 'Special Allowance', amount: b.specialAllowance },
    { label: 'Shift Allowance', amount: b.shiftAllowance },
  ];
  const deductions: Row[] = [
    { label: 'Provident Fund (Employee)', amount: b.pfDeduction },
    { label: 'Employee State Insurance', amount: b.esiDeduction },
    { label: 'Professional Tax', amount: b.ptDeduction },
    { label: 'Income Tax (TDS)', amount: b.tdsMonthly },
    { label: 'Loss of Pay', amount: b.lopAmount },
  ];

  const grossPay = payslip?.grossPay || 0;
  const totalDeductions = payslip?.totalDeductions || 0;

  const endEarn = drawTable(doc, colLeft, y, colWidth, 'Earnings (Monthly)', [
    ...earnings,
    { label: 'Gross Pay', amount: grossPay, isTotal: true },
  ]);
  const endDed = drawTable(doc, colRight, y, colWidth, 'Deductions (Monthly)', [
    ...deductions,
    { label: 'Total Deductions', amount: totalDeductions, isTotal: true },
  ]);
  y = Math.max(endEarn, endDed) + 5;

  // Row 3 — Payment details (left) | Days / Tax summary (right)
  y = heading(doc, colLeft, y, 'Payment Details');
  y = heading(doc, colRight, y - 6, 'Attendance & Tax');

  const bankName = employee?.paymentInfo?.bankName || employee?.bankName || '-';
  const accountNo = employee?.bankAccountNumber || employee?.paymentInfo?.accountNo || '-';
  const ifsc = employee?.bankIfsc || employee?.paymentInfo?.ifscCode || '-';

  ly = y;
  ly = detailRow(doc, colLeft, ly, 'Bank', bankName);
  ly = detailRow(doc, colLeft, ly, 'Account No.', accountNo);
  ly = detailRow(doc, colLeft, ly, 'IFSC', ifsc);
  ly = detailRow(doc, colLeft, ly, 'Payment Mode', payslip?.paymentMode || 'Bank Transfer');

  const workingDays = b.totalWorkingDays || 30;
  const lopDays = b.lopDays || 0;
  const paidDays = workingDays - lopDays;

  ry = y;
  ry = detailRow(doc, colRight, ry, 'Working Days', String(workingDays));
  ry = detailRow(doc, colRight, ry, 'Paid Days', String(paidDays));
  ry = detailRow(doc, colRight, ry, 'Loss of Pay Days', String(lopDays));
  ry = detailRow(doc, colRight, ry, 'Tax Regime', b.taxRegime || 'New');

  y = Math.max(ly, ry) + 5;

  // ── Detailed Statutory Block (full width, emphasized) ──────────
  const taxableAnnual = b.taxableAnnual || 0;
  const effectiveRate = Number(b.effectiveTaxRate || 0);
  const basic = b.basic || grossPay || 0;

  y = heading(doc, colLeft, y, 'Detailed Statutory Summary');

  const statutoryRows: Row[] = [
    {
      label: 'Provident Fund (Employee)',
      text: `${pctOf(b.pfDeduction, basic)} of Basic  (${fmt(b.pfDeduction)})`,
      amount: b.pfDeduction,
    },
    {
      label: 'Employee State Insurance (ESI)',
      text: `${pctOf(b.esiDeduction, grossPay)} of Gross  (${fmt(b.esiDeduction)})`,
      amount: b.esiDeduction,
    },
    { label: 'Professional Tax', text: `Flat as per state slab  (${fmt(b.ptDeduction)})`, amount: b.ptDeduction },
    {
      label: 'Income Tax (TDS)',
      text: `${effectiveRate ? effectiveRate.toFixed(2) + '% ' : ''}effective on ${fmt(taxableAnnual)} annual`,
      amount: b.tdsMonthly,
    },
    { label: 'Loss of Pay', text: `${lopDays} day(s)  (${fmt(b.lopAmount)})`, amount: b.lopAmount },
  ];
  y = drawTable(doc, colLeft, y, pageWidth - 28, '', statutoryRows, { showHeader: true });
  y += 1;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(
    `Regime: ${b.taxRegime || 'New'}   |   Taxable Income (Annual): ${fmt(taxableAnnual)}   |   Effective Tax Rate: ${effectiveRate || 0}%`,
    colLeft,
    y,
  );
  y += 5;

  // ── NET PAY band ────────────────────────────────────────────────
  const netPay = payslip?.netPay || 0;
  doc.setFillColor(...BRAND);
  doc.roundedRect(14, y, pageWidth - 28, 13, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 18, y + 8.5);
  doc.setFontSize(12);
  doc.text(fmt(netPay), pageWidth - 18, y + 8.5, { align: 'right' });

  y += 18;

  // ── Footer ──────────────────────────────────────────────────────
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FAINT);
  const generatedByText = generatedBy ? `Generated by: ${generatedBy}` : '';
  const generatedAtText = generatedAt ? ` | Generated: ${generatedAt}` : '';
  doc.text(
    `${generatedByText}${generatedAtText} | This is a computer-generated salary slip.`,
    14,
    y + 2,
  );

  doc.setFont('helvetica', 'normal');
  doc.text(`Page 1 of 1 | Company: ${companyName}`, 14, 282);

  if (opts?.save !== false) doc.save(`${month}_${year}_${empCode}_SalarySlip.pdf`);

  return doc.output('blob');
}
