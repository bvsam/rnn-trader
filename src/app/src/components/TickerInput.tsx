import {
  useId,
  Input,
  Label,
  Field,
  FieldProps,
} from "@fluentui/react-components";

type TickerInputProps = FieldProps & {
  id: string;
  value: string;
  validationState: validationStateTypes;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
};
export type validationStateTypes = "error" | "warning" | "success" | "none";

export default function TickerInput({
  id,
  value,
  validationState,
  label,
  placeholder = "",
  required = true,
  onChange,
}: TickerInputProps) {
  const inputId = useId(id);

  const determineValidationMessage = (
    validationState: validationStateTypes
  ) => {
    switch (validationState) {
      case "success":
        return "Valid ticker.";
      case "error":
        return "Enter a valid ticker.";
      case "none":
        return "Enter a ticker (compatible with Yahoo Finance)";
    }
  };

  return (
    <>
      <Field
        label={
          <Label size="large" weight="semibold" htmlFor={inputId}>
            {label}
          </Label>
        }
        validationState={validationState}
        validationMessage={determineValidationMessage(validationState)}
        required={required}
      >
        <Input
          id={inputId}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />
      </Field>
    </>
  );
}
