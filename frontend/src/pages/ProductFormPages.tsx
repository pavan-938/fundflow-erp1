import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ProductForm } from '../components/products/ProductForm';
import {
  emptyProductForm,
  mapProductApiFieldErrors,
  toCreateProductInput,
  toUpdateProductInput,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '../components/products/productFormUtils';
import { useToast } from '../components/toast/useToast';
import { Card, CardBody } from '../components/ui/Card';
import { ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { ApiError } from '../services/api';
import { createProduct, getProduct, updateProduct } from '../services/productApi';
import type { Product } from '../types';
import { canWriteInventory } from '../utils/permissions';
import './InventoryPages.css';

function productToForm(product: Product): ProductFormValues {
  return {
    product_name: product.product_name,
    sku: product.sku,
    category: product.category,
    unit_price: String(product.unit_price),
    minimum_stock_quantity: String(product.minimum_stock_quantity),
    warehouse_location: product.warehouse_location,
    initial_stock: '0',
  };
}

export function ProductCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [values, setValues] = useState<ProductFormValues>(emptyProductForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!user || !canWriteInventory(user.role)) {
    return (
      <Card>
        <CardBody>
          <ErrorState
            title="Access restricted"
            description="Your role cannot create products."
            onRetry={() => navigate('/products')}
          />
        </CardBody>
      </Card>
    );
  }

  const onChange = (field: keyof ProductFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProductForm(values, { includeInitialStock: true });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await createProduct(toCreateProductInput(values));
      pushToast({ tone: 'success', title: 'Product created', message: response.data.product_name });
      navigate(`/products/${response.data.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = mapProductApiFieldErrors(err.body.errors);
        setErrors({
          ...fieldErrors,
          form: Object.keys(fieldErrors).length ? undefined : err.message || 'Unable to create product.',
        });
      } else {
        setErrors({ form: 'Unable to create product. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1>Add Product</h1>
          <p>Create a catalog item and optional opening stock for the warehouse.</p>
        </div>
      </div>
      <Card>
        <CardBody>
          <ProductForm
            values={values}
            errors={errors}
            submitting={submitting}
            submitLabel="Create Product"
            showInitialStock
            onChange={onChange}
            onSubmit={(event) => void onSubmit(event)}
            onCancel={() => navigate('/products')}
          />
        </CardBody>
      </Card>
    </div>
  );
}

export function ProductEditPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [values, setValues] = useState<ProductFormValues>(emptyProductForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const response = await getProduct(id);
      setValues(productToForm(response.data));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setLoadError('This product could not be found.');
      } else {
        setLoadError('Unable to load product for editing.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || !canWriteInventory(user.role)) {
    return (
      <Card>
        <CardBody>
          <ErrorState
            title="Access restricted"
            description="Your role cannot edit products."
            onRetry={() => navigate('/products')}
          />
        </CardBody>
      </Card>
    );
  }

  const onChange = (field: keyof ProductFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProductForm(values, { includeInitialStock: false });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await updateProduct(id, toUpdateProductInput(values));
      pushToast({ tone: 'success', title: 'Product updated', message: response.data.product_name });
      navigate(`/products/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setNotFound(true);
          setErrors({ form: 'This product could not be found.' });
        } else {
          const fieldErrors = mapProductApiFieldErrors(err.body.errors);
          setErrors({
            ...fieldErrors,
            form: Object.keys(fieldErrors).length ? undefined : err.message || 'Unable to update product.',
          });
        }
      } else {
        setErrors({ form: 'Unable to update product. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1>Edit Product</h1>
          <p>Update catalog details. Adjust stock only through stock movements.</p>
        </div>
      </div>
      <Card>
        <CardBody>
          {loading ? (
            <div className="inventory-skeleton" aria-busy="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} height={40} />
              ))}
            </div>
          ) : null}

          {!loading && (loadError || notFound) ? (
            <ErrorState
              title={notFound ? 'Product not found' : 'Unable to load product'}
              description={loadError ?? undefined}
              onRetry={notFound ? () => navigate('/products') : () => void load()}
            />
          ) : null}

          {!loading && !loadError && !notFound ? (
            <ProductForm
              values={values}
              errors={errors}
              submitting={submitting}
              submitLabel="Save Changes"
              showInitialStock={false}
              onChange={onChange}
              onSubmit={(event) => void onSubmit(event)}
              onCancel={() => navigate(`/products/${id}`)}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
