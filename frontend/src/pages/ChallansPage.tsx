import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { getChallans } from '../services/challanApi';
import type { ChallanListItem, ChallanStatus } from '../types';
import { challanStatusLabel, challanStatusTone } from '../utils/challans';
import { canWriteChallans, formatDateTime } from '../utils/permissions';
import { formatQuantity } from '../utils/products';
import './ChallansPages.css';

const PAGE_LIMIT = 10;

function parseStatus(value: string | null): ChallanStatus | '' {
  if (value === 'DRAFT' || value === 'CONFIRMED' || value === 'CANCELLED') return value;
  return '';
}

export function ChallansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = user ? canWriteChallans(user.role) : false;

  const searchFromUrl = searchParams.get('search') ?? '';
  const status = parseStatus(searchParams.get('status'));
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [challans, setChallans] = useState<ChallanListItem[]>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getChallans({
        page,
        limit: PAGE_LIMIT,
        search: searchFromUrl || undefined,
        status: status || undefined,
      });
      setChallans(response.data);
      setTotal(response.pagination.total);
      setTotalPages(Math.max(1, response.pagination.totalPages));
    } catch {
      setChallans([]);
      setTotal(0);
      setTotalPages(1);
      setError('Sales challans could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, searchFromUrl, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasFilters = Boolean(searchFromUrl || status);

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
    if (total === 0) return '0 challans';
    const start = (page - 1) * PAGE_LIMIT + 1;
    const end = Math.min(page * PAGE_LIMIT, total);
    return `${start}–${end} of ${total}`;
  }, [page, total]);

  return (
    <div className="challans-page">
      <div className="page-header">
        <div>
          <h1>Sales Challans</h1>
          <p>Create, manage and track customer sales challans.</p>
        </div>
        {canWrite ? (
          <Button onClick={() => navigate('/challans/new')}>
            <Plus size={16} aria-hidden="true" />
            New Challan
          </Button>
        ) : null}
      </div>

      <Card>
        <CardBody>
          <div className="challan-toolbar">
            <div className="search-field">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search challan number"
                aria-label="Search challans"
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
                <span>Status</span>
                <select
                  value={status}
                  onChange={(event) => updateParam('status', event.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="challan-table-card">
        <CardBody>
          {loading ? (
            <div className="challan-skeleton" aria-busy="true" aria-label="Loading challans">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} height={44} />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <ErrorState title="Unable to load challans" description={error} onRetry={() => void load()} />
          ) : null}

          {!loading && !error && challans.length === 0 ? (
            <div className="challan-empty">
              <EmptyState
                title={hasFilters ? 'No challans match your current filters' : 'No sales challans yet'}
                description={
                  hasFilters
                    ? 'Try adjusting search or status filters.'
                    : 'Create your first challan to start tracking customer sales.'
                }
              />
              {canWrite && !hasFilters ? (
                <Button onClick={() => navigate('/challans/new')}>
                  <Plus size={16} aria-hidden="true" />
                  New Challan
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && challans.length > 0 ? (
            <>
              <div className="table-wrap desktop-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Challan Number</th>
                      <th>Customer</th>
                      <th>Total Quantity</th>
                      <th>Status</th>
                      <th>Created By</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challans.map((challan) => (
                      <tr key={challan.id}>
                        <td>
                          <strong>{challan.challan_number}</strong>
                        </td>
                        <td>
                          <strong>{challan.customer_name}</strong>
                          <div className="muted">{challan.business_name}</div>
                        </td>
                        <td>{formatQuantity(challan.total_quantity)}</td>
                        <td>
                          <Badge tone={challanStatusTone(challan.status)}>
                            {challanStatusLabel(challan.status)}
                          </Badge>
                        </td>
                        <td>{challan.created_by_name}</td>
                        <td>{formatDateTime(String(challan.created_at))}</td>
                        <td>
                          <div className="row-actions">
                            <Link className="text-link" to={`/challans/${challan.id}`}>
                              View
                            </Link>
                            {canWrite && challan.status === 'DRAFT' ? (
                              <Link className="text-link" to={`/challans/${challan.id}/edit`}>
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
                {challans.map((challan) => (
                  <article key={challan.id} className="challan-mobile-card">
                    <div className="mobile-card-head">
                      <div>
                        <strong>{challan.challan_number}</strong>
                        <p>{challan.customer_name}</p>
                      </div>
                      <Badge tone={challanStatusTone(challan.status)}>
                        {challanStatusLabel(challan.status)}
                      </Badge>
                    </div>
                    <dl>
                      <div>
                        <dt>Business</dt>
                        <dd>{challan.business_name}</dd>
                      </div>
                      <div>
                        <dt>Quantity</dt>
                        <dd>{formatQuantity(challan.total_quantity)}</dd>
                      </div>
                      <div>
                        <dt>Created By</dt>
                        <dd>{challan.created_by_name}</dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>{formatDateTime(String(challan.created_at))}</dd>
                      </div>
                    </dl>
                    <div className="row-actions">
                      <Link className="text-link" to={`/challans/${challan.id}`}>
                        View
                      </Link>
                      {canWrite && challan.status === 'DRAFT' ? (
                        <Link className="text-link" to={`/challans/${challan.id}/edit`}>
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
