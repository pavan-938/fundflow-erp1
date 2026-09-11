import { Router } from 'express';
import { ROLE_PERMISSIONS } from '../config/permissions';
import * as challanController from '../controllers/challanController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  challanIdParamsSchema,
  challanListQuerySchema,
  createChallanSchema,
  updateChallanSchema,
} from '../schemas/challanSchemas';

const challanRouter = Router();

challanRouter.use(requireAuth);

challanRouter.get(
  '/',
  requireRole(...ROLE_PERMISSIONS.challans.read),
  validateRequest(challanListQuerySchema, 'query'),
  challanController.list,
);

challanRouter.post(
  '/',
  requireRole(...ROLE_PERMISSIONS.challans.write),
  validateRequest(createChallanSchema),
  challanController.create,
);

challanRouter.get(
  '/:id',
  requireRole(...ROLE_PERMISSIONS.challans.read),
  validateRequest(challanIdParamsSchema, 'params'),
  challanController.getById,
);

challanRouter.put(
  '/:id',
  requireRole(...ROLE_PERMISSIONS.challans.write),
  validateRequest(challanIdParamsSchema, 'params'),
  validateRequest(updateChallanSchema),
  challanController.update,
);

challanRouter.post(
  '/:id/confirm',
  requireRole(...ROLE_PERMISSIONS.challans.confirm),
  validateRequest(challanIdParamsSchema, 'params'),
  challanController.confirm,
);

challanRouter.post(
  '/:id/cancel',
  requireRole(...ROLE_PERMISSIONS.challans.cancel),
  validateRequest(challanIdParamsSchema, 'params'),
  challanController.cancel,
);

export default challanRouter;
