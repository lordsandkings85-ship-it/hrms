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

/** Safely truncates and fits text within maxWidth mm using ellipsis if necessary. */
function truncateText(doc: jsPDF, text: string | number | undefined | null, maxWidth: number): string {
  if (text == null || text === '') return '-';
  const str = String(text);
  if (doc.getTextWidth(str) <= maxWidth) return str;
  let len = str.length - 1;
  while (len > 0 && doc.getTextWidth(str.slice(0, len) + '...') > maxWidth) {
    len--;
  }
  return len > 0 ? str.slice(0, len) + '...' : '...';
}

/** Section heading with a clean underline rule spanning the exact column width. */
function heading(doc: jsPDF, x: number, y: number, title: string, width = 88): number {
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(title.toUpperCase(), x, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.35);
  doc.line(x, y + 1.8, x + width, y + 1.8);
  return y + 6.5;
}

/** Label / value row for the two-column detail grids with strict column boundary clipping. */
function detailRow(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  bold = false,
  labelWidth = 34,
  colWidth = 88,
): number {
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  doc.text(label, x, y);

  const maxValueW = Math.max(10, colWidth - labelWidth - 1);
  const fittedValue = truncateText(doc, value, maxValueW);

  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(...DARK);
  doc.text(fittedValue, x + labelWidth, y);
  return y + 4.8;
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
  const rowH = 5.0;

  let cursor = y;
  if (title) {
    cursor = heading(doc, x, y, title, width);
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
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(opts.headerLeft || 'Component', left + 1, cursor + 2.6);
    doc.text(opts.headerRight || 'Amount', right - 1, cursor + 2.6, { align: 'right' });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(x, cursor + rowH - 1, x + width, cursor + rowH - 1);
    cursor += rowH;
  }

  rows.forEach((row, idx) => {
    if (row.isTotal) {
      doc.setFillColor(...BRAND_TINT);
      doc.rect(x + 0.3, cursor - 0.7, width - 0.6, rowH - 0.3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_PRIMARY);
      doc.setDrawColor(252, 165, 165);
      doc.setLineWidth(0.3);
      doc.line(x, cursor - 1, x + width, cursor - 1);
    } else {
      if (idx % 2 === 0) {
        doc.setFillColor(...ROW_BG);
        doc.rect(x + 0.3, cursor - 0.7, width - 0.6, rowH - 0.3, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SLATE_DARK);
    }

    doc.setFontSize(7.2);
    const value = row.text ?? fmt(row.amount);
    const valW = doc.getTextWidth(value);
    const maxLabelW = Math.max(10, right - left - valW - 3);
    const fittedLabel = truncateText(doc, row.label, maxLabelW);

    doc.text(fittedLabel, left + 1, cursor + 2.6);
    doc.setFont('helvetica', row.isTotal || row.bold ? 'bold' : 'normal');
    doc.text(value, right - 1, cursor + 2.6, { align: 'right' });
    cursor += rowH;
  });

  return cursor + 3.5;
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

  // Company logo (transparent, blended directly into header)
  const logo = await getLogo(company?.logoUrl);
  let leftTextX = 14;
  if (logo) {
    const logoBoxH = 16;
    let logoW = logoBoxH * (logo.width / logo.height);
    if (logoW > 48) logoW = 48;
    if (logoW < 10) logoW = 10;
    const logoY = (27 - logoBoxH) / 2;
    doc.addImage(logo.dataUrl, 'PNG', 14, logoY, logoW, logoBoxH);
    leftTextX = 14 + logoW + 4;
  }

  const rightTitlesW = 55;
  const maxCompW = Math.max(30, pageWidth - 14 - rightTitlesW - leftTextX - 4);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(truncateText(doc, companyName, maxCompW), leftTextX, 11.5);

  const idParts = [
    company?.gst ? `GST: ${company.gst}` : null,
    company?.pan ? `PAN: ${company.pan}` : null,
    company?.cin ? `CIN: ${company.cin}` : null,
  ].filter(Boolean);

  const subLine = idParts.length ? idParts.join('  |  ') : (company?.email || company?.phone || '');
  if (subLine) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_LIGHT);
    doc.text(truncateText(doc, subLine, maxCompW), leftTextX, 18);
  }

  // Right-aligned salary slip titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY SALARY SLIP', pageWidth - 14, 9.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${month} ${year}`, pageWidth - 14, 15.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...BRAND_LIGHT);
  doc.text(`Period: ${month} ${year}`, pageWidth - 14, 20.5, { align: 'right' });

  // ── Body: two-column layout ─────────────────────────────────────
  const colLeft = 14;
  const colRight = 108;
  const colWidth = 88;
  let y = 34;

  // Row 1 — Employee details | Statutory details
  y = heading(doc, colLeft, y, 'Employee Details', colWidth);
  heading(doc, colRight, y - 6.5, 'Statutory & Tax Identifiers', colWidth);

  const empName = employee
    ? `${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`.trim()
    : '-';
  const empCode = employee?.employeeCode || employee?.code || 'N/A';
  const department = employee?.department?.name || '-';
  const designation = employee?.designation?.title || '-';
  const doj = employee?.joiningDate || employee?.dateOfJoining ? new Date(employee.joiningDate || employee.dateOfJoining).toLocaleDateString('en-IN') : '-';

  let ly = y;
  ly = detailRow(doc, colLeft, ly, 'Employee Name', empName, true);
  ly = detailRow(doc, colLeft, ly, 'Employee Code', empCode);
  ly = detailRow(doc, colLeft, ly, 'Designation', designation);
  ly = detailRow(doc, colLeft, ly, 'Department', department);
  ly = detailRow(doc, colLeft, ly, 'Date of Joining', String(doj));

  let ry = y;
  ry = detailRow(doc, colRight, ry, 'PAN Number', employee?.pan || employee?.panNumber || '-', true);
  ry = detailRow(doc, colRight, ry, 'UAN Number', employee?.uan || employee?.uanNumber || '-');
  ry = detailRow(doc, colRight, ry, 'PF Number', employee?.pfNumber || '-');
  ry = detailRow(doc, colRight, ry, 'ESIC Number', employee?.esic || employee?.esiNumber || '-');
  ry = detailRow(doc, colRight, ry, 'Aadhaar / ID', employee?.aadhaar ? `XXXX-XXXX-${String(employee.aadhaar).slice(-4)}` : '-');

  y = Math.max(ly, ry) + 4;

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

  y = Math.max(endEarn, endDed) + 3.5;

  // Row 3 — Payment details (left) | Days / Tax summary (right)
  y = heading(doc, colLeft, y, 'Bank & Payment Details', colWidth);
  heading(doc, colRight, y - 6.5, 'Attendance & Working Days', colWidth);

  const bankName = employee?.paymentInfo?.bankName || employee?.bankName || '-';
  const accountNo = employee?.bankAccountNumber || employee?.paymentInfo?.accountNo || '-';
  const ifsc = employee?.bankIfsc || employee?.ifsc || employee?.paymentInfo?.ifscCode || '-';

  ly = y;
  ly = detailRow(doc, colLeft, ly, 'Bank Name', bankName);
  ly = detailRow(doc, colLeft, ly, 'Account Number', accountNo);
  ly = detailRow(doc, colLeft, ly, 'IFSC Code', ifsc);
  ly = detailRow(doc, colLeft, ly, 'Payment Mode', payslip?.paymentMode || 'Direct Bank Transfer');

  const workingDays = payslip?.workingDays || b.totalWorkingDays || 30;
  const lopDays = payslip?.lossOfPayDays || b.lopDays || 0;
  const paidDays = payslip?.paidDays || Math.max(0, workingDays - lopDays);

  ry = y;
  ry = detailRow(doc, colRight, ry, 'Total Working Days', `${workingDays} Days`);
  ry = detailRow(doc, colRight, ry, 'Paid Days', `${paidDays} Days`);
  ry = detailRow(doc, colRight, ry, 'Loss of Pay (LOP)', `${lopDays} Days`);
  ry = detailRow(doc, colRight, ry, 'Tax Regime', b.taxRegime ? `${b.taxRegime} Regime` : 'New Tax Regime');

  y = Math.max(ly, ry) + 4.5;

  // ── Detailed Statutory Block (full width) ───────────────────────
  const taxableAnnual = Number(b.taxableAnnual || 0);
  const effectiveRate = Number(b.effectiveTaxRate || 0);
  const basic = Number(b.basic || grossPay || 0);

  y = heading(doc, colLeft, y, 'Statutory Contribution & Compliance', pageWidth - 28);

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
  y = drawTable(doc, colLeft, y, pageWidth - 28, '', statutoryRows, {
    showHeader: true,
    headerLeft: 'Statutory Component',
    headerRight: 'Description / Monthly Contribution'
  });

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  const taxSummaryLine = `Tax Regime: ${b.taxRegime || 'New'}   |   Annual Gross CTC: ${fmt((grossPay || 0) * 12)}   |   Taxable Income: ${fmt(taxableAnnual)}`;
  doc.text(
    truncateText(doc, taxSummaryLine, pageWidth - 28),
    colLeft + 1,
    y,
  );
  y += 5.5;

  // ── NET SALARY PAYABLE HIGHLIGHT (Gentle Tint with Ruby & Slate text) ────────
  const netPay = Number(payslip?.netPay || 0);
  doc.setFillColor(...BRAND_TINT);
  doc.roundedRect(colLeft, y, pageWidth - 28, 14.5, 2, 2, 'F');
  doc.setDrawColor(...BRAND_ACCENT);
  doc.setLineWidth(0.4);
  doc.roundedRect(colLeft, y, pageWidth - 28, 14.5, 2, 2, 'S');

  doc.setTextColor(...BRAND_PRIMARY);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SALARY PAYABLE', colLeft + 5, y + 6.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`(Gross Earnings ${fmt(grossPay)} - Total Deductions ${fmt(totalDeductions)})`, colLeft + 5, y + 11);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PRIMARY);
  doc.text(fmt(netPay), pageWidth - 14 - 5, y + 9.5, { align: 'right' });

  y += 19;

  // ── Footer ──────────────────────────────────────────────────────
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FAINT);
  const generatedByText = generatedBy ? `Generated by: ${generatedBy}` : '';
  const generatedAtText = generatedAt ? ` | Generated: ${generatedAt}` : '';
  const fullFooterText = `${generatedByText}${generatedAtText} | This is a computer-generated document and does not require a physical signature.`;
  doc.text(
    truncateText(doc, fullFooterText, pageWidth - 28),
    colLeft,
    y,
  );

  doc.setFont('helvetica', 'normal');
  doc.text(`Page 1 of 1 | ${truncateText(doc, companyName, 80)}`, colLeft, 287);

  if (opts?.save !== false) doc.save(`${month}_${year}_${empCode}_SalarySlip.pdf`);

  return doc.output('blob');
}
