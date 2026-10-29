export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'file';

export interface DialogField {
  name: string;
  label: string;
  type?: FieldType;
  value?: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  accept?: string;
  maxBytes?: number;
  rows?: number;
}

export interface DialogRequest {
  title: string;
  description?: string;
  fields: DialogField[];
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => void;
}

type DialogHandler = (request: DialogRequest | null) => void;

let handler: DialogHandler | null = null;

export function setDialogHandler(next: DialogHandler | null): () => void {
  handler = next;
  return () => {
    if (handler === next) {
      handler = null;
    }
  };
}

export function openDialog(request: DialogRequest): void {
  if (handler) {
    handler(request);
    return;
  }

  fallbackDialog(request);
}

function fallbackDialog(request: DialogRequest): void {
  const values: Record<string, string> = {};

  for (const field of request.fields) {
    if (field.type === 'file') {
      const value = window.prompt(`${field.label} (paste a URL)`, field.value ?? '');
      if (value) {
        values[field.name] = value;
      }
      continue;
    }

    const value = window.prompt(field.label, field.value ?? '');
    if (value === null) {
      return;
    }
    if (field.required && !value.trim()) {
      return;
    }
    values[field.name] = value;
  }

  request.onSubmit(values);
}
