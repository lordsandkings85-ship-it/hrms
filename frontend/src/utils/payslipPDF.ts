import { jsPDF } from 'jspdf';
import defaultCompanyLogoUrl from '../assets/logo.png';

const BRAND_NAVY: [number, number, number] = [11, 35, 71]; // Lords & Kings Deep Royal Navy #0B2347
const BRAND_GOLD: [number, number, number] = [212, 175, 55]; // Royal Gold #D4AF37
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

/** Resolves the company identity for a payslip, preferring the historical
 *  snapshot stored on the payslip at generation time over the live company. */
export function resolveCompany(data: PayslipData): any {
  const snapshot = data.payslip?.companySnapshot;
  const empCompany = data.employee?.company || data.payslip?.employee?.company;
  const directCompany = data.company;

  if (snapshot && typeof snapshot === 'object' && (snapshot.name || snapshot.legalName || snapshot.displayName)) {
    const fullAddress = snapshot.address || [snapshot.city, snapshot.state, snapshot.pincode].filter(Boolean).join(', ');
    return {
      name: snapshot.legalName || snapshot.displayName || snapshot.name || empCompany?.legalName || empCompany?.name || directCompany?.name || 'Company Name',
      displayName: snapshot.displayName || snapshot.name || empCompany?.displayName || empCompany?.name || directCompany?.displayName || directCompany?.name || 'Company',
      legalName: snapshot.legalName || empCompany?.legalName || directCompany?.legalName || snapshot.name,
      address: fullAddress || empCompany?.address || directCompany?.address || '',
      city: snapshot.city || empCompany?.city || directCompany?.city || '',
      state: snapshot.state || empCompany?.state || directCompany?.state || '',
      pincode: snapshot.pincode || empCompany?.pincode || directCompany?.pincode || '',
      gst: snapshot.gstNumber || snapshot.gst || empCompany?.gstNumber || empCompany?.gst || directCompany?.gstNumber || directCompany?.gst || '',
      pan: snapshot.panNumber || snapshot.pan || empCompany?.panNumber || empCompany?.pan || directCompany?.panNumber || directCompany?.pan || '',
      cin: snapshot.cinNumber || snapshot.cin || empCompany?.cinNumber || empCompany?.cin || directCompany?.cinNumber || directCompany?.cin || '',
      tan: snapshot.tanNumber || snapshot.tan || empCompany?.tanNumber || empCompany?.tan || directCompany?.tanNumber || directCompany?.tan || '',
      phone: snapshot.phone || empCompany?.phone || directCompany?.phone || '',
      email: snapshot.email || empCompany?.email || directCompany?.email || '',
      website: snapshot.website || empCompany?.website || directCompany?.website || '',
      logoUrl: snapshot.logoUrl || empCompany?.logoUrl || directCompany?.logoUrl || null,
    };
  }

  const src = empCompany || directCompany || {};
  const fullAddress = src.address || [src.city, src.state, src.pincode].filter(Boolean).join(', ');
  return {
    name: src.legalName || src.displayName || src.name || 'Company Name',
    displayName: src.displayName || src.name || 'Company',
    legalName: src.legalName || src.name,
    address: fullAddress || '',
    city: src.city || '',
    state: src.state || '',
    pincode: src.pincode || '',
    gst: src.gstNumber || src.gst || '',
    pan: src.panNumber || src.pan || '',
    cin: src.cinNumber || src.cin || '',
    tan: src.tanNumber || src.tan || '',
    phone: src.phone || '',
    email: src.email || '',
    website: src.website || '',
    logoUrl: src.logoUrl || null,
  };
}

