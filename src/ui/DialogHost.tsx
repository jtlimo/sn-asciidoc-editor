import { useEffect, useRef, useState } from 'preact/hooks';
import { DialogField, DialogRequest, setDialogHandler } from './dialogs';

const DEFAULT_MAX_BYTES = 512 * 1024;

export function DialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstField = useRef<HTMLElement | null>(null);

  useEffect(
    () =>
      setDialogHandler((next) => {
        setRequest(next);
        setValues(next ? Object.fromEntries(next.fields.map((field) => [field.name, field.value ?? ''])) : {});
        setFiles({});
        setErrors({});
      }),
    [],
  );

  useEffect(() => {
    if (!request) {
      return;
    }

    const timer = window.setTimeout(() => firstField.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRequest(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [request]);

  if (!request) {
    return null;
  }

  const close = () => setRequest(null);

  const submit = (event: Event) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    for (const field of request.fields) {
      if (field.required && !values[field.name]?.trim()) {
        nextErrors[field.name] = 'This field is required.';
      }
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    request.onSubmit(values);
    close();
  };

  const update = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const upload = (field: DialogField, event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const maxBytes = field.maxBytes ?? DEFAULT_MAX_BYTES;

    if (file.size > maxBytes) {
      setErrors((current) => ({
        ...current,
        [field.name]: `File is larger than ${formatBytes(maxBytes)}. Use a URL instead.`,
      }));
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      update(field.name, typeof reader.result === 'string' ? reader.result : '');
      setFiles((current) => ({
        ...current,
        [field.name]: `${file.name} (${formatBytes(file.size)})`,
      }));
    };
    reader.onerror = () => {
      setErrors((current) => ({ ...current, [field.name]: 'Could not read the selected file.' }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="adoc-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <form
        className="adoc-modal adoc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={request.title}
        onSubmit={submit}
      >
        <div className="adoc-modal-header">
          <h2>{request.title}</h2>
          <button type="button" className="adoc-modal-close" onClick={close} aria-label="Close dialog">
            ×
          </button>
        </div>

        {request.description ? <p className="adoc-dialog-description">{request.description}</p> : null}

        <div className="adoc-dialog-fields">
          {request.fields.map((field, index) => {
            const error = errors[field.name];
            const id = `adoc-field-${field.name}`;

            return (
              <label className={error ? 'adoc-field has-error' : 'adoc-field'} key={field.name} htmlFor={id}>
                <span>{field.label}</span>

                {field.type === 'textarea' ? (
                  <textarea
                    id={id}
                    ref={index === 0 ? (element) => { firstField.current = element; } : undefined}
                    rows={field.rows ?? 4}
                    value={values[field.name] ?? ''}
                    placeholder={field.placeholder}
                    onInput={(event) => update(field.name, event.currentTarget.value)}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={id}
                    ref={index === 0 ? (element) => { firstField.current = element; } : undefined}
                    value={values[field.name] ?? ''}
                    onChange={(event) => update(field.name, event.currentTarget.value)}
                  >
                    {(field.options ?? []).map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'file' ? (
                  <span className="adoc-file-field">
                    <input
                      id={id}
                      ref={index === 0 ? (element) => { firstField.current = element; } : undefined}
                      type="text"
                      value={values[field.name] ?? ''}
                      placeholder={field.placeholder ?? 'https://…'}
                      onInput={(event) => update(field.name, event.currentTarget.value)}
                    />
                    <input
                      type="file"
                      accept={field.accept ?? 'image/*'}
                      onChange={(event) => upload(field, event)}
                    />
                    {files[field.name] ? <span className="adoc-file-name">{files[field.name]}</span> : null}
                  </span>
                ) : (
                  <input
                    id={id}
                    ref={index === 0 ? (element) => { firstField.current = element; } : undefined}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={values[field.name] ?? ''}
                    placeholder={field.placeholder}
                    onInput={(event) => update(field.name, event.currentTarget.value)}
                  />
                )}

                {field.help ? <span className="adoc-field-help">{field.help}</span> : null}
                {error ? <span className="adoc-field-error">{error}</span> : null}
              </label>
            );
          })}
        </div>

        <div className="adoc-modal-footer">
          <button type="button" className="adoc-button secondary" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="adoc-button">
            {request.submitLabel ?? 'Insert'}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.round(bytes / 1024)} KB`;
}
