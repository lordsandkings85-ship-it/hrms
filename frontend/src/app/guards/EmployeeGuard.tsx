/**
 * EmployeeGuard — All authenticated users can access employee-level routes.
 * This guard simply passes through — AuthGuard already handles token check.
 */
export default function EmployeeGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
