import React, { useEffect, useState } from 'react';
import { Download, Printer, ExternalLink, X, Loader2, FileText } from 'lucide-react';
import { generatePayslipPDF, type PayslipData } from '../../utils/payslipPDF';
import { payrollApiExt } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

export interface PayslipPreviewModalProps {
  open: boolean;
  onClose: () => void;
  payslipData?: PayslipData | null;
  payslipId?: string | null;
  sampleCompany?: any;
  title?: string;
}

export function PayslipPreviewModal({
  open,
  onClose,
  payslipData,
  payslipId,
  sampleCompany,
  title = 'Payslip Preview',
}: PayslipPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<PayslipData | null>(null);

  useEffect(() => {
    if (!open) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setCurrentData(null);
      setErrorMsg(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    async function loadPdf() {
      try {
        let dataToRender: PayslipData | null = null;

        if (payslipData) {
          dataToRender = payslipData;
        } else if (payslipId) {
          const full = await payrollApiExt.getPayslipDetail(payslipId);
          const { user } = useAuthStore.getState();
          dataToRender = {
            payslip: full,
            employee: full.employee || user?.employee,
            company: full.employee?.company || user?.company,
          };
        } else if (sampleCompany) {
          const now = new Date();
          dataToRender = {
            payslip: {
              payrollCycle: {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
              },
              grossPay: 85000,
              totalDeductions: 12500,
              netPay: 72500,
              workingDays: 26,
              paidDays: 26,
              lossOfPayDays: 0,
              breakdown: {
                basic: 42500,
                hra: 21250,
                da: 4250,
                specialAllowance: 17000,
                epfEmployee: 1800,
                epfEmployer: 1800,
                professionalTax: 200,
                tdsMonthly: 10500,
              },
            },
            employee: {
              employeeCode: 'LKE1001',
              firstName: 'Sample',
              lastName: 'Employee',
              designation: 'Senior Executive',
              department: { name: 'Operations' },
              panNumber: 'ABCDE1234F',
              bankAccountNumber: 'XXXXXXXX9876',
              bankName: 'HDFC Bank',
              ifsc: 'HDFC0001234',
              pfNumber: 'DL/CPM/0012345/000/0001001',
              esiNumber: '11000123450000001',
              uanNumber: '100987654321',
              dateOfJoining: '2023-04-01',
              company: sampleCompany,
            },
            company: sampleCompany,
            generatedBy: 'System Administrator',
            generatedAt: new Date().toLocaleDateString('en-IN'),
          };
        }

        if (!dataToRender) {
          throw new Error('No payslip data available to preview.');
        }

        if (isMounted) {
          setCurrentData(dataToRender);
        }

        const blob = await generatePayslipPDF(dataToRender, { save: false });
        if (isMounted) {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to render payslip preview.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [open, payslipData, payslipId, sampleCompany]);

  // Clean up URL when unmounting
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!open) return null;

  const handleDownload = async () => {
    if (currentData) {
      await generatePayslipPDF(currentData, { save: true });
    } else if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = 'SalarySlip.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const handleOpenTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[950px] bg-[var(--surface)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* Header with Title & Action Tools */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-alt)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--text-primary)] leading-tight flex items-center gap-2">
                {title}
                {sampleCompany && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Live Template Preview
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Official Red & White branded document format with transparent logo integration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !pdfUrl}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Print Payslip"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleOpenTab}
              disabled={loading || !pdfUrl}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Open in New Tab"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || !pdfUrl}
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
              title="Download Payslip PDF"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>

            <div className="h-6 w-px bg-[var(--border)] mx-1" />

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewer Content Area */}
        <div className="flex-1 bg-slate-900/10 dark:bg-slate-950/60 p-2 sm:p-4 overflow-hidden relative flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={36} className="animate-spin text-red-500" />
              <span className="text-sm font-semibold animate-pulse">Rendering official payslip preview…</span>
            </div>
          ) : errorMsg ? (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 max-w-md text-center">
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">Error Loading Payslip</p>
              <p className="text-xs text-[var(--text-muted)] mb-4">{errorMsg}</p>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              title="Payslip PDF Viewer"
              className="w-full h-full rounded-2xl border border-[var(--border)] shadow-md bg-white"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
