import { Users, FileText, Handshake } from 'lucide-react';
import { ConfigEditor } from '../../../../components/ui/ConfigEditor';

export function PanelSection() {
  return (
    <ConfigEditor
      storageKey="recruitment-panel" backendKey="recruitmentPanel"
      title="Recruitment Panel Members"
      icon={Users}
      subtitle="Interview panel members"
      defaultRows={[{ id: 'panel1', name: 'HR Manager', role: 'Interviewer', email: 'hr@lordsandkings.co' }]}
      fields={[
        { key: 'name', label: 'Name', placeholder: 'Member name' },
        { key: 'role', label: 'Role', placeholder: 'e.g. Interviewer' },
        { key: 'email', label: 'Email', placeholder: 'Email' },
      ]}
    />
  );
}

export function JobDescriptionSection() {
  return (
    <ConfigEditor
      storageKey="recruitment-jd" backendKey="recruitmentJd"
      title="Job Descriptions"
      icon={FileText}
      subtitle="Job description templates"
      defaultRows={[{ id: 'jd1', title: 'Software Engineer', content: 'Build and maintain web applications.' }]}
      fields={[
        { key: 'title', label: 'Title', placeholder: 'Job title' },
        { key: 'content', label: 'Description', placeholder: 'JD summary' },
      ]}
    />
  );
}

export function ConsultantsSection() {
  return (
    <ConfigEditor
      storageKey="recruitment-consultants" backendKey="recruitmentConsultants"
      title="Consultant Registration"
      icon={Handshake}
      subtitle="Recruitment consultants and agencies"
      defaultRows={[{ id: 'c1', name: 'Agency A', contact: 'contact@agency.com', focus: 'IT' }]}
      fields={[
        { key: 'name', label: 'Name', placeholder: 'Consultant / agency' },
        { key: 'contact', label: 'Contact', placeholder: 'Email / phone' },
        { key: 'focus', label: 'Focus', placeholder: 'Domain focus' },
      ]}
    />
  );
}
