import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeServicesApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { Wallet } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function LoanAdvanceApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.approveLoan(id),
    onSuccess: () => { success('Approved!', 'Request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['loan-approvals'] }); queryClient.invalidateQueries({ queryKey: ['my-loans'] }); queryClient.invalidateQueries({ queryKey: ['company-loans'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.rejectLoan(id),
    onSuccess: () => { success('Rejected!', 'Request was rejected.'); queryClient.invalidateQueries({ queryKey: ['loan-approvals'] }); queryClient.invalidateQueries({ queryKey: ['my-loans'] }); queryClient.invalidateQueries({ queryKey: ['company-loans'] }); }
  });

  return (
    <ApprovalQueue
      title="Loan & Advance Approval"
      icon={Wallet}
      queryKey={['loan-approvals']}
      queryFn={async () => {
        const res = await employeeServicesApi.listLoansAll();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
