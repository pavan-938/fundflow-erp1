import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../components/toast/useToast';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { ApiError } from '../services/api';
import { addCustomerFollowUp, getCustomer } from '../services/customerApi';
import type { CustomerDetail } from '../types';
import {
  customerStatusLabel,
  customerStatusTone,
  customerTypeLabel,
  formatDateOnly,
} from '../utils/customers';
import { canAddCustomerFollowUps, canWriteCustomers, formatDateTime } from '../utils/permissions';
import './CustomersPage.css';

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const canWrite = user ? canWriteCustomers(user.role) : false;
  const canFollowUp = user ? canAddCustomerFollowUps(user.role) : false;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const response = await getCustomer(id);
      setCustomer(response.data);
    } catch (err) {
      setCustomer(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setError('This customer could not be found.');
      } else {
        setError('Customer details could not be loaded. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFollowUpSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) {
      setFollowUpError('Follow-up note is required');
      return;
    }
    if (followUpDate && !/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) {
      setFollowUpError('Use YYYY-MM-DD for follow-up date');
      return;
    }

    setSubmittingFollowUp(true);
    setFollowUpError(null);
    try {
      await addCustomerFollowUp(id, {
        note: note.trim(),
        follow_up_date: followUpDate || null,
      });
      pushToast({ tone: 'success', title: 'Follow-up added' });
      setNote('');
      setFollowUpDate('');
      await load();
    } catch (err) {
      setFollowUpError(
        err instanceof ApiError ? err.message || 'Unable to add follow-up.' : 'Unable to add follow-up.',
      );
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  return (
    <div className="customers-page">
      <div className="detail-nav">
        <Button variant="ghost" onClick={() => navigate('/customers')} aria-label="Back to customers">
          <ArrowLeft size={16} />
          Customers
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
              title={notFound ? 'Customer not found' : 'Unable to load customer'}
              description={error}
              onRetry={notFound ? () => navigate('/customers') : () => void load()}
            />
          </CardBody>
        </Card>
      ) : null}

      {!loading && customer ? (
        <>
          <div className="page-header detail-header">
            <div>
              <div className="detail-title-row">
                <h1>{customer.customer_name}</h1>
                <Badge tone={customerStatusTone(customer.status)}>
                  {customerStatusLabel(customer.status)}
                </Badge>
              </div>
              <p>{customer.business_name}</p>
            </div>
            {canWrite ? (
              <Button variant="secondary" onClick={() => navigate(`/customers/${customer.id}/edit`)}>
                <Pencil size={16} aria-hidden="true" />
                Edit
              </Button>
            ) : null}
          </div>

          <div className="detail-grid">
            <Card>
              <CardBody>
                <h2 className="section-title">Customer Information</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Customer Name</dt>
                    <dd>{customer.customer_name}</dd>
                  </div>
                  <div>
                    <dt>Mobile Number</dt>
                    <dd>{customer.mobile_number}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{customer.email || '—'}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <Badge tone={customerStatusTone(customer.status)}>
                        {customerStatusLabel(customer.status)}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{customer.address}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="section-title">Business Information</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Business Name</dt>
                    <dd>{customer.business_name}</dd>
                  </div>
                  <div>
                    <dt>Customer Type</dt>
                    <dd>{customerTypeLabel(customer.customer_type)}</dd>
                  </div>
                  <div>
                    <dt>GST Number</dt>
                    <dd>{customer.gst_number || '—'}</dd>
                  </div>
                  <div>
                    <dt>Follow-up Date</dt>
                    <dd>{formatDateOnly(customer.follow_up_date)}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <h2 className="section-title">Notes</h2>
              <p className="notes-block">{customer.notes?.trim() ? customer.notes : 'No notes recorded.'}</p>
            </CardBody>
          </Card>

          <div className="followup-layout">
            {canFollowUp ? (
              <Card>
                <CardBody>
                  <h2 className="section-title">Add Follow-up</h2>
                  <p className="section-subtitle">Log the next CRM touchpoint for this account.</p>
                  <form className="followup-form" onSubmit={(event) => void onFollowUpSubmit(event)} noValidate>
                    {followUpError ? (
                      <div className="form-banner" role="alert">
                        {followUpError}
                      </div>
                    ) : null}
                    <TextArea
                      label="Note *"
                      name="follow_up_note"
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value);
                        setFollowUpError(null);
                      }}
                      maxLength={5000}
                      rows={4}
                      required
                    />
                    <Input
                      label="Follow-up Date"
                      name="follow_up_date"
                      type="date"
                      value={followUpDate}
                      onChange={(event) => {
                        setFollowUpDate(event.target.value);
                        setFollowUpError(null);
                      }}
                    />
                    <div className="form-actions">
                      <Button type="submit" disabled={submittingFollowUp}>
                        {submittingFollowUp ? 'Saving…' : 'Add Follow-up'}
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            ) : null}

            <Card className={canFollowUp ? '' : 'followup-history-wide'}>
              <CardBody>
                <h2 className="section-title">Follow-up History</h2>
                {customer.follow_ups.length === 0 ? (
                  <EmptyState
                    title="No follow-ups yet"
                    description="CRM follow-up notes will appear here once logged."
                  />
                ) : (
                  <ol className="followup-timeline">
                    {customer.follow_ups.map((item) => (
                      <li key={item.id}>
                        <div className="timeline-dot" aria-hidden="true" />
                        <div className="timeline-body">
                          <p className="timeline-note">{item.note}</p>
                          <div className="timeline-meta">
                            <span>{item.created_by_name}</span>
                            <span>{formatDateTime(String(item.created_at))}</span>
                            {item.follow_up_date ? (
                              <span>Follow-up {formatDateOnly(item.follow_up_date)}</span>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>

          <p className="detail-footer-link">
            <Link to="/customers">Back to customer list</Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
