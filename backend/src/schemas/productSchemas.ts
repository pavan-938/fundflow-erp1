import { z } from 'zod';

const moneySchema = z.coerce
  .number({ message: 'unit_price must be a number' })
  .finite('unit_price must be a valid number')
  .min(0, 'unit_price must be greater than or equal to 0');

const nonNegInt = z.coerce
  .number({ message: 'Value must be a number' })
  .int('Value must be an integer')
  .min(0, 'Value must be greater than or equal to 0');

const positiveInt = z.coerce
  .number({ message: 'quantity must be a number' })
  .int('quantity must be an integer')
  .gt(0, 'quantity must be greater than 0');

export const movementTypeEnum = z.enum(['IN', 'OUT']);

export const createProductSchema = z
  .object({
    product_name: z.string().trim().min(1, 'Product name is required').max(255),
    sku: z.string().trim().min(1, 'SKU is required').max(64),
    category: z.string().trim().min(1, 'Category is required').max(100),
    unit_price: moneySchema,
    minimum_stock_quantity: nonNegInt,
    warehouse_location: z.string().trim().min(1, 'Warehouse location is required').max(100),
    /** Opening stock recorded via an IN movement in the same transaction. */
    initial_stock: nonNegInt.optional().default(0),
  })
  .strict();

export const updateProductSchema = z
  .object({
    product_name: z.string().trim().min(1, 'Product name is required').max(255),
    sku: z.string().trim().min(1, 'SKU is required').max(64),
    category: z.string().trim().min(1, 'Category is required').max(100),
    unit_price: moneySchema,
    minimum_stock_quantity: nonNegInt,
    warehouse_location: z.string().trim().min(1, 'Warehouse location is required').max(100),
  })
  .strict();

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  low_stock: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === true || value === 'true') return true;
      if (value === false || value === 'false') return false;
      return undefined;
    }),
});

export const productIdParamsSchema = z.object({
  id: z.string().uuid('Invalid product id'),
});

export const createStockMovementSchema = z
  .object({
    product_id: z.string().uuid('Invalid product id'),
    quantity: positiveInt,
    movement_type: movementTypeEnum,
    reason: z.string().trim().min(1, 'Reason is required').max(500),
  })
  .strict();

export const stockMovementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  product_id: z.string().uuid('Invalid product id').optional(),
  movement_type: movementTypeEnum.optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type StockMovementListQuery = z.infer<typeof stockMovementListQuerySchema>;
