import { Router } from 'express';
import { ROLE_PERMISSIONS } from '../config/permissions';
import * as stockMovementController from '../controllers/stockMovementController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createStockMovementSchema,
  stockMovementListQuerySchema,
} from '../schemas/productSchemas';

const stockMovementRouter = Router();

stockMovementRouter.use(requireAuth);

stockMovementRouter.get(
  '/',
  requireRole(...ROLE_PERMISSIONS.stockMovements.read),
  validateRequest(stockMovementListQuerySchema, 'query'),
  stockMovementController.list,
);

stockMovementRouter.post(
  '/',
  requireRole(...ROLE_PERMISSIONS.stockMovements.write),
  validateRequest(createStockMovementSchema),
  stockMovementController.create,
);

export default stockMovementRouter;
