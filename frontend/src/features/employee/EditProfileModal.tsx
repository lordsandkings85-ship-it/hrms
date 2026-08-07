import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../../api/client';
import { X, Save, ShieldCheck } from 'lucide-react';
import { Employee } from '../../api/client';
import { useToast } from '../../components/ui/ToastProvider';

const schema = z.object({
  contactInfo: z.object({
    currentPhoneNo: z.string().optional(),
    currentPersonalEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    currentAddress: z.string().min(3, 'Address is required'),
    currentCity: z.string().min(2, 'City is required'),
    currentState: z.string().min(2, 'State is required'),
    currentCountry: z.string().min(2, 'Country is required'),
    currentPostCode: z.string().min(4, 'Post code is required'),
  }),
  emergencyContacts: z.array(z.object({
    name: z.string().min(2, 'Name is required'),
    relation: z.string().min(2, 'Relation is required'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
  })).optional(),
});

type FormData = z.infer<typeof schema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export function EditProfileModal({ isOpen, onClose, employee }: EditProfileModalProps) {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactInfo: {
        currentPhoneNo: employee.contactInfo?.currentPhoneNo || '',
        currentPersonalEmail: employee.contactInfo?.currentPersonalEmail || '',
        currentAddress: employee.contactInfo?.currentAddress || '',
        currentCity: employee.contactInfo?.currentCity || '',
        currentState: employee.contactInfo?.currentState || '',
        currentCountry: employee.contactInfo?.currentCountry || '',
        currentPostCode: employee.contactInfo?.currentPostCode || '',
      },
      emergencyContacts: employee.emergencyContacts?.length ? employee.emergencyContacts : [{ name: '', relation: '', phone: '' }],
    }
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => employeesApi.update(employee.id, {
      contactInfo: { ...employee.contactInfo, ...data.contactInfo },
      emergencyContacts: (data.emergencyContacts || []).map(c => ({ name: c.name, mobileNo: c.phone })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile', employee.id] });
      onClose();
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to update profile');
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Update Contact Registry</h2>
              <p className="text-xs text-slate-500 font-medium">Keep your contact and emergency details up to date.</p>
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-profile-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
            
            {/* Contact Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Primary Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                  <input {...register('contactInfo.currentPhoneNo')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.contactInfo?.currentPhoneNo && <p className="text-xs text-red-500 mt-1">{errors.contactInfo.currentPhoneNo.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Personal Email</label>
                  <input type="email" {...register('contactInfo.currentPersonalEmail')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.contactInfo?.currentPersonalEmail && <p className="text-xs text-red-500 mt-1">{errors.contactInfo.currentPersonalEmail.message}</p>}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Current Address</h3>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Address Line</label>
                <input {...register('contactInfo.currentAddress')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                {errors.contactInfo?.currentAddress && <p className="text-xs text-red-500 mt-1">{errors.contactInfo.currentAddress.message}</p>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">City</label>
                  <input {...register('contactInfo.currentCity')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.contactInfo?.currentCity && <p className="text-xs text-red-500 mt-1">{errors.contactInfo.currentCity.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">State</label>
                  <input {...register('contactInfo.currentState')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.contactInfo?.currentState && <p className="text-xs text-red-500 mt-1">{errors.contactInfo.currentState.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Country</label>
                  <input {...register('contactInfo.currentCountry')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.contactInfo?.currentCountry && <p className="text-xs text-red-500 mt-1">{errors.contactInfo.currentCountry.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Pincode</label>
                  <input {...register('contactInfo.currentPostCode')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.contactInfo?.currentPostCode && <p className="text-xs text-red-500 mt-1">{errors.contactInfo.currentPostCode.message}</p>}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Name</label>
                  <input {...register('emergencyContacts.0.name')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.emergencyContacts?.[0]?.name && <p className="text-xs text-red-500 mt-1">{errors.emergencyContacts[0].name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Relation</label>
                  <input {...register('emergencyContacts.0.relation')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.emergencyContacts?.[0]?.relation && <p className="text-xs text-red-500 mt-1">{errors.emergencyContacts[0].relation.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                  <input {...register('emergencyContacts.0.phone')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors" />
                  {errors.emergencyContacts?.[0]?.phone && <p className="text-xs text-red-500 mt-1">{errors.emergencyContacts[0].phone.message}</p>}
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button type="submit" form="edit-profile-form" disabled={mutation.isPending} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : <><Save size={16} /> Save Changes</>}
          </button>
        </div>

      </div>
    </div>
  );
}
