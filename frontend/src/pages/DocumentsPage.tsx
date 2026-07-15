import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileText, UploadCloud, FolderOpen, ExternalLink } from 'lucide-react';
import { documentsApi, employeesApi } from '../api/client';

export default function DocumentsPage() {
  const [selectedEmp, setSelectedEmp] = useState('');
  const [docType, setDocType] = useState('aadhaar');
  const [fileUrl, setFileUrl] = useState('');

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  // Fetch documents for selected employee
  const { data: documents, refetch } = useQuery({
    queryKey: ['employee-documents', selectedEmp],
    queryFn: () => documentsApi.listForEmployee(selectedEmp),
    enabled: !!selectedEmp,
  });

  // Upload Document Mutation
  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: () => {
      alert('Document registry logged successfully');
      setFileUrl('');
      refetch();
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !fileUrl.trim()) return alert('Please enter all parameters');
    uploadMutation.mutate({
      employeeId: selectedEmp,
      type: docType,
      fileUrl,
    });
  };



  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Document Vault</h1>
        <p className="text-sm text-muted mt-1">Manage employee identity records, training certificates, resumes, and official company documentation.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload form */}
        <div className="bg-white border border-line rounded-lg p-6 h-fit">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <UploadCloud className="text-ledger" size={18} /> Register Document
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">Employee Context</label>
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ledger/40"
                required
              >
                <option value="">-- Choose Employee --</option>
                {employees?.items.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Document Category</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
              >
                <option value="aadhaar">Aadhaar Card (India)</option>
                <option value="pan">PAN Card (India)</option>
                <option value="passport">Passport Record</option>
                <option value="resume">Resume / CV</option>
                <option value="offer_letter">Offer Letter</option>
                <option value="certificate">Training Certificate</option>
                <option value="other">Other Official</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-muted">File Vault URL</label>
              </div>
              <input
                type="text"
                placeholder="https://storage.hrms.internal/..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-xs font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark"
            >
              Upload &amp; Register File
            </button>
          </form>
        </div>

        {/* Right Side: List Document */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line flex items-center gap-2">
            <FolderOpen size={16} /> Roster Registry Archive
          </div>
          {selectedEmp ? (
            <div>
              {!documents || documents.length === 0 ? (
                <div className="p-6 text-sm text-muted text-center">No documents uploaded for this employee. Register one on the left panel.</div>
              ) : (
                <div className="divide-y divide-line">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-paper rounded border border-line text-ledger">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-medium uppercase font-mono tracking-wide">{doc.type}</div>
                          <div className="text-xs text-muted mt-0.5">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-ledger hover:text-ledgerDark font-semibold"
                      >
                        Open File <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted text-center">Select an employee context to inspect document registries.</div>
          )}
        </div>
      </div>
    </div>
  );
}
