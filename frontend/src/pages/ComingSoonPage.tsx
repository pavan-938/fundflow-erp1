import { Card, CardBody } from '../components/ui/Card';

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <Card>
        <CardBody>
          <strong>Coming in a later phase</strong>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            This module is intentionally not implemented in Phase 7. Navigation is available so the
            ERP shell is complete, without fake business screens.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
