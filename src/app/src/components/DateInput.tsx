import { useId, Label, Field, FieldProps } from "@fluentui/react-components";
import { DatePicker, DatePickerProps } from "@fluentui/react-datepicker-compat";

type DateInputProps = DatePickerProps &
  FieldProps & {
    id: string;
    label?: string;
    initValue?: string;
    placeholder?: string;
  };

export default function DateInput({
  id,
  label,
  value,
  minDate,
  maxDate,
  required = true,
  onSelectDate,
}: DateInputProps) {
  const dateId = useId(id);

  return (
    <div>
      <Field
        label={
          <Label size="large" weight="semibold" htmlFor={dateId}>
            {label}
          </Label>
        }
        required={required}
      >
        <DatePicker
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          onSelectDate={onSelectDate}
          allowTextInput
          showGoToToday
        />
      </Field>
    </div>
  );
}
