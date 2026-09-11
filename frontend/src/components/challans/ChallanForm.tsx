import { useMemo, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import type { Customer, Product } from '../../types';
import { formatMoney, formatQuantity } from '../../utils/products';

export type ChallanLine = {
  key: string;
  product_id: string;
  quantity: string;
};

export type ChallanFormValues = {
  customer_id: string;
  lines: ChallanLine[];
};

export type ChallanFormErrors = {
  form?: string;
  customer_id?: string;
  lines?: string;
  quantities?: Record<string, string>;
};

type ChallanFormProps = {
  values: ChallanFormValues;
  errors: ChallanFormErrors;
  customers: Customer[];
  products: Product[];
  submitting: boolean;
  submitLabel: string;
  canLinkCustomers: boolean;
  onChangeCustomer: (customerId: string) => void;
  onChangeLineProduct: (key: string, productId: string) => void;
  onChangeLineQuantity: (key: string, quantity: string) => void;
  onAddLine: () => void;
  onRemoveLine: (key: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

export function emptyChallanForm(): ChallanFormValues {
  return {
    customer_id: '',
    lines: [{ key: crypto.randomUUID(), product_id: '', quantity: '1' }],
  };
}

export function validateChallanForm(values: ChallanFormValues): ChallanFormErrors {
  const errors: ChallanFormErrors = { quantities: {} };
  if (!values.customer_id) errors.customer_id = 'Customer is required';

  const activeLines = values.lines.filter((line) => line.product_id);
  if (activeLines.length === 0) errors.lines = 'Add at least one product';

  for (const line of values.lines) {
    if (!line.product_id) continue;
    const qty = Number(line.quantity);
    if (!line.quantity.trim() || Number.isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
      errors.quantities![line.key] = 'Enter a whole number greater than 0';
    }
  }

  if (errors.quantities && Object.keys(errors.quantities).length === 0) {
    delete errors.quantities;
  }
  return errors;
}

export function toChallanPayload(values: ChallanFormValues) {
  const merged = new Map<string, number>();
  for (const line of values.lines) {
    if (!line.product_id) continue;
    const qty = Number(line.quantity);
    merged.set(line.product_id, (merged.get(line.product_id) ?? 0) + qty);
  }
  return {
    customer_id: values.customer_id,
    items: [...merged.entries()].map(([product_id, quantity]) => ({ product_id, quantity })),
  };
}

export function ChallanForm({
  values,
  errors,
  customers,
  products,
  submitting,
  submitLabel,
  canLinkCustomers,
  onChangeCustomer,
  onChangeLineProduct,
  onChangeLineQuantity,
  onAddLine,
  onRemoveLine,
  onSubmit,
  onCancel,
}: ChallanFormProps) {
  const selectedCustomer = customers.find((item) => item.id === values.customer_id) ?? null;
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);

  const totals = useMemo(() => {
    let productCount = 0;
    let quantity = 0;
    for (const line of values.lines) {
      if (!line.product_id) continue;
      productCount += 1;
      const qty = Number(line.quantity);
      if (!Number.isNaN(qty) && qty > 0) quantity += qty;
    }
    return { productCount, quantity };
  }, [values.lines]);

  const usedProductIds = new Set(values.lines.map((line) => line.product_id).filter(Boolean));

  return (
    <form className="challan-form" onSubmit={onSubmit} noValidate>
      {errors.form ? (
        <div className="form-banner" role="alert">
          {errors.form}
        </div>
      ) : null}

      <section className="challan-card">
        <header>
          <h2>Customer</h2>
          <p>Select the account receiving this sales challan.</p>
        </header>

        {customers.length === 0 ? (
          <div className="inline-empty">
            <strong>No customers available</strong>
            <p>Create a customer in CRM before issuing a challan.</p>
            {canLinkCustomers ? (
              <Link className="text-link" to="/customers/new">
                Add Customer
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <Select
              label="Customer *"
              name="customer_id"
              value={values.customer_id}
              onChange={(event) => onChangeCustomer(event.target.value)}
              error={errors.customer_id}
              options={[
                { value: '', label: 'Select a customer' },
                ...customers.map((customer) => ({
                  value: customer.id,
                  label: `${customer.customer_name} — ${customer.business_name}`,
                })),
              ]}
              required
            />
            {selectedCustomer ? (
              <dl className="selected-customer">
                <div>
                  <dt>Business</dt>
                  <dd>{selectedCustomer.business_name}</dd>
                </div>
                <div>
                  <dt>Mobile</dt>
                  <dd>{selectedCustomer.mobile_number}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{selectedCustomer.email || '—'}</dd>
                </div>
              </dl>
            ) : null}
          </>
        )}
      </section>

      <section className="challan-card">
        <header className="section-head-row">
          <div>
            <h2>Products</h2>
            <p>Add multiple line items. Stock is informational until confirmation.</p>
          </div>
          <Button type="button" variant="secondary" onClick={onAddLine} disabled={submitting}>
            <Plus size={16} aria-hidden="true" />
            Add Product
          </Button>
        </header>

        {errors.lines ? <p className="field-error">{errors.lines}</p> : null}

        <div className="table-wrap desktop-table">
          <table className="data-table challan-lines-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Available Stock</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {values.lines.map((line) => {
                const product = line.product_id ? productById.get(line.product_id) : undefined;
                const qty = Number(line.quantity);
                const exceeds =
                  product && !Number.isNaN(qty) && qty > 0 && qty > product.current_stock;
                return (
                  <tr key={line.key}>
                    <td>
                      <select
                        aria-label="Select product"
                        value={line.product_id}
                        onChange={(event) => onChangeLineProduct(line.key, event.target.value)}
                        disabled={submitting}
                      >
                        <option value="">Select product</option>
                        {products.map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                            disabled={usedProductIds.has(item.id) && item.id !== line.product_id}
                          >
                            {item.product_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{product?.sku ?? '—'}</td>
                    <td>{product ? formatQuantity(product.current_stock) : '—'}</td>
                    <td>{product ? formatMoney(product.unit_price) : '—'}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={line.quantity}
                        onChange={(event) => onChangeLineQuantity(line.key, event.target.value)}
                        aria-label="Quantity"
                        disabled={submitting || !line.product_id}
                      />
                      {exceeds ? (
                        <span className="line-warning">
                          Requested quantity exceeds currently available stock.
                        </span>
                      ) : null}
                      {errors.quantities?.[line.key] ? (
                        <span className="field-error">{errors.quantities[line.key]}</span>
                      ) : null}
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label="Remove line"
                        onClick={() => onRemoveLine(line.key)}
                        disabled={submitting || values.lines.length <= 1}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mobile-cards">
          {values.lines.map((line) => {
            const product = line.product_id ? productById.get(line.product_id) : undefined;
            const qty = Number(line.quantity);
            const exceeds =
              product && !Number.isNaN(qty) && qty > 0 && qty > product.current_stock;
            return (
              <article key={line.key} className="challan-line-card">
                <Select
                  label="Product"
                  name={`product_${line.key}`}
                  value={line.product_id}
                  onChange={(event) => onChangeLineProduct(line.key, event.target.value)}
                  options={[
                    { value: '', label: 'Select product' },
                    ...products.map((item) => ({
                      value: item.id,
                      label: item.product_name,
                    })),
                  ]}
                />
                <dl>
                  <div>
                    <dt>SKU</dt>
                    <dd>{product?.sku ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Available Stock</dt>
                    <dd>{product ? formatQuantity(product.current_stock) : '—'}</dd>
                  </div>
                  <div>
                    <dt>Unit Price</dt>
                    <dd>{product ? formatMoney(product.unit_price) : '—'}</dd>
                  </div>
                </dl>
                <label className="field">
                  <span>Quantity *</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={line.quantity}
                    onChange={(event) => onChangeLineQuantity(line.key, event.target.value)}
                    disabled={submitting || !line.product_id}
                  />
                </label>
                {exceeds ? (
                  <p className="line-warning">Requested quantity exceeds currently available stock.</p>
                ) : null}
                {errors.quantities?.[line.key] ? (
                  <p className="field-error">{errors.quantities[line.key]}</p>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onRemoveLine(line.key)}
                  disabled={submitting || values.lines.length <= 1}
                >
                  Remove
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="challan-card summary-card">
        <h2>Summary</h2>
        <dl className="summary-grid">
          <div>
            <dt>Total Products</dt>
            <dd>{totals.productCount}</dd>
          </div>
          <div>
            <dt>Total Quantity</dt>
            <dd>{totals.quantity}</dd>
          </div>
        </dl>
      </section>

      <div className="form-actions sticky-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || customers.length === 0}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Helper hook-free updater used by pages for duplicate-safe product selection. */
export function applyProductSelection(
  lines: ChallanLine[],
  key: string,
  productId: string,
): ChallanLine[] {
  if (!productId) {
    return lines.map((line) => (line.key === key ? { ...line, product_id: '' } : line));
  }
  const existing = lines.find((line) => line.product_id === productId && line.key !== key);
  if (existing) {
    // Prefer preventing duplicates: ignore selecting a product already on another line.
    return lines;
  }
  return lines.map((line) => (line.key === key ? { ...line, product_id: productId } : line));
}
