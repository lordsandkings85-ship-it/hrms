import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../api/client';
import { useToast } from './ui/ToastProvider';

interface ResetPasswordModalProps {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  onClose: () => void;
}

export default function ResetPasswordModal({ employeeId, employeeName, employeeEmail, onClose }: ResetPasswordModalProps) {
  const [showResult, setShowResult] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  const resetMutation = useMutation({
    mutationFn: () => employeesApi.resetPassword(employeeId, false),
    onSuccess: (data) => {
      setNewPassword(data.newPassword);
      setShowResult(true);
      queryClient.invalidateQueries({ queryKey: ['login-status'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to reset password'),
  });

  if (showResult) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Password reset successfully</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Share the new password with <strong>{employeeName}</strong>. It will not be shown again.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Email</label>
          <div className="bg-slate-100 dark:bg-slate-800 rounded px-3 py-2 text-xs font-mono">{employeeEmail}</div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">New Password</label>
          <div className="bg-slate-100 dark:bg-slate-800 rounded px-3 py-2 text-xs font-mono flex items-center justify-between">
            <span className="select-all">{newPassword}</span>
            <button
              onClick={() => navigator.clipboard.writeText(newPassword)}
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
        Reset the password for <strong>{employeeName}</strong> ({employeeEmail})?
      </p>
      <p className="text-xs text-amber-600 dark:text-amber-400">
        The old password will immediately stop working.
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="px-4 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
        >
          {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
}
