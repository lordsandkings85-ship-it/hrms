import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Check, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { companiesApi, authApi, Company } from '../../api/client';
import { useToast } from '../ui/ToastProvider';
import { useAuthStore } from '../../store/useAuthStore';

export const GROUP_NAME = 'Lords And Kings Group';

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  displayName: z.string().optional(),
  legalName: z.string().optional(),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  tanNumber: z.string().optional(),
  cinNumber: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  professionalTaxNumber: z.string().optional(),
  labourWelfareFundNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});

type FormValues = z.infer<typeof companySchema>;

const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm border border-line bg-paperDim dark:bg-surface-hover text-ink dark:text-white focus:outline-none focus:border-purple-500';
const labelCls = 'text-xs font-semibold text-muted dark:text-surface-muted';
const sectionCls = 'text-xs font-bold uppercase tracking-wider text-muted mb-3';

function Field({ label, required, error, register, name, ...rest }: any) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input {...register(name)} {...rest} className={inputCls} />
      {error && <p className="text-xs text-rose-500">{error.message}</p>}
    </div>
  );
}

function toDefault(company?: Company | null) {
  return {
    name: company?.name || '',
    displayName: company?.displayName || '',
    legalName: company?.legalName || '',
    logoUrl: company?.logoUrl || '',
    status: company?.status || 'active',
    address: company?.address || '',
    city: company?.city || '',
    state: company?.state || '',
    country: company?.country || 'India',
    pincode: company?.pincode || '',
    phone: company?.phone || '',
    email: company?.email || '',
    website: company?.website || '',
    gstNumber: company?.gstNumber || '',
    panNumber: company?.panNumber || '',
    tanNumber: company?.tanNumber || '',
    cinNumber: company?.cinNumber || '',
    pfNumber: company?.pfNumber || '',
    esiNumber: company?.esiNumber || '',
    professionalTaxNumber: company?.professionalTaxNumber || '',
    labourWelfareFundNumber: company?.labourWelfareFundNumber || '',
    bankName: company?.bankName || '',
    bankAccountName: company?.bankAccountName || '',
    bankAccountNumber: company?.bankAccountNumber || '',
    ifsc: company?.ifsc || '',
    timezone: company?.timezone || 'Asia/Kolkata',
    currency: company?.currency || 'INR',
  };
}

