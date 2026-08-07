import AdvancedEmployeeForm from './AdvancedEmployeeForm';

interface AddEmployeeModalProps {
  onClose: () => void;
}

export default function AddEmployeeModal({ onClose }: AddEmployeeModalProps) {
  return <AdvancedEmployeeForm onClose={onClose} />;
}
