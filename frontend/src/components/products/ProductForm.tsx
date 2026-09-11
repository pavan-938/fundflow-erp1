import type { FormEvent } from 'react';
import { Input } from '../ui/Input';
import type { ProductFormErrors, ProductFormValues } from './productFormUtils';

type ProductFormProps = {
  values: ProductFormValues;
  errors: ProductFormErrors;
  submitting: boolean;
  submitLabel: string;
  showInitialStock: boolean;
  onChange: (field: keyof ProductFormValues, value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

export function ProductForm({
  values,
  errors,
  submitting,
  submitLabel,
  showInitialStock,
  onChange,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  return (
    <form className="inventory-form" onSubmit={onSubmit} noValidate>
      {errors.form ? (
        <div className="form-banner" role="alert">
          {errors.form}
        </div>
      ) : null}

      <section className="form-section">
        <header>
          <h2>Product Information</h2>
          <p>Catalog identity used across inventory and sales workflows.</p>
        </header>
        <div className="form-grid">
          <Input
            label="Product Name *"
            name="product_name"
            value={values.product_name}
            onChange={(event) => onChange('product_name', event.target.value)}
            error={errors.product_name}
            maxLength={255}
            required
          />
          <Input
            label="SKU / Product Code *"
            name="sku"
            value={values.sku}
            onChange={(event) => onChange('sku', event.target.value)}
            error={errors.sku}
            maxLength={64}
            required
          />
          <Input
            label="Category *"
            name="category"
            value={values.category}
            onChange={(event) => onChange('category', event.target.value)}
            error={errors.category}
            maxLength={100}
            required
          />
          <Input
            label="Unit Price *"
            name="unit_price"
            type="number"
            min={0}
            step="0.01"
            value={values.unit_price}
            onChange={(event) => onChange('unit_price', event.target.value)}
            error={errors.unit_price}
            required
          />
        </div>
      </section>

      <section className="form-section">
        <header>
          <h2>Inventory Settings</h2>
          <p>Stock alerts and warehouse placement. Current stock changes via movements only.</p>
        </header>
        <div className="form-grid">
          <Input
            label="Minimum Stock Alert Quantity *"
            name="minimum_stock_quantity"
            type="number"
            min={0}
            step={1}
            value={values.minimum_stock_quantity}
            onChange={(event) => onChange('minimum_stock_quantity', event.target.value)}
            error={errors.minimum_stock_quantity}
            required
          />
          <Input
            label="Location / Warehouse *"
            name="warehouse_location"
            value={values.warehouse_location}
            onChange={(event) => onChange('warehouse_location', event.target.value)}
            error={errors.warehouse_location}
            maxLength={100}
            required
          />
          {showInitialStock ? (
            <div data-span="full">
              <Input
                label="Opening / Initial Stock"
                name="initial_stock"
                type="number"
                min={0}
                step={1}
                value={values.initial_stock}
                onChange={(event) => onChange('initial_stock', event.target.value)}
                error={errors.initial_stock}
              />
              <p className="field-hint">
                Optional opening quantity. When provided, the backend records it as an IN stock movement.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
