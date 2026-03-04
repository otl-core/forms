import type { BlockInstance, FormAdvancedOptions } from "@otl-core/cms-types";
import { useCallback, useMemo } from "react";
import { useForm } from "./form-context";
import { findBlockInDocument } from "./utils/page.utils";
import {
  evaluateDisabledRules,
  evaluateVisibilityRules,
} from "./utils/rule.utils";
import { validateField } from "./utils/validation.utils";

interface FormField<T> {
  name: string;
  label: string;
  type: string;
  helperText: string;
  placeholder: string | null;
  additionalSettings: Record<string, unknown>;

  loading: boolean;

  display: "block" | "none";
  required: boolean;
  disabled: boolean;
  error?: string;

  value: T;
  onChange: React.Dispatch<React.SetStateAction<T>>;
  onBlur: () => void;
}

export function useFormField<T>(id: string): FormField<T> | null {
  const {
    formId,
    document,
    settings,
    loading,
    formValues,
    setFormValues,
    errors,
    setErrors,
    analyticsSettings,
    onAnalyticsEvent,
    formName,
    hasStarted,
    setHasStarted,
  } = useForm();

  const block: BlockInstance | null = useMemo(() => {
    return findBlockInDocument(id, document);
  }, [document, id]);

  const fieldId = useMemo(() => {
    if (!block) return null;
    return typeof block.config.field_id === "string"
      ? block.config.field_id
      : block.id;
  }, [block]);

  const initialValue: T | undefined = useMemo(() => {
    if (!block) {
      return undefined;
    }

    if (typeof block.config.initialValue === "string") {
      return String(block.config.initialValue) as T;
    } else if (typeof block.config.initialValue === "number") {
      return Number(block.config.initialValue) as T;
    } else if (typeof block.config.initialValue === "boolean") {
      return Boolean(block.config.initialValue) as T;
    }

    if (block.config.initialValue !== undefined) {
      return block.config.initialValue as T;
    }

    return undefined;
  }, [block]);

  const value = useMemo<T | undefined>(() => {
    if (!fieldId) {
      return undefined;
    }
    return (formValues[fieldId] as T) ?? initialValue;
  }, [fieldId, formValues, initialValue]);

  const setValue = useCallback(
    (value: T) => {
      if (!fieldId) {
        return;
      }
      setFormValues((prev) => ({ ...prev, [fieldId]: value }));
      // Clear error for this field when value changes
      setErrors((prev) => {
        if (!prev || !prev[fieldId]) return prev;
        const { [fieldId]: _, ...rest } = prev;
        return Object.keys(rest).length > 0 ? rest : null;
      });

      // Emit form_start on first interaction
      if (
        !hasStarted &&
        analyticsSettings?.track_form_start &&
        onAnalyticsEvent
      ) {
        setHasStarted(true);
        onAnalyticsEvent("form_start", {
          form_id: formId,
          form_name: formName,
        });
      }
    },
    [
      fieldId,
      setFormValues,
      setErrors,
      hasStarted,
      setHasStarted,
      analyticsSettings,
      onAnalyticsEvent,
      formId,
      formName,
    ],
  );

  const handleBlur = useCallback(() => {
    // Only validate on blur if the setting is enabled
    if (!(settings.validate_on_blur ?? false) || !block || !fieldId) {
      return;
    }

    const currentValue = formValues[fieldId] ?? initialValue;
    const error = validateField(block, currentValue, settings);

    if (error) {
      setErrors((prev) => ({ ...prev, [fieldId]: error }));
    } else {
      // Clear error if validation passes
      setErrors((prev) => {
        if (!prev || !prev[fieldId]) return prev;
        const { [fieldId]: _, ...rest } = prev;
        return Object.keys(rest).length > 0 ? rest : null;
      });
    }
  }, [settings, block, fieldId, formValues, initialValue, setErrors]);

  const display: "block" | "none" = useMemo(() => {
    if (!block) {
      return "none";
    }

    // check logic
    const rules = (block.config.advanced_options as FormAdvancedOptions)?.rules;
    if (!rules) {
      return "block";
    }

    return evaluateVisibilityRules(rules, formValues);
  }, [block, formValues]);

  const disabled: boolean = useMemo(() => {
    if (!block) {
      return false;
    }

    if (loading) {
      return true;
    }

    if (typeof block.config.disabled === "boolean" && block.config.disabled) {
      return block.config.disabled;
    }

    // check logic
    const rules = (block.config.advanced_options as FormAdvancedOptions)?.rules;
    if (!rules) {
      return false;
    }

    return evaluateDisabledRules(rules, formValues);
  }, [block, formValues, loading]);

  if (!block || !fieldId) {
    return null;
  }

  return {
    name: fieldId,
    label: typeof block.config.label === "string" ? block.config.label : "",
    type:
      typeof block.config.input_type === "string"
        ? block.config.input_type
        : typeof block.config.type === "string"
          ? block.config.type
          : "",
    helperText:
      typeof block.config.help_text === "string"
        ? block.config.help_text
        : typeof block.config.helperText === "string"
          ? block.config.helperText
          : "",
    placeholder:
      typeof block.config.placeholder === "string"
        ? block.config.placeholder
        : null,

    additionalSettings: {
      rows:
        typeof block.config.rows === "number" ? block.config.rows : undefined,
      options: block.config.options || undefined,
      multiple:
        typeof block.config.multiple === "boolean"
          ? block.config.multiple
          : undefined,
      min: typeof block.config.min === "number" ? block.config.min : undefined,
      max: typeof block.config.max === "number" ? block.config.max : undefined,
      step:
        typeof block.config.step === "number" ? block.config.step : undefined,
      blocks: block.config.blocks || undefined,
      gap: block.config.gap || undefined,
    },

    loading,

    disabled,
    display,
    required:
      typeof block.config.required === "boolean"
        ? block.config.required
        : false,
    error: errors?.[fieldId] || errors?.[block.id] || undefined,

    value: value as T,
    onChange: setValue as React.Dispatch<React.SetStateAction<T>>,
    onBlur: handleBlur,
  };
}
