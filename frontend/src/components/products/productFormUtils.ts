import type { CreateProductInput, UpdateProductInput } from '../../types';

export type ProductFormValues = {
  product_name: string;
  sku: string;
  category: string;
  unit_price: string;
  minimum_stock_quantity: string;
  warehouse_location: string;
  initial_stock: string;
};

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>> & {
  form?: string;
};

export const emptyProductForm = (): ProductFormValues => ({
  product_name: '',
  sku: '',
  category: '',
  unit_price: '',
  minimum_stock_quantity: '0',
  warehouse_location: '',
  initial_stock: '0',
});

export function validateProductForm(
  values: ProductFormValues,
  options: { includeInitialStock: boolean },
): ProductFormErrors {
  const errors: ProductFormErrors = {};

  if (!values.product_name.trim()) errors.product_name = 'Product name is required';
  else if (values.product_name.trim().length > 255) errors.product_name = 'Maximum 255 characters';

  if (!values.sku.trim()) errors.sku = 'SKU is required';
  else if (values.sku.trim().length > 64) errors.sku = 'Maximum 64 characters';

  if (!values.category.trim()) errors.category = 'Category is required';
  else if (values.category.trim().length > 100) errors.category = 'Maximum 100 characters';

  const unitPrice = Number(values.unit_price);
  if (values.unit_price.trim() === '' || Number.isNaN(unitPrice)) {
    errors.unit_price = 'Unit price must be a number';
  } else if (unitPrice < 0) {
    errors.unit_price = 'Unit price must be greater than or equal to 0';
  }

  const minStock = Number(values.minimum_stock_quantity);
  if (values.minimum_stock_quantity.trim() === '' || Number.isNaN(minStock) || !Number.isInteger(minStock)) {
    errors.minimum_stock_quantity = 'Minimum stock must be a whole number';
  } else if (minStock < 0) {
    errors.minimum_stock_quantity = 'Minimum stock must be greater than or equal to 0';
  }

  if (!values.warehouse_location.trim()) errors.warehouse_location = 'Warehouse location is required';
  else if (values.warehouse_location.trim().length > 100) {
    errors.warehouse_location = 'Maximum 100 characters';
  }

  if (options.includeInitialStock) {
    const initial = Number(values.initial_stock);
    if (values.initial_stock.trim() === '' || Number.isNaN(initial) || !Number.isInteger(initial)) {
      errors.initial_stock = 'Initial stock must be a whole number';
    } else if (initial < 0) {
      errors.initial_stock = 'Initial stock must be greater than or equal to 0';
    }
  }

  return errors;
}

export function toCreateProductInput(values: ProductFormValues): CreateProductInput {
  return {
    product_name: values.product_name.trim(),
    sku: values.sku.trim(),
    category: values.category.trim(),
    unit_price: Number(values.unit_price),
    minimum_stock_quantity: Number(values.minimum_stock_quantity),
    warehouse_location: values.warehouse_location.trim(),
    initial_stock: Number(values.initial_stock),
  };
}

export function toUpdateProductInput(values: ProductFormValues): UpdateProductInput {
  return {
    product_name: values.product_name.trim(),
    sku: values.sku.trim(),
    category: values.category.trim(),
    unit_price: Number(values.unit_price),
    minimum_stock_quantity: Number(values.minimum_stock_quantity),
    warehouse_location: values.warehouse_location.trim(),
  };
}

export function mapProductApiFieldErrors(errors: unknown): ProductFormErrors {
  if (!Array.isArray(errors)) return {};
  const mapped: ProductFormErrors = {};
  for (const item of errors) {
    if (!item || typeof item !== 'object') continue;
    const field = 'field' in item && typeof item.field === 'string' ? item.field : undefined;
    const message = 'message' in item && typeof item.message === 'string' ? item.message : undefined;
    if (field && message && field in emptyProductForm()) {
      mapped[field as keyof ProductFormValues] = message;
    }
  }
  return mapped;
}