export function CompanyFormModal({
  open,
  mode,
  company,
  onClose,
}: {
  open: boolean;
  mode: 'add' | 'edit' | 'view';
  company?: Company | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: toDefault(company),
  });

  useEffect(() => {
    if (open) reset(toDefault(company));
  }, [open, company, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'edit' && company) {
        return companiesApi.update(company.id, values as Partial<Company>);
      }
      return companiesApi.create(values as Partial<Company> & { name: string });
    },
    onError: (e: any) => {
      setSubmitting(false);
      toastError(e.message || 'Failed to save company');
    },
  });

  const onSubmit = (values: FormValues) => {
    setSubmitting(true);
    mutation.mutate(values, {
      onSuccess: () => {
        toastSuccess(mode === 'edit' ? 'Company updated' : 'Company created');
        queryClient.invalidateQueries({ queryKey: ['companies-list'] });
        if (mode !== 'edit') {
          // Refresh the auth session so the new company appears in the topbar
          // company selector without reloading the application.
          authApi.me()
            .then((me) => useAuthStore.getState().setUser(me))
            .catch(() => {});
        }
        setSubmitting(false);
        onClose();
      },
    });
  };

  const viewOnly = mode === 'view';

  const Detail = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="text-sm text-ink dark:text-white mt-0.5 break-words">{value || '—'}</p>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={mode === 'add' ? 'Add New Company' : mode === 'edit' ? 'Edit Company' : `Company: ${company?.displayName || company?.name || ''}`} size="xl">
      {viewOnly && company ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-paperDim dark:bg-surface-hover border border-line flex items-center justify-center text-purple-500 font-bold text-lg">
              {company.logoUrl ? <img src={company.logoUrl} alt="" className="w-full h-full object-cover" /> : (company.name || 'CO').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink dark:text-white">{company.displayName || company.name}</h3>
              <p className="text-xs text-muted">
                {company.status === 'active'
                  ? <span className="text-emerald-500 font-bold">Active</span>
                  : <span className="text-rose-500 font-bold">Inactive</span>}
                {' · '}{company.gstNumber || 'No GST'} · {[company.city, company.state].filter(Boolean).join(', ') || addressShort(company)}
              </p>
            </div>
          </div>

          <div>
            <p className={sectionCls}>Parent Group</p>
            <div className="flex items-center gap-2 text-sm text-ink dark:text-white">
              <Building2 size={16} className="text-purple-500" /> {GROUP_NAME}
            </div>
          </div>

          <div>
            <p className={sectionCls}>Registration & Identity</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Detail label="Legal Name" value={company.legalName} />
              <Detail label="PAN" value={company.panNumber} />
              <Detail label="GSTIN" value={company.gstNumber} />
              <Detail label="TAN" value={company.tanNumber} />
              <Detail label="CIN" value={company.cinNumber} />
              <Detail label="PF Number" value={company.pfNumber} />
              <Detail label="ESI Number" value={company.esiNumber} />
              <Detail label="Professional Tax" value={company.professionalTaxNumber} />
              <Detail label="LWF Number" value={company.labourWelfareFundNumber} />
            </div>
          </div>

          <div>
            <p className={sectionCls}>Contact & Address</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Detail label="Email" value={company.email} />
              <Detail label="Phone" value={company.phone} />
              <Detail label="Website" value={company.website} />
              <Detail label="City" value={company.city} />
              <Detail label="State" value={company.state} />
              <Detail label="Country" value={company.country} />
              <Detail label="Pincode" value={company.pincode} />
              <Detail label="Registered Address" value={company.address} />
            </div>
          </div>

          <div>
            <p className={sectionCls}>Bank Details</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Detail label="Bank Name" value={company.bankName} />
              <Detail label="Account Name" value={company.bankAccountName} />
              <Detail label="Account Number" value={company.bankAccountNumber} />
              <Detail label="IFSC" value={company.ifsc} />
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <p className={sectionCls}>Parent Group</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-paperDim dark:bg-surface-hover text-sm text-ink dark:text-white opacity-80">
              <Building2 size={16} className="text-purple-500" /> {GROUP_NAME}
            </div>
          </div>

          <div>
            <p className={sectionCls}>Company Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company Name" required register={register} name="name" error={errors.name} placeholder="e.g. Acme Foods Pvt Ltd" />
              <Field label="Legal Name" register={register} name="legalName" error={errors.legalName} placeholder="Registered legal name" />
              <Field label="Display Name" register={register} name="displayName" error={errors.displayName} placeholder="Name shown in the UI" />
              <Field label="Brand Logo URL" register={register} name="logoUrl" error={errors.logoUrl} placeholder="https://..." />
              {mode === 'edit' && (
                <div className="space-y-1.5">
                  <label className={labelCls}>Status</label>
                  <select {...register('status')} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className={sectionCls}>Registered Address & Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className={labelCls}>Registered Address</label>
                <textarea {...register('address')} rows={2} className={inputCls} placeholder="Enter full registered address" />
              </div>
              <Field label="City" register={register} name="city" error={errors.city} placeholder="e.g. Mumbai" />
              <Field label="State" register={register} name="state" error={errors.state} placeholder="e.g. Maharashtra" />
              <Field label="Country" register={register} name="country" error={errors.country} placeholder="e.g. India" />
              <Field label="Pincode" register={register} name="pincode" error={errors.pincode} placeholder="e.g. 400001" />
              <Field label="Phone" register={register} name="phone" error={errors.phone} placeholder="+91-XXXXXXXXXX" />
              <Field label="Email" register={register} name="email" error={errors.email} placeholder="info@company.com" />
              <Field label="Website" register={register} name="website" error={errors.website} placeholder="https://company.com" />
            </div>
          </div>

          <div>
            <p className={sectionCls}>Statutory & Registration Numbers</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="PAN" register={register} name="panNumber" error={errors.panNumber} placeholder="e.g. AABCD1234E" />
              <Field label="GSTIN" register={register} name="gstNumber" error={errors.gstNumber} placeholder="e.g. 27AAACA1234A1Z5" />
              <Field label="TAN" register={register} name="tanNumber" error={errors.tanNumber} placeholder="e.g. CHNR12345A" />
              <Field label="CIN" register={register} name="cinNumber" error={errors.cinNumber} placeholder="e.g. U72900TN2022PTC123456" />
              <Field label="PF Number" register={register} name="pfNumber" error={errors.pfNumber} placeholder="e.g. TN/CHN/12345" />
              <Field label="ESI Number" register={register} name="esiNumber" error={errors.esiNumber} placeholder="e.g. 12000345678901234" />
              <Field label="Professional Tax" register={register} name="professionalTaxNumber" error={errors.professionalTaxNumber} placeholder="e.g. PT/CHN/123456" />
              <Field label="LWF Number" register={register} name="labourWelfareFundNumber" error={errors.labourWelfareFundNumber} placeholder="e.g. TN/LWF/12345" />
            </div>
          </div>

          <div>
            <p className={sectionCls}>Bank Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Bank Name" register={register} name="bankName" error={errors.bankName} placeholder="e.g. HDFC Bank" />
              <Field label="Bank Account Name" register={register} name="bankAccountName" error={errors.bankAccountName} placeholder="e.g. Acme Foods Pvt Ltd" />
              <Field label="Bank Account Number" register={register} name="bankAccountNumber" error={errors.bankAccountNumber} placeholder="e.g. 50100234567890" />
              <Field label="IFSC Code" register={register} name="ifsc" error={errors.ifsc} placeholder="e.g. HDFC0001234" />
            </div>
          </div>

          <div>
            <p className={sectionCls}>Preferences</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Timezone</label>
                <select {...register('timezone')} className={inputCls}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC / Coordinated Time</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Default Currency</label>
                <select {...register('currency')} className={inputCls}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold rounded-xl border border-line bg-paperDim dark:bg-surface-hover text-muted hover:text-ink dark:hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Create Company
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function addressShort(c: Company) {
  return (c.address || '').split('\n')[0] || '';
}