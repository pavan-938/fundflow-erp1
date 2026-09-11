import { z } from 'zod';

export const customerTypeEnum = z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']);
export const customerStatusEnum = z.enum(['LEAD', 'ACTIVE', 'INACTIVE']);

const optionalEmail = z
  .union([z.string().trim().email('Valid email is required'), z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === '') return null;
    return value;
  });

const optionalGst = z
  .union([z.string().trim().max(20), z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === '') return null;
    return value;
  });

const optionalNotes = z
  .union([z.string().trim().max(5000), z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === '') return null;
    return value;
  });

const optionalFollowUpDate = z
  .union([
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'follow_up_date must be YYYY-MM-DD'),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === '') return null;
    return value;
  });

export const createCustomerSchema = z.object({
  customer_name: z.string().trim().min(1, 'Customer name is required').max(200),
  mobile_number: z.string().trim().min(1, 'Mobile number is required').max(20),
  email: optionalEmail,
  business_name: z.string().trim().min(1, 'Business name is required').max(255),
  gst_number: optionalGst,
  customer_type: customerTypeEnum,
  address: z.string().trim().min(1, 'Address is required'),
  status: customerStatusEnum.default('LEAD'),
  follow_up_date: optionalFollowUpDate,
  notes: optionalNotes,
});

export const updateCustomerSchema = createCustomerSchema;

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: customerStatusEnum.optional(),
  customer_type: customerTypeEnum.optional(),
});

export const customerIdParamsSchema = z.object({
  id: z.string().uuid('Invalid customer id'),
});

export const createFollowUpSchema = z.object({
  note: z.string().trim().min(1, 'Follow-up note is required').max(5000),
  follow_up_date: optionalFollowUpDate,
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