/** Loads the company logo dynamically; resolves to a data URL plus natural dimensions, or null if it can't load. */
export async function getLogo(customLogoUrl?: string | null): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const targetSrc = customLogoUrl || defaultCompanyLogoUrl;
  if (!targetSrc) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      // If custom logo fails to load (CORS/URL error), fallback to default
      if (customLogoUrl && targetSrc !== defaultCompanyLogoUrl) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = fallbackImg.naturalWidth;
            canvas.height = fallbackImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(fallbackImg, 0, 0);
              resolve({ dataUrl: canvas.toDataURL('image/png'), width: fallbackImg.naturalWidth, height: fallbackImg.naturalHeight });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        };
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = defaultCompanyLogoUrl;
      } else {
        resolve(null);
      }
    };
    img.src = targetSrc;
  });
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
      doc.setFillColor(245, 247, 250);
      doc.rect(x + 0.4, cursor - 0.4, width - 0.8, rowH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_NAVY);
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
  const { payslip, employee, generatedBy, generatedAt } = data;
  const company = resolveCompany(data);

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;

  const companyName = company?.name || company?.displayName || 'Company Name';
  const { month, year } = monthYear(payslip);

  // ── Header band (Royal Navy with Gold accent) ───────────────────
  doc.setFillColor(...BRAND_NAVY);
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Gold accent bar below header
  doc.setFillColor(...BRAND_GOLD);
  doc.rect(0, 25.5, pageWidth, 0.8, 'F');

  // Company logo (clean white chip container)
  const logo = await getLogo(company?.logoUrl);
  let leftTextX = 14;
  if (logo) {
    const logoBoxH = 14;
    let logoW = logoBoxH * (logo.width / logo.height);
    if (logoW > 48) logoW = 48;
    if (logoW < 14) logoW = 14;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(11, (26 - logoBoxH - 2) / 2, logoW + 2, logoBoxH + 2, 1, 1, 'F');
    doc.addImage(logo.dataUrl, 'PNG', 12, (26 - logoBoxH) / 2, logoW, logoBoxH, undefined, 'FAST');
    leftTextX = 14 + logoW + 4;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, leftTextX, 10);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  const addressText = company?.address ? String(company.address).split('\n')[0] : '';
  doc.text(addressText, leftTextX, 15.5);

  const idParts = [
    company?.gst ? `GST: ${company.gst}` : null,
    company?.pan ? `PAN: ${company.pan}` : null,
    company?.cin ? `CIN: ${company.cin}` : null,
  ].filter(Boolean);

  doc.setFontSize(6);
  doc.setTextColor(212, 175, 55); // Gold text for statutory tax numbers
  doc.text(idParts.length ? idParts.join('  |  ') : (company?.email || company?.phone || ''), leftTextX, 20.5);

  // Right-aligned salary slip titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY SALARY SLIP', pageWidth - 14, 10, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(212, 175, 55);
  doc.text(`${month} ${year}`, pageWidth - 14, 15.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(203, 213, 225);
  doc.text(`Period: ${month} ${year}`, pageWidth - 14, 20.5, { align: 'right' });

  // ── Body: two-column layout ─────────────────────────────────────
  const colLeft = 14;
  const colRight = 108;
  const colWidth = 88;
  let y = 33;

  // Row 1 — Employee details | Statutory details
  y = heading(doc, colLeft, y, 'Employee Details');
  y = heading(doc, colRight, y - 6, 'Statutory & Tax Identifiers');

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
  ry = detailRow(doc, colRight, ry, 'PF Number', employee?.pfNumber || '-');
  ry = detailRow(doc, colRight, ry, 'ESIC Number', employee?.esic || '-');
  detailRow(doc, colRight, ry, 'Aadhaar', employee?.aadhaar || '-');

  y = Math.max(ly, ry) + 4;

  // Row 2 — Earnings (left) | Deductions (right), side by side
  const b = payslip?.breakdown || {};
  const earnings: Row[] = [
    { label: 'Basic Salary', amount: b.basic },
    { label: 'House Rent Allowance (HRA)', amount: b.hra },
    { label: 'Dearness Allowance (DA)', amount: b.da },
    { label: 'Conveyance Allowance', amount: b.conveyance },
    { label: 'Medical Allowance', amount: b.medical },
    { label: 'Special Allowance', amount: b.specialAllowance },
    { label: 'Shift Allowance', amount: b.shiftAllowance },
  ].filter(e => (e.amount ?? 0) > 0 || e.label === 'Basic Salary');

  const deductions: Row[] = [
    { label: 'Provident Fund (PF - Employee)', amount: b.pfDeduction },
    { label: 'Employee State Insurance (ESI)', amount: b.esiDeduction },
    { label: 'Professional Tax (PT)', amount: b.ptDeduction },
    { label: 'Income Tax (TDS)', amount: b.tdsMonthly },
    { label: 'Loss of Pay (LOP)', amount: b.lopAmount },
  ];

  const grossPay = payslip?.grossPay || 0;
  const totalDeductions = payslip?.totalDeductions || 0;

  const endEarn = drawTable(doc, colLeft, y, colWidth, 'Earnings', [
    ...earnings,
    { label: 'Total Gross Pay', amount: grossPay, isTotal: true },
  ]);
  const endDed = drawTable(doc, colRight, y, colWidth, 'Deductions', [
    ...deductions,
    { label: 'Total Deductions', amount: totalDeductions, isTotal: true },
  ]);
  y = Math.max(endEarn, endDed) + 5;

  // Row 3 — Payment details (left) | Days / Tax summary (right)
  y = heading(doc, colLeft, y, 'Bank & Payment Details');
  y = heading(doc, colRight, y - 6, 'Attendance & Tax Summary');

  const bankName = employee?.paymentInfo?.bankName || employee?.bankName || '-';
  const accountNo = employee?.bankAccountNumber || employee?.paymentInfo?.accountNo || '-';
  const ifsc = employee?.bankIfsc || employee?.paymentInfo?.ifscCode || '-';

  ly = y;
  ly = detailRow(doc, colLeft, ly, 'Bank Name', bankName);
  ly = detailRow(doc, colLeft, ly, 'Account Number', accountNo);
  ly = detailRow(doc, colLeft, ly, 'IFSC Code', ifsc);
  ly = detailRow(doc, colLeft, ly, 'Payment Mode', payslip?.paymentMode || 'Bank Transfer');

  const workingDays = b.totalWorkingDays || 30;
  const lopDays = b.lopDays || 0;
  const paidDays = Math.max(0, workingDays - lopDays);

  ry = y;
  ry = detailRow(doc, colRight, ry, 'Total Working Days', String(workingDays));
  ry = detailRow(doc, colRight, ry, 'Paid Days', String(paidDays));
  ry = detailRow(doc, colRight, ry, 'Loss of Pay Days', String(lopDays));
  ry = detailRow(doc, colRight, ry, 'Tax Regime', b.taxRegime || 'New');

  y = Math.max(ly, ry) + 5;

  // ── Detailed Statutory Block (full width) ───────────────────────
  const taxableAnnual = b.taxableAnnual || 0;
  const effectiveRate = Number(b.effectiveTaxRate || 0);
  const basic = b.basic || grossPay || 0;

  y = heading(doc, colLeft, y, 'Statutory Contribution Breakdown');

  const statutoryRows: Row[] = [
    {
      label: 'Provident Fund (Employee Share)',
      text: `${pctOf(b.pfDeduction, basic)} of Basic  (${fmt(b.pfDeduction)})`,
      amount: b.pfDeduction,
    },
    {
      label: 'Employee State Insurance (ESI)',
      text: `${pctOf(b.esiDeduction, grossPay)} of Gross  (${fmt(b.esiDeduction)})`,
      amount: b.esiDeduction,
    },
    { label: 'Professional Tax', text: `As per state statutory slab  (${fmt(b.ptDeduction)})`, amount: b.ptDeduction },
    {
      label: 'Income Tax (TDS)',
      text: `${effectiveRate ? effectiveRate.toFixed(2) + '% ' : ''}computed on ${fmt(taxableAnnual)} annual income`,
      amount: b.tdsMonthly,
    },
    { label: 'Loss of Pay Adjustment', text: `${lopDays} day(s)  (${fmt(b.lopAmount)})`, amount: b.lopAmount },
  ];
  y = drawTable(doc, colLeft, y, pageWidth - 28, '', statutoryRows, { showHeader: true });
  y += 1;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(
    `Regime: ${b.taxRegime || 'New'}   |   Taxable Annual Income: ${fmt(taxableAnnual)}   |   Effective Tax Rate: ${effectiveRate || 0}%`,
    colLeft,
    y,
  );
  y += 5;

  // ── NET SALARY PAYABLE HIGHLIGHT ────────────────────────────────
  const netPay = payslip?.netPay || 0;
  doc.setFillColor(...BRAND_NAVY);
  doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SALARY PAYABLE', 20, y + 9);

  doc.setFontSize(13);
  doc.setTextColor(255, 215, 0); // Gold text for Net Pay amount
  doc.text(fmt(netPay), pageWidth - 20, y + 9, { align: 'right' });

  y += 19;

  // ── Footer ──────────────────────────────────────────────────────
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FAINT);
  const generatedByText = generatedBy ? `Generated by: ${generatedBy}` : '';
  const generatedAtText = generatedAt ? ` | Generated: ${generatedAt}` : '';
  doc.text(
    `${generatedByText}${generatedAtText} | This is a computer-generated document and does not require a physical signature.`,
    14,
    y + 2,
  );

  doc.setFont('helvetica', 'normal');
  doc.text(`Page 1 of 1 | ${companyName}`, 14, 285);

  if (opts?.save !== false) doc.save(`${month}_${year}_${empCode}_SalarySlip.pdf`);

  return doc.output('blob');
}
