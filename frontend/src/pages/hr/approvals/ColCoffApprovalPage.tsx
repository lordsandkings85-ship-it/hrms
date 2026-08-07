import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeServicesApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { Coffee } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function ColCoffApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.approveCompOff(id),
    onSuccess: () => { success('Approved!', 'Request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['compoff-approvals'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.rejectCompOff(id),
    onSuccess: () => { success('Rejected!', 'Request was rejected.'); queryClient.invalidateQueries({ queryKey: ['compoff-approvals'] }); }
  });

  return (
    <ApprovalQueue
      title="Comp Off Approval"
      icon={Coffee}
      queryKey={['compoff-approvals']}
      queryFn={async () => {
        const res = await employeeServicesApi.listCompOffAll();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
