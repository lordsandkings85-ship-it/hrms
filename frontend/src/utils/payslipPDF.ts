import { jsPDF } from 'jspdf';
import defaultCompanyLogoUrl from '../assets/logo.png';

// Refined, executive Deep Wine / Crimson palette — professional, high contrast, elegant (not neon red)
const BRAND_PRIMARY: [number, number, number] = [188, 38, 38  ]; // Deep Crimson/Burgundy rgba(188, 38, 38, 1) (Red-900)
const BRAND_ACCENT: [number, number, number] = [185, 28, 28]; // Rich Red Accent #B91C1C
const BRAND_LIGHT: [number, number, number] = [254, 226, 226]; // Soft Warm White #FEE2E2
const BRAND_TINT: [number, number, number] = [254, 242, 242]; // Gentle soft tint #FEF2F2
const DARK: [number, number, number] = [15, 23, 42]; // Slate 900 #0F172A
const SLATE_DARK: [number, number, number] = [30, 41, 59]; // Slate 800 #1E293B
const MUTED: [number, number, number] = [100, 116, 139]; // Slate 500 #64748B
const FAINT: [number, number, number] = [148, 163, 184]; // Slate 400 #94A3B8
const BORDER: [number, number, number] = [226, 232, 240]; // Slate 200 #E2E8F0
const ROW_BG: [number, number, number] = [248, 250, 252]; // Slate 50 #F8FAFC

