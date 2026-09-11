import type { TextareaHTMLAttributes } from 'react';

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export function TextArea({ label, error, id, ...props }: TextAreaProps) {
  const areaId = id ?? props.name;
  return (
    <div className="field">
      <label htmlFor={areaId}>{label}</label>
      <textarea id={areaId} aria-invalid={Boolean(error)} rows={props.rows ?? 4} {...props} />
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
