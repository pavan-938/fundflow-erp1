import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Pencil, XCircle } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../components/toast/useToast';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { ApiError } from '../services/api';
import { cancelChallan, confirmChallan, getChallan } from '../services/challanApi';
import { getCustomer } from '../services/customerApi';
import type { ChallanDetail } from '../types';
import { apiErrorMessage, challanStatusLabel, challanStatusTone } from '../utils/challans';
import { canWriteChallans, formatDateTime } from '../utils/permissions';
import { formatMoney, formatQuantity } from '../utils/products';
import './ChallansPages.css';

export function ChallanDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const canWrite = user ? canWriteChallans(user.role) : false;

  const [challan, setChallan] = useState<ChallanDetail | null>(null);
  const [customerAddress, setCustomerAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const response = await getChallan(id);
      setChallan(response.data);
      try {
        const customer = await getCustomer(response.data.customer_id);
        setCustomerAddress(customer.data.address);
      } catch {
        setCustomerAddress(null);
      }
    } catch (err) {
      setChallan(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setError('Challan not found.');
      } else {
        setError(apiErrorMessage(err, 'Challan details could not be loaded. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onConfirm = async () => {
    setConfirming(true);
    setActionError(null);
    try {
      const response = await confirmChallan(id);
      pushToast({ tone: 'success', title: 'Challan confirmed successfully.' });
      setConfirmOpen(false);
      setChallan(response.data);
      await load();
    } catch (err) {
      setActionError(
        apiErrorMessage(
          err,
          'Unable to confirm this challan because the requested stock is no longer available.',
        ),
      );
      await load();
    } finally {
      setConfirming(false);
    }
  };

  const onCancel = async () => {
    setCancelling(true);
    setActionError(null);
    try {
      const response = await cancelChallan(id);
      pushToast({ tone: 'success', title: 'Challan cancelled successfully.' });
      setCancelOpen(false);
      setChallan(response.data);
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Unable to cancel challan.'));
      await load();
    } finally {
      setCancelling(false);
    }
  };

  const isDraft = challan?.status === 'DRAFT';

  return (
    <div className="challans-page">
      <div className="detail-nav">
        <Button variant="ghost" onClick={() => navigate('/challans')} aria-label="Back to challans">
          <ArrowLeft size={16} />
          Challans
        </Button>
      </div>

      {loading ? (
        <div className="detail-grid" aria-busy="true">
          <Card>
            <CardBody>
              <SkeletonBlock height={28} width="45%" />
              <div style={{ height: 12 }} />
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
              title={notFound ? 'Challan not found' : 'Unable to load challan'}
              description={error}
              onRetry={notFound ? () => navigate('/challans') : () => void load()}
            />
          </CardBody>
        </Card>
      ) : null}

      {!loading && challan ? (
        <>
          <div className="page-header detail-header">
            <div>
              <p className="eyebrow">Sales Challan</p>
              <div className="detail-title-row">
                <h1>{challan.challan_number}</h1>
                <Badge tone={challanStatusTone(challan.status)}>
                  {challanStatusLabel(challan.status)}
                </Badge>
              </div>
              <p>
                {challan.customer_name} · {challan.business_name}
              </p>
            </div>
            {canWrite && isDraft ? (
              <div className="detail-actions">
                <Button variant="secondary" onClick={() => navigate(`/challans/${challan.id}/edit`)}>
                  <Pencil size={16} aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActionError(null);
                    setCancelOpen(true);
                  }}
                >
                  <XCircle size={16} aria-hidden="true" />
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setActionError(null);
                    setConfirmOpen(true);
                  }}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Confirm Challan
                </Button>
              </div>
            ) : null}
          </div>

          <div className="detail-grid">
            <Card>
              <CardBody>
                <h2 className="section-title">Customer</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Customer Name</dt>
                    <dd>{challan.customer_name}</dd>
                  </div>
                  <div>
                    <dt>Business Name</dt>
                    <dd>{challan.business_name}</dd>
                  </div>
                  <div>
                    <dt>Mobile</dt>
                    <dd>{challan.customer_mobile}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{challan.customer_email || '—'}</dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{customerAddress || '—'}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="section-title">Challan Metadata</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <Badge tone={challanStatusTone(challan.status)}>
                        {challanStatusLabel(challan.status)}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt>Created By</dt>
                    <dd>{challan.created_by_name}</dd>
                  </div>
                  <div>
                    <dt>Created Date</dt>
                    <dd>{formatDateTime(String(challan.created_at))}</dd>
                  </div>
                  <div>
                    <dt>Total Products</dt>
                    <dd>{challan.items.length}</dd>
                  </div>
                  <div>
                    <dt>Total Quantity</dt>
                    <dd>{formatQuantity(challan.total_quantity)}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <h2 className="section-title">Product Snapshot</h2>
              <p className="section-subtitle">
                Values shown are stored with this challan and do not change with later catalog updates.
              </p>
              <div className="table-wrap desktop-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Unit Price</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challan.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.product_name_snapshot}</strong>
                        </td>
                        <td>{item.sku_snapshot}</td>
                        <td>{formatMoney(item.unit_price_snapshot)}</td>
                        <td>{formatQuantity(item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards">
                {challan.items.map((item) => (
                  <article key={item.id} className="challan-mobile-card">
                    <strong>{item.product_name_snapshot}</strong>
                    <dl>
                      <div>
                        <dt>SKU</dt>
                        <dd>{item.sku_snapshot}</dd>
                      </div>
                      <div>
                        <dt>Unit Price</dt>
                        <dd>{formatMoney(item.unit_price_snapshot)}</dd>
                      </div>
                      <div>
                        <dt>Quantity</dt>
                        <dd>{formatQuantity(item.quantity)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </CardBody>
          </Card>

          {challan.status === 'CONFIRMED' ? (
            <p className="detail-footer-link">
              <Link to="/products">View Inventory</Link>
              {' · '}
              <Link to="/stock-movements">View Stock Movements</Link>
            </p>
          ) : (
            <p className="detail-footer-link">
              <Link to="/challans">Back to challan list</Link>
            </p>
          )}
        </>
      ) : null}

      <Modal
        open={confirmOpen}
        title="Confirm Sales Challan?"
        description="Once confirmed, inventory will be deducted based on the quantities in this challan."
        onClose={() => {
          if (!confirming) setConfirmOpen(false);
        }}
      >
        {actionError ? (
          <div className="form-banner" role="alert">
            <strong>Unable to confirm challan.</strong>
            <p style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{actionError}</p>
          </div>
        ) : null}
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={confirming}>
            {confirming ? 'Confirming…' : 'Confirm Challan'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        title="Cancel this challan?"
        description="This action will mark the draft challan as cancelled. Stock will not change."
        onClose={() => {
          if (!cancelling) setCancelOpen(false);
        }}
      >
        {actionError ? (
          <div className="form-banner" role="alert">
            {actionError}
          </div>
        ) : null}
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCancelOpen(false)}
            disabled={cancelling}
          >
            Keep Draft
          </Button>
          <Button type="button" onClick={() => void onCancel()} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel Challan'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
