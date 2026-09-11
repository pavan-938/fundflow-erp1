import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import {
  applyProductSelection,
  ChallanForm,
  emptyChallanForm,
  toChallanPayload,
  validateChallanForm,
  type ChallanFormErrors,
  type ChallanFormValues,
} from '../components/challans/ChallanForm';
import { useToast } from '../components/toast/useToast';
import { Card, CardBody } from '../components/ui/Card';
import { ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { ApiError } from '../services/api';
import { createChallan, getChallan, updateChallan } from '../services/challanApi';
import { getCustomers } from '../services/customerApi';
import { getProducts } from '../services/productApi';
import type { Customer, Product } from '../types';
import { apiErrorMessage } from '../utils/challans';
import { canWriteChallans, canWriteCustomers } from '../utils/permissions';
import './ChallansPages.css';

async function loadLookups(): Promise<{ customers: Customer[]; products: Product[] }> {
  const [customerRes, productRes] = await Promise.all([
    getCustomers({ page: 1, limit: 100 }),
    getProducts({ page: 1, limit: 100 }),
  ]);
  return { customers: customerRes.data, products: productRes.data };
}

export function ChallanCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [values, setValues] = useState<ChallanFormValues>(emptyChallanForm);
  const [errors, setErrors] = useState<ChallanFormErrors>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await loadLookups();
      setCustomers(data.customers);
      setProducts(data.products);
    } catch {
      setLoadError('Unable to load customers and products for challan entry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || !canWriteChallans(user.role)) {
    return (
      <Card>
        <CardBody>
          <ErrorState
            title="Access restricted"
            description="Your role cannot create sales challans."
            onRetry={() => navigate('/challans')}
          />
        </CardBody>
      </Card>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateChallanForm(values);
    if (nextErrors.customer_id || nextErrors.lines || nextErrors.quantities) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await createChallan(toChallanPayload(values));
      pushToast({
        tone: 'success',
        title: 'Draft challan created successfully.',
        message: response.data.challan_number,
      });
      navigate(`/challans/${response.data.id}`);
    } catch (err) {
      setErrors({ form: apiErrorMessage(err, 'Unable to create challan.') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="challans-page">
      <div className="page-header">
        <div>
          <h1>Create Sales Challan</h1>
          <p>Select a customer and add products to create a sales challan.</p>
        </div>
      </div>

      <Card>
        <CardBody>
          {loading ? (
            <div className="challan-skeleton" aria-busy="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} height={40} />
              ))}
            </div>
          ) : null}

          {!loading && loadError ? (
            <ErrorState title="Unable to prepare challan form" description={loadError} onRetry={() => void load()} />
          ) : null}

          {!loading && !loadError ? (
            <ChallanForm
              values={values}
              errors={errors}
              customers={customers}
              products={products}
              submitting={submitting}
              submitLabel="Save as Draft"
              canLinkCustomers={canWriteCustomers(user.role)}
              onChangeCustomer={(customerId) => {
                setValues((current) => ({ ...current, customer_id: customerId }));
                setErrors((current) => ({ ...current, customer_id: undefined, form: undefined }));
              }}
              onChangeLineProduct={(key, productId) => {
                setValues((current) => ({
                  ...current,
                  lines: applyProductSelection(current.lines, key, productId),
                }));
                setErrors((current) => ({ ...current, lines: undefined, form: undefined }));
              }}
              onChangeLineQuantity={(key, quantity) => {
                setValues((current) => ({
                  ...current,
                  lines: current.lines.map((line) =>
                    line.key === key ? { ...line, quantity } : line,
                  ),
                }));
                setErrors((current) => {
                  const quantities = { ...(current.quantities ?? {}) };
                  delete quantities[key];
                  return { ...current, quantities, form: undefined };
                });
              }}
              onAddLine={() => {
                setValues((current) => ({
                  ...current,
                  lines: [...current.lines, { key: crypto.randomUUID(), product_id: '', quantity: '1' }],
                }));
              }}
              onRemoveLine={(key) => {
                setValues((current) => ({
                  ...current,
                  lines:
                    current.lines.length <= 1
                      ? current.lines
                      : current.lines.filter((line) => line.key !== key),
                }));
              }}
              onSubmit={(event) => void onSubmit(event)}
              onCancel={() => navigate('/challans')}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

export function ChallanEditPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [values, setValues] = useState<ChallanFormValues>(emptyChallanForm);
  const [errors, setErrors] = useState<ChallanFormErrors>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [notEditable, setNotEditable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    setNotEditable(false);
    try {
      const [lookups, challanRes] = await Promise.all([loadLookups(), getChallan(id)]);
      setCustomers(lookups.customers);
      setProducts(lookups.products);
      if (challanRes.data.status !== 'DRAFT') {
        setNotEditable(true);
        setLoadError('Only draft challans can be edited.');
        return;
      }
      setValues({
        customer_id: challanRes.data.customer_id,
        lines: challanRes.data.items.map((item) => ({
          key: item.id,
          product_id: item.product_id,
          quantity: String(item.quantity),
        })),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setLoadError('Challan not found.');
      } else {
        setLoadError('Unable to load challan for editing.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || !canWriteChallans(user.role)) {
    return (
      <Card>
        <CardBody>
          <ErrorState
            title="Access restricted"
            description="Your role cannot edit sales challans."
            onRetry={() => navigate('/challans')}
          />
        </CardBody>
      </Card>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateChallanForm(values);
    if (nextErrors.customer_id || nextErrors.lines || nextErrors.quantities) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await updateChallan(id, toChallanPayload(values));
      pushToast({
        tone: 'success',
        title: 'Challan updated successfully.',
        message: response.data.challan_number,
      });
      navigate(`/challans/${id}`);
    } catch (err) {
      setErrors({ form: apiErrorMessage(err, 'Unable to update challan.') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="challans-page">
      <div className="page-header">
        <div>
          <h1>Edit Sales Challan</h1>
          <p>Update draft customer and product lines. Stock is unchanged until confirmation.</p>
        </div>
      </div>

      <Card>
        <CardBody>
          {loading ? (
            <div className="challan-skeleton" aria-busy="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} height={40} />
              ))}
            </div>
          ) : null}

          {!loading && (loadError || notFound || notEditable) ? (
            <ErrorState
              title={notFound ? 'Challan not found' : notEditable ? 'Editing unavailable' : 'Unable to load challan'}
              description={loadError ?? undefined}
              onRetry={
                notFound || notEditable ? () => navigate(id ? `/challans/${id}` : '/challans') : () => void load()
              }
            />
          ) : null}

          {!loading && !loadError && !notFound && !notEditable ? (
            <ChallanForm
              values={values}
              errors={errors}
              customers={customers}
              products={products}
              submitting={submitting}
              submitLabel="Save Changes"
              canLinkCustomers={canWriteCustomers(user.role)}
              onChangeCustomer={(customerId) => {
                setValues((current) => ({ ...current, customer_id: customerId }));
                setErrors((current) => ({ ...current, customer_id: undefined, form: undefined }));
              }}
              onChangeLineProduct={(key, productId) => {
                setValues((current) => ({
                  ...current,
                  lines: applyProductSelection(current.lines, key, productId),
                }));
                setErrors((current) => ({ ...current, lines: undefined, form: undefined }));
              }}
              onChangeLineQuantity={(key, quantity) => {
                setValues((current) => ({
                  ...current,
                  lines: current.lines.map((line) =>
                    line.key === key ? { ...line, quantity } : line,
                  ),
                }));
                setErrors((current) => {
                  const quantities = { ...(current.quantities ?? {}) };
                  delete quantities[key];
                  return { ...current, quantities, form: undefined };
                });
              }}
              onAddLine={() => {
                setValues((current) => ({
                  ...current,
                  lines: [...current.lines, { key: crypto.randomUUID(), product_id: '', quantity: '1' }],
                }));
              }}
              onRemoveLine={(key) => {
                setValues((current) => ({
                  ...current,
                  lines:
                    current.lines.length <= 1
                      ? current.lines
                      : current.lines.filter((line) => line.key !== key),
                }));
              }}
              onSubmit={(event) => void onSubmit(event)}
              onCancel={() => navigate(`/challans/${id}`)}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
