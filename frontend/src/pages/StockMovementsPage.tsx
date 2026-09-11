import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../components/toast/useToast';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { ApiError } from '../services/api';
import { getProducts } from '../services/productApi';
import { createStockMovement, getStockMovements } from '../services/stockMovementApi';
import type { MovementType, Product, StockMovement } from '../types';
import { canWriteInventory, formatDateTime } from '../utils/permissions';
import {
  formatQuantity,
  movementTypeLabel,
  movementTypeTone,
} from '../utils/products';
import './InventoryPages.css';

const PAGE_LIMIT = 10;

type MovementFormValues = {
  product_id: string;
  movement_type: MovementType | '';
  quantity: string;
  reason: string;
};

const emptyMovementForm = (): MovementFormValues => ({
  product_id: '',
  movement_type: '',
  quantity: '',
  reason: '',
});

function insufficientStockMessage(err: ApiError): string {
  const details = err.body.errors;
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const available = (details as { available?: unknown }).available;
    if (typeof available === 'number') {
      return `Insufficient stock. Available quantity: ${available}.`;
    }
  }
  return err.message || 'Insufficient stock for this movement.';
}

export function StockMovementsPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = user ? canWriteInventory(user.role) : false;

  const productId = searchParams.get('product_id') ?? '';
  const movementType = (searchParams.get('movement_type') ?? '') as MovementType | '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MovementFormValues>(emptyMovementForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MovementFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find((item) => item.id === form.product_id) ?? null;

  useEffect(() => {
    void (async () => {
      try {
        const response = await getProducts({ page: 1, limit: 100 });
        setProducts(response.data);
      } catch {
        // Product options load separately from the movement list.
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getStockMovements({
        page,
        limit: PAGE_LIMIT,
        product_id: productId || undefined,
        movement_type: movementType === 'IN' || movementType === 'OUT' ? movementType : undefined,
      });
      setMovements(response.data);
      setTotal(response.pagination.total);
      setTotalPages(Math.max(1, response.pagination.totalPages));
    } catch {
      setMovements([]);
      setTotal(0);
      setTotalPages(1);
      setError('Stock movements could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, productId, movementType]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasFilters = Boolean(productId || movementType);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(nextPage));
    setSearchParams(params);
  };

  const paginationLabel = useMemo(() => {
    if (total === 0) return '0 movements';
    const start = (page - 1) * PAGE_LIMIT + 1;
    const end = Math.min(page * PAGE_LIMIT, total);
    return `${start}–${end} of ${total}`;
  }, [page, total]);

  const openModal = () => {
    setForm(emptyMovementForm());
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof MovementFormValues, string>> = {};
    if (!form.product_id) nextErrors.product_id = 'Product is required';
    if (!form.movement_type) nextErrors.movement_type = 'Movement type is required';
    const quantity = Number(form.quantity);
    if (!form.quantity.trim() || Number.isNaN(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      nextErrors.quantity = 'Quantity must be a whole number greater than 0';
    }
    if (!form.reason.trim()) nextErrors.reason = 'Reason is required';
    else if (form.reason.trim().length > 500) nextErrors.reason = 'Maximum 500 characters';

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await createStockMovement({
        product_id: form.product_id,
        movement_type: form.movement_type as MovementType,
        quantity,
        reason: form.reason.trim(),
      });
      pushToast({
        tone: 'success',
        title: 'Stock movement recorded',
        message: `${movementTypeLabel(form.movement_type as MovementType)} · ${quantity}`,
      });
      setModalOpen(false);
      setForm(emptyMovementForm());
      // Refresh product options so available stock is current for the next OUT.
      try {
        const refreshed = await getProducts({ page: 1, limit: 100 });
        setProducts(refreshed.data);
      } catch {
        // List refresh below is primary.
      }
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setFormError(insufficientStockMessage(err));
        } else if (Array.isArray(err.body.errors)) {
          const mapped: Partial<Record<keyof MovementFormValues, string>> = {};
          for (const item of err.body.errors) {
            if (!item || typeof item !== 'object') continue;
            const field = 'field' in item && typeof item.field === 'string' ? item.field : undefined;
            const message = 'message' in item && typeof item.message === 'string' ? item.message : undefined;
            if (field && message && field in emptyMovementForm()) {
              mapped[field as keyof MovementFormValues] = message;
            }
          }
          setFieldErrors(mapped);
          if (!Object.keys(mapped).length) {
            setFormError(err.message || 'Unable to record stock movement.');
          }
        } else {
          setFormError(err.message || 'Unable to record stock movement.');
        }
      } else {
        setFormError('Unable to record stock movement. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1>Stock Movements</h1>
          <p>Audit trail for inventory receipts and issues across the warehouse.</p>
        </div>
        {canWrite ? (
          <Button onClick={openModal}>
            <Plus size={16} aria-hidden="true" />
            Record Stock Movement
          </Button>
        ) : null}
      </div>

      <Card>
        <CardBody>
          <div className="inventory-toolbar">
            <div className="filter-group full-width">
              <label>
                <span>Product</span>
                <select
                  value={productId}
                  onChange={(event) => updateParam('product_id', event.target.value)}
                  aria-label="Filter by product"
                >
                  <option value="">All products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.product_name} ({product.sku})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Movement Type</span>
                <select
                  value={movementType}
                  onChange={(event) => updateParam('movement_type', event.target.value)}
                  aria-label="Filter by movement type"
                >
                  <option value="">All</option>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </label>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="inventory-table-card">
        <CardBody>
          {loading ? (
            <div className="inventory-skeleton" aria-busy="true" aria-label="Loading stock movements">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} height={44} />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <ErrorState title="Unable to load stock movements" description={error} onRetry={() => void load()} />
          ) : null}

          {!loading && !error && movements.length === 0 ? (
            <div className="inventory-empty">
              <EmptyState
                title={hasFilters ? 'No movements match your current filters' : 'No stock movements yet'}
                description={
                  hasFilters
                    ? 'Try adjusting product or movement type filters.'
                    : 'Record an IN or OUT movement to start the inventory audit trail.'
                }
              />
              {canWrite && !hasFilters ? (
                <Button onClick={openModal}>
                  <Plus size={16} aria-hidden="true" />
                  Record Stock Movement
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && movements.length > 0 ? (
            <>
              <div className="table-wrap desktop-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Movement Type</th>
                      <th>Quantity</th>
                      <th>Reason</th>
                      <th>Created By</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td>
                          <strong>{movement.product_name}</strong>
                        </td>
                        <td>{movement.sku}</td>
                        <td>
                          <Badge tone={movementTypeTone(movement.movement_type)}>
                            {movement.movement_type}
                            <span className="sr-only"> ({movementTypeLabel(movement.movement_type)})</span>
                          </Badge>
                        </td>
                        <td>
                          <span
                            className={
                              movement.movement_type === 'IN' ? 'qty-positive' : 'qty-negative'
                            }
                          >
                            {movement.movement_type === 'IN' ? '+' : '−'}
                            {formatQuantity(movement.quantity_changed)}
                          </span>
                        </td>
                        <td>{movement.reason}</td>
                        <td>{movement.created_by_name}</td>
                        <td>{formatDateTime(String(movement.created_at))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {movements.map((movement) => (
                  <article key={movement.id} className="inventory-mobile-card">
                    <div className="mobile-card-head">
                      <div>
                        <strong>{movement.product_name}</strong>
                        <p>{movement.sku}</p>
                      </div>
                      <Badge tone={movementTypeTone(movement.movement_type)}>
                        {movement.movement_type}
                      </Badge>
                    </div>
                    <dl>
                      <div>
                        <dt>Quantity</dt>
                        <dd>
                          {movement.movement_type === 'IN' ? '+' : '−'}
                          {formatQuantity(movement.quantity_changed)}
                        </dd>
                      </div>
                      <div>
                        <dt>Reason</dt>
                        <dd>{movement.reason}</dd>
                      </div>
                      <div>
                        <dt>Created By</dt>
                        <dd>{movement.created_by_name}</dd>
                      </div>
                      <div>
                        <dt>Timestamp</dt>
                        <dd>{formatDateTime(String(movement.created_at))}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>

              <div className="pagination-bar">
                <span>{paginationLabel}</span>
                <div className="pagination-actions">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    aria-label="Previous page"
                  >
                    Previous
                  </Button>
                  <span className="page-indicator">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        title="Record Stock Movement"
        description="Create an IN or OUT movement. Stock balances are updated by the backend."
        onClose={closeModal}
      >
        <form className="inventory-form" onSubmit={(event) => void onSubmit(event)} noValidate>
          {formError ? (
            <div className="form-banner" role="alert">
              {formError}
            </div>
          ) : null}

          <Select
            label="Product *"
            name="product_id"
            value={form.product_id}
            onChange={(event) => {
              setForm((current) => ({ ...current, product_id: event.target.value }));
              setFieldErrors((current) => ({ ...current, product_id: undefined }));
              setFormError(null);
            }}
            error={fieldErrors.product_id}
            options={[
              { value: '', label: 'Select a product' },
              ...products.map((product) => ({
                value: product.id,
                label: `${product.product_name} (${product.sku})`,
              })),
            ]}
            required
          />

          <Select
            label="Movement Type *"
            name="movement_type"
            value={form.movement_type}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                movement_type: event.target.value as MovementType | '',
              }));
              setFieldErrors((current) => ({ ...current, movement_type: undefined }));
              setFormError(null);
            }}
            error={fieldErrors.movement_type}
            options={[
              { value: '', label: 'Select type' },
              { value: 'IN', label: 'IN — Stock received' },
              { value: 'OUT', label: 'OUT — Stock issued' },
            ]}
            required
          />

          {form.movement_type === 'OUT' && selectedProduct ? (
            <p className="stock-hint" role="status">
              Available stock: <strong>{formatQuantity(selectedProduct.current_stock)}</strong>
              <span className="muted"> (informational — backend validates at submit)</span>
            </p>
          ) : null}

          <Input
            label="Quantity *"
            name="quantity"
            type="number"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(event) => {
              setForm((current) => ({ ...current, quantity: event.target.value }));
              setFieldErrors((current) => ({ ...current, quantity: undefined }));
              setFormError(null);
            }}
            error={fieldErrors.quantity}
            required
          />

          <TextArea
            label="Reason *"
            name="reason"
            value={form.reason}
            onChange={(event) => {
              setForm((current) => ({ ...current, reason: event.target.value }));
              setFieldErrors((current) => ({ ...current, reason: undefined }));
              setFormError(null);
            }}
            error={fieldErrors.reason}
            maxLength={500}
            rows={3}
            required
          />

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record Movement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
