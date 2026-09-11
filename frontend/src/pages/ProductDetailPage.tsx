import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { ApiError } from '../services/api';
import { getProduct } from '../services/productApi';
import type { Product } from '../types';
import { canWriteInventory } from '../utils/permissions';
import { formatMoney, formatQuantity, stockStatusLabel, stockStatusTone } from '../utils/products';
import './InventoryPages.css';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = user ? canWriteInventory(user.role) : false;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const response = await getProduct(id);
      setProduct(response.data);
    } catch (err) {
      setProduct(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setError('This product could not be found.');
      } else {
        setError('Product details could not be loaded. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="inventory-page">
      <div className="detail-nav">
        <Button variant="ghost" onClick={() => navigate('/products')} aria-label="Back to products">
          <ArrowLeft size={16} />
          Products
        </Button>
      </div>

      {loading ? (
        <div className="detail-grid" aria-busy="true">
          <Card>
            <CardBody>
              <SkeletonBlock height={28} width="40%" />
              <div style={{ height: 12 }} />
              <SkeletonBlock height={16} width="55%" />
              <div style={{ height: 20 }} />
              <SkeletonBlock height={120} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <SkeletonBlock height={180} />
            </CardBody>
          </Card>
        </div>
      ) : null}

      {!loading && error ? (
        <Card>
          <CardBody>
            <ErrorState
              title={notFound ? 'Product not found' : 'Unable to load product'}
              description={error}
              onRetry={notFound ? () => navigate('/products') : () => void load()}
            />
          </CardBody>
        </Card>
      ) : null}

      {!loading && product ? (
        <>
          <div className="page-header detail-header">
            <div>
              <div className="detail-title-row">
                <h1>{product.product_name}</h1>
                <Badge tone={stockStatusTone(product)}>{stockStatusLabel(product)}</Badge>
              </div>
              <p>{product.sku}</p>
            </div>
            {canWrite ? (
              <Button variant="secondary" onClick={() => navigate(`/products/${product.id}/edit`)}>
                <Pencil size={16} aria-hidden="true" />
                Edit
              </Button>
            ) : null}
          </div>

          <div className="detail-grid">
            <Card>
              <CardBody>
                <h2 className="section-title">Product Information</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Product Name</dt>
                    <dd>{product.product_name}</dd>
                  </div>
                  <div>
                    <dt>SKU</dt>
                    <dd>{product.sku}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{product.category}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="section-title">Pricing</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Unit Price</dt>
                    <dd>{formatMoney(product.unit_price)}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="section-title">Inventory Status</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Current Stock</dt>
                    <dd>{formatQuantity(product.current_stock)}</dd>
                  </div>
                  <div>
                    <dt>Minimum Stock</dt>
                    <dd>{formatQuantity(product.minimum_stock_quantity)}</dd>
                  </div>
                  <div>
                    <dt>Stock Status</dt>
                    <dd>
                      <Badge tone={stockStatusTone(product)}>{stockStatusLabel(product)}</Badge>
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="section-title">Location</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Warehouse Location</dt>
                    <dd>{product.warehouse_location}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </div>

          <p className="detail-footer-link">
            <Link to="/products">Back to product list</Link>
            {' · '}
            <Link to="/stock-movements">View stock movements</Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
