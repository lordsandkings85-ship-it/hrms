import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { CreditCard } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function AdvanceClaimApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id),
    onSuccess: () => { success('Approved!', 'Request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['advance-approvals'] }); queryClient.invalidateQueries({ queryKey: ['my-expenses-list'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => expensesApi.reject(id),
    onSuccess: () => { success('Rejected!', 'Request was rejected.'); queryClient.invalidateQueries({ queryKey: ['advance-approvals'] }); queryClient.invalidateQueries({ queryKey: ['my-expenses-list'] }); }
  });

  return (
    <ApprovalQueue
      title="Advance Claim Approval"
      icon={CreditCard}
      queryKey={['advance-approvals']}
      queryFn={async () => {
        const res = await expensesApi.listForCompany();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
