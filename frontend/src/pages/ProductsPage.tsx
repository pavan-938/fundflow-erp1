import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { getProducts } from '../services/productApi';
import type { Product } from '../types';
import { canWriteInventory } from '../utils/permissions';
import { formatMoney, formatQuantity, stockStatusLabel, stockStatusTone } from '../utils/products';
import './InventoryPages.css';

const PAGE_LIMIT = 10;

export function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = user ? canWriteInventory(user.role) : false;

  const searchFromUrl = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const lowStock = searchParams.get('low_stock') === 'true';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === searchFromUrl) return;
      const params = new URLSearchParams(searchParams);
      if (next) params.set('search', next);
      else params.delete('search');
      params.set('page', '1');
      setSearchParams(params, { replace: true });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchInput, searchFromUrl, searchParams, setSearchParams]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await getProducts({ page: 1, limit: 100 });
        const unique = [...new Set(response.data.map((item) => item.category))].sort((a, b) =>
          a.localeCompare(b),
        );
        setCategories(unique);
      } catch {
        // Category options are optional enrichment; list error handling covers main failures.
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProducts({
        page,
        limit: PAGE_LIMIT,
        search: searchFromUrl || undefined,
        category: category || undefined,
        low_stock: lowStock ? true : undefined,
      });
      setProducts(response.data);
      setTotal(response.pagination.total);
      setTotalPages(Math.max(1, response.pagination.totalPages));
      setCategories((current) => {
        const merged = new Set([...current, ...response.data.map((item) => item.category)]);
        return [...merged].sort((a, b) => a.localeCompare(b));
      });
    } catch {
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
      setError('Products could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, searchFromUrl, category, lowStock]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasFilters = Boolean(searchFromUrl || category || lowStock);

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
    if (total === 0) return '0 products';
    const start = (page - 1) * PAGE_LIMIT + 1;
    const end = Math.min(page * PAGE_LIMIT, total);
    return `${start}–${end} of ${total}`;
  }, [page, total]);

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage catalog items, pricing, warehouse locations, and stock alerts.</p>
        </div>
        {canWrite ? (
          <Button onClick={() => navigate('/products/new')}>
            <Plus size={16} aria-hidden="true" />
            Add Product
          </Button>
        ) : null}
      </div>

      <Card>
        <CardBody>
          <div className="inventory-toolbar">
            <div className="search-field">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name, SKU, or category"
                aria-label="Search products"
              />
              {searchInput ? (
                <button
                  type="button"
                  className="clear-search"
                  aria-label="Clear search"
                  onClick={() => setSearchInput('')}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="filter-group">
              <label>
                <span>Category</span>
                <select
                  value={category}
                  onChange={(event) => updateParam('category', event.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Stock</span>
                <select
                  value={lowStock ? 'true' : ''}
                  onChange={(event) => updateParam('low_stock', event.target.value)}
                  aria-label="Filter by stock status"
                >
                  <option value="">All</option>
                  <option value="true">Low Stock</option>
                </select>
              </label>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="inventory-table-card">
        <CardBody>
          {loading ? (
            <div className="inventory-skeleton" aria-busy="true" aria-label="Loading products">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} height={44} />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <ErrorState title="Unable to load products" description={error} onRetry={() => void load()} />
          ) : null}

          {!loading && !error && products.length === 0 ? (
            <div className="inventory-empty">
              <EmptyState
                title={hasFilters ? 'No products match your current filters' : 'No products yet'}
                description={
                  hasFilters
                    ? 'Try adjusting search or filters to find inventory items.'
                    : 'Add your first product to start tracking warehouse stock.'
                }
              />
              {canWrite && !hasFilters ? (
                <Button onClick={() => navigate('/products/new')}>
                  <Plus size={16} aria-hidden="true" />
                  Add Product
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && products.length > 0 ? (
            <>
              <div className="table-wrap desktop-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Unit Price</th>
                      <th>Current Stock</th>
                      <th>Minimum Stock</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.product_name}</strong>
                        </td>
                        <td>{product.sku}</td>
                        <td>{product.category}</td>
                        <td>{formatMoney(product.unit_price)}</td>
                        <td>{formatQuantity(product.current_stock)}</td>
                        <td>{formatQuantity(product.minimum_stock_quantity)}</td>
                        <td>{product.warehouse_location}</td>
                        <td>
                          <Badge tone={stockStatusTone(product)}>{stockStatusLabel(product)}</Badge>
                        </td>
                        <td>
                          <div className="row-actions">
                            <Link className="text-link" to={`/products/${product.id}`}>
                              View
                            </Link>
                            {canWrite ? (
                              <Link className="text-link" to={`/products/${product.id}/edit`}>
                                Edit
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {products.map((product) => (
                  <article key={product.id} className="inventory-mobile-card">
                    <div className="mobile-card-head">
                      <div>
                        <strong>{product.product_name}</strong>
                        <p>{product.sku}</p>
                      </div>
                      <Badge tone={stockStatusTone(product)}>{stockStatusLabel(product)}</Badge>
                    </div>
                    <dl>
                      <div>
                        <dt>Category</dt>
                        <dd>{product.category}</dd>
                      </div>
                      <div>
                        <dt>Stock</dt>
                        <dd>
                          {formatQuantity(product.current_stock)} / min{' '}
                          {formatQuantity(product.minimum_stock_quantity)}
                        </dd>
                      </div>
                      <div>
                        <dt>Price</dt>
                        <dd>{formatMoney(product.unit_price)}</dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>{product.warehouse_location}</dd>
                      </div>
                    </dl>
                    <div className="row-actions">
                      <Link className="text-link" to={`/products/${product.id}`}>
                        View
                      </Link>
                      {canWrite ? (
                        <Link className="text-link" to={`/products/${product.id}/edit`}>
                          Edit
                        </Link>
                      ) : null}
                    </div>
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
    </div>
  );
}
