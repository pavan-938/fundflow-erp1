import { Router } from 'express';
import { ROLE_PERMISSIONS } from '../config/permissions';
import { requireAuth, requireRole } from '../middleware/auth';

/**
 * Temporary RBAC probe routes for Phase 3 verification.
 * Real domain modules in later phases will reuse the same middleware + matrix.
 */
const rbacRouter = Router();

rbacRouter.use(requireAuth);

rbacRouter.get('/admin', requireRole(...ROLE_PERMISSIONS.usersAdmin.read), (_req, res) => {
  res.status(200).json({ ok: true, scope: 'admin' });
});

rbacRouter.get('/customers-write', requireRole(...ROLE_PERMISSIONS.customers.write), (_req, res) => {
  res.status(200).json({ ok: true, scope: 'customers.write' });
});

rbacRouter.get('/inventory-write', requireRole(...ROLE_PERMISSIONS.products.write), (_req, res) => {
  res.status(200).json({ ok: true, scope: 'products.write' });
});

rbacRouter.get('/challans-write', requireRole(...ROLE_PERMISSIONS.challans.write), (_req, res) => {
  res.status(200).json({ ok: true, scope: 'challans.write' });
});

export default rbacRouter;