const fmt = (n?: number) => {
  const v = Math.round(Number(n) ?? 0);
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

/** Resolves the company identity for a payslip, prioritizing the employee's assigned working company */
export function resolveCompany(data: PayslipData): any {
  const empCompany = data.employee?.company || data.payslip?.employee?.company;
  const snapshot = data.payslip?.companySnapshot;
  const directCompany = data.company;

  // Prioritize the employee's working company; fallback to snapshot, then directCompany
  const src = empCompany || snapshot || directCompany || {};

  const fullAddress =
    src.address ||
    [src.city, src.state, src.pincode].filter(Boolean).join(', ') ||
    snapshot?.address ||
    empCompany?.address ||
    directCompany?.address ||
    '';

  return {
    name: src.legalName || src.displayName || src.name || snapshot?.legalName || snapshot?.displayName || snapshot?.name || directCompany?.legalName || directCompany?.displayName || directCompany?.name || 'Company Name',
    displayName: src.displayName || src.name || snapshot?.displayName || directCompany?.displayName || directCompany?.name || 'Company',
    legalName: src.legalName || src.displayName || src.name || snapshot?.legalName || directCompany?.legalName || 'Company Name',
    address: fullAddress,
    city: src.city || snapshot?.city || empCompany?.city || directCompany?.city || '',
    state: src.state || snapshot?.state || empCompany?.state || directCompany?.state || '',
    pincode: src.pincode || snapshot?.pincode || empCompany?.pincode || directCompany?.pincode || '',
    gst: src.gstNumber || src.gst || snapshot?.gstNumber || snapshot?.gst || directCompany?.gstNumber || directCompany?.gst || '',
    pan: src.panNumber || src.pan || snapshot?.panNumber || snapshot?.pan || directCompany?.panNumber || directCompany?.pan || '',
    cin: src.cinNumber || src.cin || snapshot?.cinNumber || snapshot?.cin || directCompany?.cinNumber || directCompany?.cin || '',
    tan: src.tanNumber || src.tan || snapshot?.tanNumber || snapshot?.tan || directCompany?.tanNumber || directCompany?.tan || '',
    phone: src.phone || snapshot?.phone || directCompany?.phone || '',
    email: src.email || snapshot?.email || directCompany?.email || '',
    website: src.website || snapshot?.website || directCompany?.website || '',
    logoUrl: src.logoUrl || snapshot?.logoUrl || directCompany?.logoUrl || null,
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
        const width = img.naturalWidth || 400;
        const height = img.naturalHeight || 200;

        // If already a valid PNG or SVG data URL, preserve it directly with zero canvas artifacts
        if (targetSrc.startsWith('data:image/png') || targetSrc.startsWith('data:image/svg+xml')) {
          return resolve({ dataUrl: targetSrc, width, height });
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
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
            const width = fallbackImg.naturalWidth || 400;
            const height = fallbackImg.naturalHeight || 200;
            if (defaultCompanyLogoUrl.startsWith('data:image/png')) {
              return resolve({ dataUrl: defaultCompanyLogoUrl, width, height });
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(fallbackImg, 0, 0, width, height);
              resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
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

/** Shrinks the current font until the text fits maxWidth — never truncates or hides text. Returns final size. */
function fitText(doc: jsPDF, text: string | number | undefined | null, maxWidth: number, minSize = 5.5): number {
  const str = text == null ? '' : String(text);
  if (str === '' || maxWidth <= 0) return doc.getFontSize();
  let size = doc.getFontSize();
  while (size > minSize && doc.getTextWidth(str) > maxWidth) {
    size -= 0.25;
    doc.setFontSize(size);
  }
  return size;
}

/** Section heading with a clean underline rule spanning the exact column width. */
function heading(doc: jsPDF, x: number, y: number, title: string, width = 88): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(title.toUpperCase(), x, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(x, y + 2.2, x + width, y + 2.2);
  return y + 8.5;
}

/** Label / value row for the two-column detail grids with strict column boundary clipping. */
function detailRow(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  bold = false,
  labelWidth = 36,
  colWidth = 88,
): number {
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  fitText(doc, label, labelWidth - 1, 6);
  doc.text(label, x, y);

  const maxValueW = Math.max(10, colWidth - labelWidth - 2);

  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(...DARK);
  doc.setFontSize(8.5);
  fitText(doc, value, maxValueW, 6.5);
  doc.text(value, x + labelWidth, y);
  return y + 5.8;
}

/** A titled, boxed table used for EARNINGS / DEDUCTIONS / STATUTORY blocks with collision prevention. */
function drawTable(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  rows: Row[],
  opts: { showHeader?: boolean; headerLeft?: string; headerRight?: string } = {},
): number {
  const left = x + 2.5;
  const right = x + width - 2.5;
  const rowH = 6.5;

  let cursor = y;

  // Filled title strip
  if (title) {
    doc.setFillColor(...BRAND_PRIMARY);
    doc.roundedRect(x, cursor, width, 7.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), x + 4, cursor + 5);
    cursor += 8.5;
  }

  const showHeader = opts.showHeader ?? false;
  const totalH = (showHeader ? rowH : 0) + rows.length * rowH;

  // Table container box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, cursor - 1, width, totalH + 2, 1.5, 1.5, 'S');

  if (showHeader) {
    doc.setFillColor(...ROW_BG);
    doc.rect(x + 0.3, cursor - 0.7, width - 0.6, rowH - 0.3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(opts.headerLeft || 'Component', left + 1, cursor + 3.4);
    doc.text(opts.headerRight || 'Amount', right - 1, cursor + 3.4, { align: 'right' });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(x, cursor + rowH - 1, x + width, cursor + rowH - 1);
    cursor += rowH;
  }

  rows.forEach((row, idx) => {
    if (row.isTotal) {
      doc.setFillColor(...BRAND_TINT);
      doc.rect(x + 0.3, cursor - 0.7, width - 0.6, rowH - 0.3, 'F');
    } else if (idx % 2 === 0) {
      doc.setFillColor(...ROW_BG);
      doc.rect(x + 0.3, cursor - 0.7, width - 0.6, rowH - 0.3, 'F');
    }

    doc.setFontSize(9);
    if (row.isTotal) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_PRIMARY);
    } else {
      doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
      doc.setTextColor(...SLATE_DARK);
    }

    const value = row.text ?? fmt(row.amount);
    const availW = right - left - 3;
    const valW = Math.min(doc.getTextWidth(value), Math.max(26, availW - 70));
    fitText(doc, value, Math.max(20, valW), 6);
    const usedVW = Math.min(doc.getTextWidth(value), availW - 30);
    const labelMax = Math.max(12, availW - usedVW - 2);
    doc.setFontSize(9);
    fitText(doc, row.label, labelMax, 6.5);

    doc.text(row.label, left + 1, cursor + 3.4);
    doc.text(value, right - 1, cursor + 3.4, { align: 'right' });
    cursor += rowH;
  });

  return cursor + 2.5;
}

/** Horizontal card showing a series of label/value cells separated by hairlines. */
function summaryStrip(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  cells: { label: string; value: string }[],
): number {
  const height = 16;
  doc.setFillColor(...ROW_BG);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');

  const cellW = width / cells.length;
  cells.forEach((cell, i) => {
    const cx = x + i * cellW;
    if (i > 0) {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.line(cx, y + 2.5, cx, y + height - 2.5);
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text(cell.label.toUpperCase(), cx + 3.5, y + 6);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    fitText(doc, cell.value, cellW - 7, 6.5);
    doc.text(cell.value, cx + 3.5, y + 12);
  });

  return y + height;
}

/** Full-width single-row band of stat items separated by hairlines. */
function infoBand(doc: jsPDF, x: number, y: number, width: number, items: [string, string][]): number {
  const height = 9.5;
  doc.setFillColor(...ROW_BG);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');

  const step = width / items.length;
  items.forEach((item, i) => {
    const cx = x + step * i;
    if (i > 0) {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.line(cx, y + 1.5, cx, y + height - 1.5);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const labelW = doc.getTextWidth(`${item[0]} :`);
    doc.text(`${item[0]} :`, cx + 2.5, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.setFontSize(8);
    fitText(doc, item[1], Math.max(8, step - labelW - 6), 6);
    doc.text(item[1], cx + 2.5 + labelW, y + 6);
  });

  return y + height;
}

/** Percentage derived from an amount over a base, formatted to 1 decimal. */
function pctOf(amount: number | undefined, base: number | undefined): string {
  if (!amount || !base || base <= 0) return '—';
  const pct = Math.round((Number(amount) / Number(base)) * 1000) / 10;
  return `${pct.toFixed(1)}%`;
}

export async function generatePayslipPDF(data: PayslipData, opts?: { save?: boolean }): Promise<Blob> {
  const { payslip, employee, generatedBy, generatedAt } = data;
  const company = resolveCompany(data);

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;

  const companyName = company?.name || company?.displayName || 'Company Name';
  const { month, year } = monthYear(payslip);

  // ── Header band (Refined Executive Burgundy/Crimson) ───────────────
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 0, pageWidth, 27, 'F');

  // Accent bar below header
  doc.setFillColor(...BRAND_ACCENT);
  doc.rect(0, 26.2, pageWidth, 0.8, 'F');

  // Company logo (centered) above the company name (centered)
  const logo = await getLogo(company?.logoUrl);
  const nameMax = 90;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const nameWUsed = Math.min(doc.getTextWidth(companyName), nameMax);
  const nameX = (pageWidth - nameWUsed) / 2;

  let nameY = 15;
  if (logo) {
    const logoBoxH = 12;
    let logoW = logoBoxH * (logo.width / logo.height);
    if (logoW > 44) logoW = 44;
    if (logoW < 8) logoW = 8;
    doc.addImage(logo.dataUrl, 'PNG', (pageWidth - logoW) / 2, 2.2, logoW, logoBoxH);
    nameY = 19;
  }
  fitText(doc, companyName, nameMax, 7.5);
  doc.text(companyName, nameX, nameY);

  // Left-side: SALARY SLIP badge pill
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const badgeText = 'SALARY SLIP';
  const badgeW = doc.getTextWidth(badgeText) + 6;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.roundedRect(9, 6.5, badgeW, 6, 3, 3, 'S');
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, 9 + badgeW / 2, 10.7, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(`${month} ${year}`, 8.5, 19);



  // GST / PAN (CIN if present) — right side of the header band, right-aligned
  const idParts = [
    company?.gst ? `GST: ${company.gst}` : null,
    company?.pan ? `PAN: ${company.pan}` : null,
    company?.cin ? `CIN: ${company.cin}` : null,
  ].filter((p): p is string => Boolean(p));
  for (const [i, part] of idParts.entries()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_LIGHT);
    doc.text(part, pageWidth - 14, 9.5 + i * 4.5, { align: 'right' });
  }

  // ── Body ──────────────────────────────────────────────────────────
  const colLeft = 14;
  const colRight = 108;
  const colWidth = 88;
  let y = 36;

  // Employee summary strip (full width)
  const empName = employee
    ? `${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`.trim()
    : '-';
  const empCode = employee?.employeeCode || employee?.code || 'N/A';
  const department = employee?.department?.name || '-';
  const designation = employee?.designation?.title || '-';
  const doj = employee?.joiningDate || employee?.dateOfJoining ? new Date(employee.joiningDate || employee.dateOfJoining).toLocaleDateString('en-IN') : '-';

  y = summaryStrip(doc, colLeft, y, pageWidth - 28, [
    { label: 'Employee Name', value: empName },
    { label: 'Employee Code', value: empCode },
    { label: 'Designation', value: designation },
    { label: 'Department', value: department },
    { label: 'Date of Joining', value: String(doj) },
  ]);
  y += 4;

  // Row 2 — Earnings (left) | Deductions (right), side by side
  const b = payslip?.breakdown || {};
  const earnings: Row[] = [
    { label: 'Basic Salary', amount: Number(b.basic || 0) },
    { label: 'House Rent Allowance (HRA)', amount: Number(b.hra || 0) },
    { label: 'Dearness Allowance (DA)', amount: Number(b.da || 0) },
    { label: 'Conveyance Allowance', amount: Number(b.conveyance || 0) },
    { label: 'Medical Allowance', amount: Number(b.medical || 0) },
    { label: 'Special Allowance', amount: Number(b.specialAllowance || 0) },
    { label: 'Shift Allowance', amount: Number(b.shiftAllowance || 0) },
    { label: 'Bonus / Overtime Payout', amount: Number(b.additionalPayout || 0) },
  ].filter(e => (e.amount ?? 0) > 0 || e.label === 'Basic Salary');

  const deductions: Row[] = [
    { label: 'Provident Fund (PF - Employee)', amount: Number(b.pfDeduction || b.epfEmployee || 0) },
    { label: 'Employee State Insurance (ESI)', amount: Number(b.esiDeduction || b.esiEmployee || 0) },
    { label: 'Professional Tax (PT)', amount: Number(b.ptDeduction || b.professionalTax || 0) },
    { label: 'Income Tax (TDS)', amount: Number(b.tdsMonthly || 0) },
    { label: 'Loss of Pay (LOP)', amount: Number(b.lopAmount || 0) },
  ];

  const grossPay = Number(payslip?.grossPay || 0);
  const totalDeductions = Number(payslip?.totalDeductions || 0);

  const endEarn = drawTable(doc, colLeft, y, colWidth, 'Earnings Breakdown', [
    ...earnings,
    { label: 'Total Gross Pay', amount: grossPay, isTotal: true },
  ], { showHeader: true });

  const endDed = drawTable(doc, colRight, y, colWidth, 'Deductions Breakdown', [
    ...deductions,
    { label: 'Total Deductions', amount: totalDeductions, isTotal: true },
  ], { showHeader: true });

  y = Math.max(endEarn, endDed) + 5.5;

  // Row 3 — Bank details (left) | Statutory IDs (right)
  y = heading(doc, colLeft, y, 'Bank & Payment Details', colWidth);
  heading(doc, colRight, y - 8.5, 'Statutory & Tax IDs', colWidth);

  const bankName = employee?.paymentInfo?.bankName || employee?.bankName || '-';
  const accountNo = employee?.bankAccountNumber || employee?.paymentInfo?.accountNo || '-';
  const ifsc = employee?.bankIfsc || employee?.ifsc || employee?.paymentInfo?.ifscCode || '-';

  let ly = y;
  ly = detailRow(doc, colLeft, ly, 'Bank Name', bankName);
  ly = detailRow(doc, colLeft, ly, 'Account Number', accountNo);
  ly = detailRow(doc, colLeft, ly, 'IFSC Code', ifsc);
  ly = detailRow(doc, colLeft, ly, 'Payment Mode', payslip?.paymentMode || 'Direct Bank Transfer');

  let ry = y;
  ry = detailRow(doc, colRight, ry, 'PAN Number', employee?.pan || employee?.panNumber || '-', true);
  ry = detailRow(doc, colRight, ry, 'UAN Number', employee?.uan || employee?.uanNumber || '-');
  ry = detailRow(doc, colRight, ry, 'PF Number', employee?.pfNumber || '-');
  ry = detailRow(doc, colRight, ry, 'ESIC Number', employee?.esic || employee?.esiNumber || '-');
  ry = detailRow(doc, colRight, ry, 'Aadhaar / ID', employee?.aadhaar ? `XXXX-XXXX-${String(employee.aadhaar).slice(-4)}` : '-');

  y = Math.max(ly, ry) + 5;

  // Working days band (full width)
  const workingDays = payslip?.workingDays || b.totalWorkingDays || 30;
  const lopDays = payslip?.lossOfPayDays || b.lopDays || 0;
  const paidDays = payslip?.paidDays || Math.max(0, workingDays - lopDays);
  y = infoBand(doc, colLeft, y, pageWidth - 28, [
    ['Total Working Days', `${workingDays} Days`],
    ['Paid Days', `${paidDays} Days`],
    ['Loss of Pay', `${lopDays} Day${lopDays === 1 ? '' : 's'}`],
    ['Tax Regime', b.taxRegime ? `${b.taxRegime} Regime` : 'New Tax Regime'],
  ]);
  y += 6;

// ── Detailed Statutory Block (full width) ───────────────────────
  const effectiveRate = Number(b.effectiveTaxRate || 0);
  const basic = Number(b.basic || grossPay || 0);

  const statutoryRows: Row[] = [
    {
      label: 'Provident Fund (Employee Share)',
      text: `${pctOf(b.pfDeduction || b.epfEmployee, basic)} of Basic  (${fmt(b.pfDeduction || b.epfEmployee)})`,
      amount: Number(b.pfDeduction || b.epfEmployee || 0),
    },
    {
      label: 'Employee State Insurance (ESI)',
      text: `${pctOf(b.esiDeduction || b.esiEmployee, grossPay)} of Gross  (${fmt(b.esiDeduction || b.esiEmployee)})`,
      amount: Number(b.esiDeduction || b.esiEmployee || 0),
    },
    { label: 'Professional Tax (PT)', text: `As per state statutory slab  (${fmt(b.ptDeduction || b.professionalTax)})`, amount: Number(b.ptDeduction || b.professionalTax || 0) },
    {
      label: 'Income Tax (TDS)',
      text: `${effectiveRate ? effectiveRate.toFixed(2) + '% ' : ''}computed on annual taxable income`,
      amount: Number(b.tdsMonthly || 0),
    },
    { label: 'Loss of Pay Adjustment', text: `${lopDays} day(s)  (${fmt(b.lopAmount || 0)})`, amount: Number(b.lopAmount || 0) },
  ];
  y = drawTable(doc, colLeft, y, pageWidth - 28, 'Statutory Contribution & Compliance', statutoryRows, {
    showHeader: true,
    headerLeft: 'Statutory Component',
    headerRight: 'Contribution / Description'
  });
  y += 2;

  // ── NET SALARY PAYABLE HIGHLIGHT (Gentle Tint with Ruby & Slate text) ────────
  const netPay = Number(payslip?.netPay || 0);
  doc.setFillColor(...BRAND_TINT);
  doc.roundedRect(colLeft, y, pageWidth - 28, 16, 2, 2, 'F');
  doc.setDrawColor(...BRAND_ACCENT);
  doc.setLineWidth(0.4);
  doc.roundedRect(colLeft, y, pageWidth - 28, 16, 2, 2, 'S');

  doc.setTextColor(...BRAND_PRIMARY);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SALARY PAYABLE', colLeft + 5, y + 7.2);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`(Gross Earnings ${fmt(grossPay)} - Total Deductions ${fmt(totalDeductions)})`, colLeft + 5, y + 12.5);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PRIMARY);
  doc.text(fmt(netPay), pageWidth - 19, y + 11.5, { align: 'right' });

  y += 21;

  // ── Footer ──────────────────────────────────────────────────────
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FAINT);
  const generatedByText = generatedBy ? `Generated by: ${generatedBy}` : '';
  const generatedAtText = generatedAt ? ` | Generated: ${generatedAt}` : '';
  const fullFooterText = `${generatedByText}${generatedAtText} | This is a computer-generated document and does not require a physical signature.`;
  doc.setFontSize(7.5);
  fitText(doc, fullFooterText, pageWidth - 28, 6);
  doc.text(
    fullFooterText,
    colLeft,
    y,
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const pageLine = `Page 1 of 1 | ${companyName}`;
  fitText(doc, pageLine, 80, 6);
  doc.text(pageLine, colLeft, 287);

  if (opts?.save !== false) doc.save(`${month}_${year}_${empCode}_SalarySlip.pdf`);

  return doc.output('blob');
}
