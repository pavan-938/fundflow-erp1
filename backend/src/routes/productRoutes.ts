import { Router } from 'express';
import { ROLE_PERMISSIONS } from '../config/permissions';
import * as productController from '../controllers/productController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createProductSchema,
  productIdParamsSchema,
  productListQuerySchema,
  updateProductSchema,
} from '../schemas/productSchemas';

const productRouter = Router();

productRouter.use(requireAuth);

productRouter.get(
  '/',
  requireRole(...ROLE_PERMISSIONS.products.read),
  validateRequest(productListQuerySchema, 'query'),
  productController.list,
);

productRouter.post(
  '/',
  requireRole(...ROLE_PERMISSIONS.products.write),
  validateRequest(createProductSchema),
  productController.create,
);

productRouter.get(
  '/:id',
  requireRole(...ROLE_PERMISSIONS.products.read),
  validateRequest(productIdParamsSchema, 'params'),
  productController.getById,
);

productRouter.put(
  '/:id',
  requireRole(...ROLE_PERMISSIONS.products.write),
  validateRequest(productIdParamsSchema, 'params'),
  validateRequest(updateProductSchema),
  productController.update,
);

export default productRouter;
