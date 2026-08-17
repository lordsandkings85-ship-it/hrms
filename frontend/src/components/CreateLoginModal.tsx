import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../api/client';
import { useToast } from './ui/ToastProvider';

interface CreateLoginModalProps {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  onClose: () => void;
}

export default function CreateLoginModal({ employeeId, employeeName, employeeEmail, onClose }: CreateLoginModalProps) {
  const [password, setPassword] = useState('');
  const [showGenerated, setShowGenerated] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  const createLogin = useMutation({
    mutationFn: () => employeesApi.createLogin(employeeId, password ? { password } : undefined),
    onSuccess: (data) => {
      setGeneratedPassword(data.generatedPassword);
      setShowGenerated(true);
      queryClient.invalidateQueries({ queryKey: ['login-status'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to create login'),
  });

  if (showGenerated) {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Login created successfully</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Share these credentials with <strong>{employeeName}</strong>. The password will not be shown again.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Email</label>
          <div className="bg-slate-100 dark:bg-slate-800 rounded px-3 py-2 text-xs font-mono">{employeeEmail}</div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Password</label>
          <div className="bg-slate-100 dark:bg-slate-800 rounded px-3 py-2 text-xs font-mono flex items-center justify-between">
            <span className="select-all">{generatedPassword}</span>
            <button
              onClick={() => navigator.clipboard.writeText(generatedPassword)}
              className="text-blue-600 hover:text-blue-800 text-[10px] ml-2 shrink-0"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-1.5 text-xs bg-slate-600 text-white rounded hover:bg-slate-700">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Create a login account for <strong>{employeeName}</strong> ({employeeEmail}).
        Leave password blank to use the employee ID as the default password.
      </p>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Employee Email (login identifier)
        </label>
        <div className="bg-slate-100 dark:bg-slate-800 rounded px-3 py-2 text-xs font-mono">{employeeEmail}</div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Password <span className="text-slate-400">(optional — auto-generate if blank)</span>
        </label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to use employee ID"
          className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button
          onClick={() => createLogin.mutate()}
          disabled={createLogin.isPending}
          className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {createLogin.isPending ? 'Creating...' : 'Create Login'}
        </button>
      </div>
    </div>
  );
}
