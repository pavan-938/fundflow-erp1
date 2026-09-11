import { z } from 'zod';

export const challanStatusEnum = z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']);

const challanItemSchema = z
  .object({
    product_id: z.string().uuid('Invalid product id'),
    quantity: z.coerce.number().int('quantity must be an integer').gt(0, 'quantity must be greater than 0'),
  })
  .strict();

export const createChallanSchema = z
  .object({
    customer_id: z.string().uuid('Invalid customer id'),
    items: z.array(challanItemSchema).min(1, 'At least one item is required'),
  })
  .strict();

export const updateChallanSchema = createChallanSchema;

export const challanListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: challanStatusEnum.optional(),
  customer_id: z.string().uuid('Invalid customer id').optional(),
  search: z.string().trim().optional(),
});

export const challanIdParamsSchema = z.object({
  id: z.string().uuid('Invalid challan id'),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>;
export type ChallanListQuery = z.infer<typeof challanListQuerySchema>;
export type ChallanItemInput = z.infer<typeof challanItemSchema>;
