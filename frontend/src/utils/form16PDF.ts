import { jsPDF } from 'jspdf';
import { getLogo } from './payslipPDF';

const BRAND_PRIMARY: [number, number, number] = [185, 28, 28]; // #B91C1C
const BRAND_ACCENT: [number, number, number] = [220, 38, 38];
const BRAND_LIGHT: [number, number, number] = [254, 226, 226];
const DARK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const FAINT: [number, number, number] = [148, 163, 184];
const BORDER: [number, number, number] = [226, 232, 240];
const ROW_BG: [number, number, number] = [248, 250, 252];
const BRAND_TINT: [number, number, number] = [254, 242, 242];

const fmt = (n?: number) => 'Rs. ' + Math.round(n ?? 0).toLocaleString('en-IN');

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
  panNumber?: string;
  gst?: string;
  gstNumber?: string;
  cin?: string;
  cinNumber?: string;
  address?: string;
  logoUrl?: string;
}

export async function generateForm16PDF(
  data: Form16Data,
  employee: { name: string; code?: string; pan?: string },
  company: CompanyInfo = {},
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const companyName = company.name || 'Company Name';

  // ── Header Band ───────────────────────────────────────────────────
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 0, pageWidth, 26.2, 'F');
  doc.setFillColor(...BRAND_ACCENT);
  doc.rect(0, 26.2, pageWidth, 0.8, 'F');

  // Left-side: FORM 16 badge pill
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const badgeText = 'FORM 16';
  const badgeW = doc.getTextWidth(badgeText) + 6;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.roundedRect(9, 6.5, badgeW, 6, 3, 3, 'S');
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, 9 + badgeW / 2, 10.7, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(data.financialYear, 8.5, 19);

  // Center: Company Logo (if any) + Company Name
  const logo = await getLogo(company?.logoUrl);
  const nameMax = 85;
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

  // Right side: GST / PAN (CIN if present) — aligned key-value block
  const gstVal = company.gst || company.gstNumber;
  const panVal = company.pan || company.panNumber;
  const cinVal = company.cin || company.cinNumber;

  const idItems = [
    gstVal ? { label: 'GST:', value: String(gstVal) } : null,
    panVal ? { label: 'PAN:', value: String(panVal) } : null,
    cinVal ? { label: 'CIN:', value: String(cinVal) } : null,
  ].filter((p): p is { label: string; value: string } => Boolean(p));

  if (idItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const labelW = Math.max(...idItems.map((it) => doc.getTextWidth(it.label))) + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const valW = Math.max(...idItems.map((it) => doc.getTextWidth(it.value)));

    const totalW = labelW + valW;
    const blockX = pageWidth - 14 - totalW;

    idItems.forEach((item, idx) => {
      const iy = 9.5 + idx * 4.8;
      // Label in bold BRAND_LIGHT
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND_LIGHT);
      doc.text(item.label, blockX, iy);

      // Value in normal crisp white
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(item.value, blockX + labelW, iy);
    });
  }

  // ── Body ──────────────────────────────────────────────────────────
  let y = 35;

  // Sub-header Certificate Note
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  doc.text('CERTIFICATE UNDER SECTION 203 OF THE INCOME-TAX ACT, 1961', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${data.status ? data.status.toUpperCase() : 'ISSUED'}`, pageWidth - 14, y, { align: 'right' });
  y += 4;

  // Summary strip (Employee & Employer info)
  const cellW = (pageWidth - 28) / 4;
  doc.setFillColor(...ROW_BG);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, pageWidth - 28, 15, 2, 2, 'FD');

  const empCells = [
    { label: 'EMPLOYEE NAME', value: employee.name || '-' },
    { label: 'EMPLOYEE CODE', value: employee.code || '-' },
    { label: 'EMPLOYEE PAN', value: employee.pan || '-' },
    { label: 'FINANCIAL YEAR', value: data.financialYear || '-' },
  ];

  empCells.forEach((c, i) => {
    const cx = 14 + i * cellW;
    if (i > 0) {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.line(cx, y + 2, cx, y + 13);
    }
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text(c.label, cx + 3, y + 5.5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    fitText(doc, c.value, cellW - 6, 6.5);
    doc.text(c.value, cx + 3, y + 11);
  });
  y += 20;

  // Helper function to draw clean titled table
  function drawSectionTable(title: string, rows: { label: string; value: string; bold?: boolean; isTotal?: boolean }[]) {
    // Title Strip
    doc.setFillColor(...BRAND_PRIMARY);
    doc.roundedRect(14, y, pageWidth - 28, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 18, y + 4.8);
    y += 8;

    // Header
    const rowH = 6.2;
    doc.setFillColor(...ROW_BG);
    doc.rect(14.3, y - 0.5, pageWidth - 28.6, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Particulars / Component', 16, y + 3.8);
    doc.text('Amount (Rs.)', pageWidth - 16, y + 3.8, { align: 'right' });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(14, y + rowH, pageWidth - 14, y + rowH);
    y += rowH + 0.5;

    // Rows
    rows.forEach((r, idx) => {
      if (r.isTotal) {
        doc.setFillColor(...BRAND_TINT);
        doc.rect(14.3, y - 0.5, pageWidth - 28.6, rowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND_PRIMARY);
      } else {
        if (idx % 2 === 0) {
          doc.setFillColor(...ROW_BG);
          doc.rect(14.3, y - 0.5, pageWidth - 28.6, rowH, 'F');
        }
        doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
        doc.setTextColor(...DARK);
      }

      doc.setFontSize(8.5);
      doc.text(r.label, 16, y + 3.8);
      doc.text(r.value, pageWidth - 16, y + 3.8, { align: 'right' });
      y += rowH;
    });

    y += 4;
  }

  // PART A
  const partARows: { label: string; value: string; bold?: boolean; isTotal?: boolean }[] = [
    { label: 'Total Tax Deducted at Source (TDS)', value: fmt(data.partA.totalTaxDeducted), bold: true },
    { label: 'Total Tax Deposited with Central Government', value: fmt(data.partA.totalTaxDeposited), bold: true, isTotal: true },
  ];
  if (data.partA.quarters?.length) {
    for (const q of data.partA.quarters) {
      partARows.push({ label: `  Quarterly Deposit: ${q.quarter} (${q.status})`, value: fmt(q.amount) });
    }
  }
  drawSectionTable('Part A — Summary of Tax Deducted & Deposited', partARows);

  // PART B
  const partBRows: { label: string; value: string; bold?: boolean; isTotal?: boolean }[] = [
    { label: 'Gross Salary Received (Sec 17(1))', value: fmt(data.partB.grossSalary) },
    { label: 'Standard Deduction (Sec 16(ia))', value: `- ${fmt(data.partB.standardDeduction)}` },
    { label: 'Professional Tax (Sec 16(iii))', value: `- ${fmt(data.partB.professionalTax)}` },
    { label: 'Income Chargeable Under the Head "Salaries"', value: fmt(data.partB.taxableIncome), bold: true, isTotal: true },
    { label: 'Total Tax Payable on Income', value: fmt(data.partB.totalTaxPayable), bold: true },
    { label: 'Total TDS Deducted during the Financial Year', value: fmt(data.partB.tdsDeducted), bold: true, isTotal: true },
  ];
  drawSectionTable('Part B — Details of Salary Paid and Tax Deducted', partBRows);

  // Footer
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FAINT);
  const fullFooterText = `This certificate is generated from official payroll records. Form 16 issued on ${new Date().toLocaleDateString('en-IN')}.`;
  doc.text(fullFooterText, 14, 282);

  doc.setFont('helvetica', 'normal');
  doc.text(`Page 1 of 1 | ${companyName}`, 14, 287);

  doc.save(`Form16_${data.financialYear.replace(/\s+/g, '_')}.pdf`);
}
