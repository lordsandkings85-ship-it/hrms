/**
 * HrGuard — Restricts access to HR-level users.
 * HR Managers and above can access HR-specific workflows.
 * Same logic as AdminGuard — HR role shares access with admin routes.
 */
export { default } from './AdminGuard';
