import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  ClipboardList,
  Package,
  PackagePlus,
  Plus,
  Users,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { ApiError } from '../services/api';
import { fetchDashboardSummary } from '../services/dashboardApi';
import type { DashboardSummary, UserRole } from '../types';
import { challanStatusLabel, challanStatusTone } from '../utils/challans';
import {
  canWriteChallans,
  canWriteCustomers,
  canWriteInventory,
  formatDateTime,
  greetingForNow,
} from '../utils/permissions';
import { formatQuantity } from '../utils/products';
import './DashboardPage.css';

type QuickAction = {
  label: string;
  to: string;
  icon: typeof Plus;
  show: (role: UserRole) => boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'New Customer',
    to: '/customers/new',
    icon: Users,
    show: (role) => canWriteCustomers(role),
  },
  {
    label: 'New Product',
    to: '/products/new',
    icon: PackagePlus,
    show: (role) => canWriteInventory(role),
  },
  {
    label: 'Stock Movement',
    to: '/stock-movements',
    icon: Warehouse,
    show: (role) => canWriteInventory(role),
  },
  {
    label: 'New Challan',
    to: '/challans/new',
    icon: ClipboardList,
    show: (role) => canWriteChallans(role),
  },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDashboardSummary();
      setData(response.data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to load dashboard. Please try again.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const quickActions = useMemo(() => {
    if (!user) return [];
    return QUICK_ACTIONS.filter((action) => action.show(user.role));
  }, [user]);

  return (
    <div className="dashboard-grid">
      <div className="page-header dashboard-header">
        <div>
          <h1>
            {greetingForNow()}, {user?.name.split(' ')[0] ?? 'there'}
          </h1>
          <p>Here&apos;s your operations overview from live FundFlow data.</p>
        </div>
        {quickActions.length > 0 ? (
          <div className="quick-actions" aria-label="Quick actions">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.to + action.label}
                  variant="secondary"
                  onClick={() => navigate(action.to)}
                >
                  <Icon size={16} aria-hidden="true" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>

      {loading ? (
        <>
          <div className="kpi-grid" aria-busy="true" aria-label="Loading KPIs">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index}>
                <CardBody>
                  <SkeletonBlock height={14} width="45%" />
                  <div style={{ height: 12 }} />
                  <SkeletonBlock height={28} width="35%" />
                  <div style={{ height: 10 }} />
                  <SkeletonBlock height={12} width="55%" />
                </CardBody>
              </Card>
            ))}
          </div>
          <div className="panel-grid" aria-busy="true">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <CardBody>
                  <SkeletonBlock height={20} width="40%" />
                  <div style={{ height: 16 }} />
                  <SkeletonBlock height={140} />
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      {!loading && error ? (
        <Card>
          <CardBody>
            <ErrorState title="Unable to load dashboard" description={error} onRetry={() => void load()} />
          </CardBody>
        </Card>
      ) : null}

      {!loading && data ? (
        <>
          <div className="kpi-grid">
            <Card className="kpi-card-shell">
              <CardBody className="kpi-card">
                <div className="kpi-icon kpi-icon-customers" aria-hidden="true">
                  <Users size={18} />
                </div>
                <span>Customers</span>
                <strong>{data.kpis.total_customers}</strong>
                <em>CRM records</em>
              </CardBody>
            </Card>
            <Card className="kpi-card-shell">
              <CardBody className="kpi-card">
                <div className="kpi-icon kpi-icon-products" aria-hidden="true">
                  <Package size={18} />
                </div>
                <span>Products</span>
                <strong>{data.kpis.total_products}</strong>
                <em>Inventory catalog</em>
              </CardBody>
            </Card>
            <Card className="kpi-card-shell">
              <CardBody className="kpi-card">
                <div className="kpi-icon kpi-icon-low" aria-hidden="true">
                  <AlertTriangle size={18} />
                </div>
                <span>Low Stock</span>
                <strong>{data.kpis.low_stock_products}</strong>
                <em>Requires attention</em>
              </CardBody>
            </Card>
            <Card className="kpi-card-shell">
              <CardBody className="kpi-card">
                <div className="kpi-icon kpi-icon-draft" aria-hidden="true">
                  <ClipboardList size={18} />
                </div>
                <span>Draft Challans</span>
                <strong>{data.kpis.draft_challans}</strong>
                <em>Pending confirmation</em>
              </CardBody>
            </Card>
            <Card className="kpi-card-shell">
              <CardBody className="kpi-card">
                <div className="kpi-icon kpi-icon-confirmed" aria-hidden="true">
                  <ClipboardCheck size={18} />
                </div>
                <span>Confirmed Challans</span>
                <strong>{data.kpis.confirmed_challans}</strong>
                <em>Completed transactions</em>
              </CardBody>
            </Card>
          </div>

          <div className="panel-grid">
            <Card>
              <CardBody>
                <div className="panel-title">
                  <div>
                    <h2>Low stock products</h2>
                    <p className="panel-subtitle">Items at or below minimum stock quantity</p>
                  </div>
                  <Link className="panel-link" to="/products?low_stock=true">
                    View Inventory
                  </Link>
                </div>
                {data.low_stock_items.length === 0 ? (
                  <EmptyState
                    title="No low-stock items"
                    description="Inventory levels are currently healthy."
                  />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Current Stock</th>
                          <th>Minimum Stock</th>
                          <th>Location</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.low_stock_items.map((item) => (
                          <tr
                            key={item.id}
                            className="clickable-row"
                            onClick={() => navigate(`/products/${item.id}`)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') navigate(`/products/${item.id}`);
                            }}
                            tabIndex={0}
                            role="link"
                            aria-label={`View product ${item.product_name}`}
                          >
                            <td>
                              <strong>{item.product_name}</strong>
                            </td>
                            <td>{item.sku}</td>
                            <td>{formatQuantity(item.current_stock)}</td>
                            <td>{formatQuantity(item.minimum_stock_quantity)}</td>
                            <td>{item.warehouse_location}</td>
                            <td>
                              <Badge tone="warning">Low Stock</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="panel-title">
                  <div>
                    <h2>Recent stock movements</h2>
                    <p className="panel-subtitle">Latest inventory receipts and issues</p>
                  </div>
                  <Link className="panel-link" to="/stock-movements">
                    View All
                  </Link>
                </div>
                {data.recent_stock_movements.length === 0 ? (
                  <EmptyState
                    title="No stock movements yet"
                    description="IN and OUT movements will appear here as inventory changes."
                  />
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Type</th>
                          <th>Qty</th>
                          <th>Reason</th>
                          <th>Created By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent_stock_movements.map((movement) => (
                          <tr key={movement.id}>
                            <td>
                              <strong>{movement.product_name}</strong>
                              <div className="muted">{movement.sku}</div>
                            </td>
                            <td>
                              <Badge tone={movement.movement_type === 'IN' ? 'success' : 'warning'}>
                                {movement.movement_type === 'IN' ? (
                                  <ArrowUpRight size={12} aria-hidden="true" />
                                ) : (
                                  <ArrowDownRight size={12} aria-hidden="true" />
                                )}
                                {movement.movement_type}
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
                            <td>
                              {movement.created_by_name}
                              <div className="muted">{formatDateTime(String(movement.created_at))}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <div className="panel-title">
                <div>
                  <h2>Recent sales challans</h2>
                  <p className="panel-subtitle">Newest customer challans first</p>
                </div>
                <Link className="panel-link" to="/challans">
                  View All
                </Link>
              </div>
              {data.recent_challans.length === 0 ? (
                <EmptyState
                  title="No sales challans yet"
                  description="Create a challan to start tracking customer sales."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Challan Number</th>
                        <th>Customer</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_challans.map((challan) => (
                        <tr
                          key={challan.id}
                          className="clickable-row"
                          onClick={() => navigate(`/challans/${challan.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') navigate(`/challans/${challan.id}`);
                          }}
                          tabIndex={0}
                          role="link"
                          aria-label={`View challan ${challan.challan_number}`}
                        >
                          <td>
                            <strong>{challan.challan_number}</strong>
                          </td>
                          <td>
                            {challan.customer_name}
                            <div className="muted">{challan.business_name}</div>
                          </td>
                          <td>{formatQuantity(challan.total_quantity)}</td>
                          <td>
                            <Badge
                              tone={challanStatusTone(
                                challan.status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED',
                              )}
                            >
                              {challanStatusLabel(
                                challan.status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED',
                              )}
                            </Badge>
                          </td>
                          <td>{formatDateTime(String(challan.created_at))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
