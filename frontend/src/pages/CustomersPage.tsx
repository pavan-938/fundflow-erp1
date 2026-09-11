import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { ApiError } from '../services/api';
import { getCustomers } from '../services/customerApi';
import type { Customer, CustomerStatus, CustomerType } from '../types';
import {
  customerStatusLabel,
  customerStatusTone,
  customerTypeLabel,
  formatDateOnly,
} from '../utils/customers';
import { canWriteCustomers } from '../utils/permissions';
import './CustomersPage.css';

const PAGE_LIMIT = 10;

function parseStatus(value: string | null): CustomerStatus | '' {
  if (value === 'LEAD' || value === 'ACTIVE' || value === 'INACTIVE') return value;
  return '';
}

function parseType(value: string | null): CustomerType | '' {
  if (value === 'RETAIL' || value === 'WHOLESALE' || value === 'DISTRIBUTOR') return value;
  return '';
}

export function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = user ? canWriteCustomers(user.role) : false;

  const searchFromUrl = searchParams.get('search') ?? '';
  const status = parseStatus(searchParams.get('status'));
  const customerType = parseType(searchParams.get('customer_type'));
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
      const response = await getCustomers({
        page,
        limit: PAGE_LIMIT,
        search: searchFromUrl || undefined,
        status: status || undefined,
        customer_type: customerType || undefined,
      });
      setCustomers(response.data);
      setTotal(response.pagination.total);
      setTotalPages(Math.max(1, response.pagination.totalPages));
    } catch (err) {
      setCustomers([]);
      setTotal(0);
      setTotalPages(1);
      setError(
        err instanceof ApiError
          ? 'Customers could not be loaded. Please try again.'
          : 'Customers could not be loaded. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [page, searchFromUrl, status, customerType]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasFilters = Boolean(searchFromUrl || status || customerType);

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

  const emptyTitle = hasFilters ? 'No customers match your current filters' : 'No customers yet';
  const emptyDescription = hasFilters
    ? 'Try adjusting search or filters to find customer records.'
    : 'Add your first customer to start CRM follow-ups and sales workflows.';

  const paginationLabel = useMemo(() => {
    if (total === 0) return '0 customers';
    const start = (page - 1) * PAGE_LIMIT + 1;
    const end = Math.min(page * PAGE_LIMIT, total);
    return `${start}–${end} of ${total}`;
  }, [page, total]);

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Manage CRM accounts, follow-ups, and business contact details.</p>
        </div>
        {canWrite ? (
          <Button onClick={() => navigate('/customers/new')}>
            <Plus size={16} aria-hidden="true" />
            Add Customer
          </Button>
        ) : null}
      </div>

      <Card>
        <CardBody>
          <div className="customers-toolbar">
            <div className="search-field">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name, mobile, email, or business"
                aria-label="Search customers"
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
                  <option value="LEAD">Lead</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <label>
                <span>Customer Type</span>
                <select
                  value={customerType}
                  onChange={(event) => updateParam('customer_type', event.target.value)}
                  aria-label="Filter by customer type"
                >
                  <option value="">All</option>
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </label>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="customers-table-card">
        <CardBody>
          {loading ? (
            <div className="customers-skeleton" aria-busy="true" aria-label="Loading customers">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} height={44} />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <ErrorState title="Unable to load customers" description={error} onRetry={() => void load()} />
          ) : null}

          {!loading && !error && customers.length === 0 ? (
            <div className="customers-empty">
              <EmptyState title={emptyTitle} description={emptyDescription} />
              {canWrite && !hasFilters ? (
                <Button onClick={() => navigate('/customers/new')}>
                  <Plus size={16} aria-hidden="true" />
                  Add Customer
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && customers.length > 0 ? (
            <>
              <div className="table-wrap desktop-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Business</th>
                      <th>Mobile</th>
                      <th>Customer Type</th>
                      <th>Status</th>
                      <th>Follow-up Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <strong>{customer.customer_name}</strong>
                          {customer.email ? <div className="muted">{customer.email}</div> : null}
                        </td>
                        <td>{customer.business_name}</td>
                        <td>{customer.mobile_number}</td>
                        <td>{customerTypeLabel(customer.customer_type)}</td>
                        <td>
                          <Badge tone={customerStatusTone(customer.status)}>
                            {customerStatusLabel(customer.status)}
                          </Badge>
                        </td>
                        <td>{formatDateOnly(customer.follow_up_date)}</td>
                        <td>
                          <div className="row-actions">
                            <Link className="text-link" to={`/customers/${customer.id}`}>
                              View
                            </Link>
                            {canWrite ? (
                              <Link className="text-link" to={`/customers/${customer.id}/edit`}>
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
                {customers.map((customer) => (
                  <article key={customer.id} className="customer-mobile-card">
                    <div className="mobile-card-head">
                      <div>
                        <strong>{customer.customer_name}</strong>
                        <p>{customer.business_name}</p>
                      </div>
                      <Badge tone={customerStatusTone(customer.status)}>
                        {customerStatusLabel(customer.status)}
                      </Badge>
                    </div>
                    <dl>
                      <div>
                        <dt>Mobile</dt>
                        <dd>{customer.mobile_number}</dd>
                      </div>
                      <div>
                        <dt>Type</dt>
                        <dd>{customerTypeLabel(customer.customer_type)}</dd>
                      </div>
                      <div>
                        <dt>Follow-up</dt>
                        <dd>{formatDateOnly(customer.follow_up_date)}</dd>
                      </div>
                    </dl>
                    <div className="row-actions">
                      <Link className="text-link" to={`/customers/${customer.id}`}>
                        View
                      </Link>
                      {canWrite ? (
                        <Link className="text-link" to={`/customers/${customer.id}/edit`}>
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
