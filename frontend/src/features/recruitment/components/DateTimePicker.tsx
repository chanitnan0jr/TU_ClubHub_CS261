import type { ChangeEvent } from 'react';
import { inputClass } from '../../../components/ui/classes';
import { Field } from '../../../components/ui/Field';

interface DateTimePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const DateTimePicker = ({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
}: DateTimePickerProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <Field id={id} label={label} required={required} error={error}>
      {(control) => (
        <input
          {...control}
          type="datetime-local"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={inputClass(Boolean(error))}
        />
      )}
    </Field>
  );
};
