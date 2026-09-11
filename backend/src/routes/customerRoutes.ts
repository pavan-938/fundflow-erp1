import { Router } from 'express';
import { ROLE_PERMISSIONS } from '../config/permissions';
import * as customerController from '../controllers/customerController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createCustomerSchema,
  createFollowUpSchema,
  customerIdParamsSchema,
  customerListQuerySchema,
  updateCustomerSchema,
} from '../schemas/customerSchemas';

const customerRouter = Router();

customerRouter.use(requireAuth);

customerRouter.get(
  '/',
  requireRole(...ROLE_PERMISSIONS.customers.read),
  validateRequest(customerListQuerySchema, 'query'),
  customerController.list,
);

customerRouter.post(
  '/',
  requireRole(...ROLE_PERMISSIONS.customers.write),
  validateRequest(createCustomerSchema),
  customerController.create,
);

customerRouter.get(
  '/:id',
  requireRole(...ROLE_PERMISSIONS.customers.read),
  validateRequest(customerIdParamsSchema, 'params'),
  customerController.getById,
);

customerRouter.put(
  '/:id',
  requireRole(...ROLE_PERMISSIONS.customers.write),
  validateRequest(customerIdParamsSchema, 'params'),
  validateRequest(updateCustomerSchema),
  customerController.update,
);

customerRouter.delete(
  '/:id',
  requireRole(...ROLE_PERMISSIONS.customers.delete),
  validateRequest(customerIdParamsSchema, 'params'),
  customerController.remove,
);

customerRouter.post(
  '/:id/follow-ups',
  requireRole(...ROLE_PERMISSIONS.customers.followUp),
  validateRequest(customerIdParamsSchema, 'params'),
  validateRequest(createFollowUpSchema),
  customerController.addFollowUp,
);

export default customerRouter;
