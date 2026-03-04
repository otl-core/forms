import { BlockInstance, FormPage, FormSettings } from "@otl-core/cms-types";

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "";
}

function interpolateMessage(
  template: string,
  params: Record<string, unknown>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] || ""));
}

function validateMinLength(value: unknown, minLength: unknown) {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  return (
    typeof value === "string" && value.length >= parseInt(minLength as string)
  );
}

function validateMaxLength(value: unknown, maxLength: unknown) {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  return (
    typeof value === "string" && value.length <= parseInt(maxLength as string)
  );
}

function validatePattern(value: unknown, pattern: unknown) {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  return typeof value === "string" && new RegExp(pattern as string).test(value);
}

function validateMinValue(value: unknown, min: unknown) {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  const numValue =
    typeof value === "number" ? value : parseFloat(value as string);
  const minValue = typeof min === "number" ? min : parseFloat(min as string);
  return !isNaN(numValue) && !isNaN(minValue) && numValue >= minValue;
}

function validateMaxValue(value: unknown, max: unknown) {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  const numValue =
    typeof value === "number" ? value : parseFloat(value as string);
  const maxValue = typeof max === "number" ? max : parseFloat(max as string);
  return !isNaN(numValue) && !isNaN(maxValue) && numValue <= maxValue;
}

// Type-specific validators
function validateEmail(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  // RFC 5322 compliant email regex (simplified but robust)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(value);
}

function validateURL(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validatePhoneNumber(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  // International phone number format (E.164 and common formats)
  // Allows: +1234567890, (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
  const phoneRegex =
    /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(value.replace(/\s/g, ""));
}

function validateDate(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  const date = new Date(value);
  return !isNaN(date.getTime());
}

function validateTime(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  // HH:MM or HH:MM:SS format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(value);
}

function validateColor(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  // Hex color (#RGB, #RRGGBB, #RRGGBBAA)
  const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
  return hexRegex.test(value);
}

function validateZipCode(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  // US ZIP code (12345 or 12345-6789)
  const usZipRegex = /^\d{5}(-\d{4})?$/;
  // UK postcode (basic pattern)
  const ukPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
  // German postcode
  const dePostcodeRegex = /^\d{5}$/;

  return (
    usZipRegex.test(value) ||
    ukPostcodeRegex.test(value) ||
    dePostcodeRegex.test(value)
  );
}

function validateCreditCard(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  // Remove spaces and dashes
  const cleaned = value.replace(/[\s-]/g, "");

  // Check if it's all digits and 13-19 characters (standard credit card length)
  if (!/^\d{13,19}$/.test(cleaned)) return false;

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

function validateIPAddress(value: unknown): boolean {
  if (isEmpty(value)) return true; // Skip if empty (handled by required)
  if (typeof value !== "string") return false;

  // IPv4
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 (simplified)
  const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

  return ipv4Regex.test(value) || ipv6Regex.test(value);
}

// Validation error messages
const TYPE_ERROR_MESSAGES: Record<string, string> = {
  email: "Please enter a valid email address",
  url: "Please enter a valid URL (e.g., https://example.com)",
  tel: "Please enter a valid phone number",
  date: "Please enter a valid date",
  time: "Please enter a valid time",
  color: "Please enter a valid color code (e.g., #FF0000)",
  zipcode: "Please enter a valid ZIP/postal code",
  creditcard: "Please enter a valid credit card number",
  ip: "Please enter a valid IP address",
};

function getAllBlocksFromPage(blocks: BlockInstance[]): BlockInstance[] {
  const allBlocks: BlockInstance[] = [];

  for (const block of blocks) {
    allBlocks.push(block);

    // Check for nested blocks (e.g., form-inline-group)
    if (block.config.blocks && Array.isArray(block.config.blocks)) {
      const nestedBlocks = block.config.blocks.map(
        (b) =>
          ({
            id: b.id,
            type: b.type,
            config: b.config || {},
          }) as BlockInstance,
      );
      allBlocks.push(...getAllBlocksFromPage(nestedBlocks));
    }
  }

  return allBlocks;
}

export function validatePage(
  page: FormPage,
  formValues: Record<string, unknown>,
  settings?: FormSettings,
): true | { [key: string]: string } {
  const errors: { [key: string]: string } = {};
  const allBlocks = getAllBlocksFromPage(page.blocks);
  const errorMessages = settings?.error_messages || {};

  for (const block of allBlocks) {
    // Skip button blocks and non-input blocks
    if (block.type === "form-button" || block.type === "form-inline-group") {
      continue;
    }

    // Get the field_id (or fallback to block.id)
    const fieldId =
      typeof block.config.field_id === "string"
        ? block.config.field_id
        : block.id;

    const value = formValues[fieldId];
    const inputType =
      typeof block.config.input_type === "string"
        ? block.config.input_type
        : "";

    // Validate required fields (standard required)
    if (block.config.required && isEmpty(value)) {
      errors[fieldId] = errorMessages.required || "This field is required";
      continue; // Skip other validations if empty and required
    }

    // Validate checkbox required (must be checked)
    if (block.config.check_required && block.type === "form-checkbox") {
      const isChecked =
        value === true || (Array.isArray(value) && value.length > 0);
      if (!isChecked) {
        errors[fieldId] =
          errorMessages.check_required || "You must check this box to continue";
        continue;
      }
    }

    // Validate per-option check_required for checkbox groups
    if (block.type === "form-checkbox" && block.config.options) {
      const options = block.config.options as Array<{
        value: string;
        label: string;
        check_required?: boolean;
      }>;
      const checkedValues = Array.isArray(value) ? value : [];

      for (const option of options) {
        if (option.check_required && !checkedValues.includes(option.value)) {
          errors[fieldId] = `You must check "${option.label}" to continue`;
          break;
        }
      }

      if (errors[fieldId]) {
        continue;
      }
    }

    // Skip further validations if field is empty and not required
    if (isEmpty(value)) {
      continue;
    }

    // Type-specific validation
    switch (inputType) {
      case "email":
        if (!validateEmail(value)) {
          errors[fieldId] =
            errorMessages.invalid_email || "Please enter a valid email address";
          continue;
        }
        break;
      case "url":
        if (!validateURL(value)) {
          errors[fieldId] =
            errorMessages.invalid_url ||
            "Please enter a valid URL (e.g., https://example.com)";
          continue;
        }
        break;
      case "tel":
        if (!validatePhoneNumber(value)) {
          errors[fieldId] =
            errorMessages.invalid_phone || "Please enter a valid phone number";
          continue;
        }
        break;
      case "date":
        if (!validateDate(value)) {
          errors[fieldId] =
            errorMessages.invalid_date || "Please enter a valid date";
          continue;
        }
        break;
      case "time":
        if (!validateTime(value)) {
          errors[fieldId] =
            errorMessages.invalid_time || "Please enter a valid time";
          continue;
        }
        break;
      case "color":
        if (!validateColor(value)) {
          errors[fieldId] =
            errorMessages.invalid_color ||
            "Please enter a valid color code (e.g., #FF0000)";
          continue;
        }
        break;
    }

    // Custom validation type
    if (block.config.validation_type) {
      const validationType = block.config.validation_type as string;

      switch (validationType) {
        case "zipcode":
          if (!validateZipCode(value)) {
            errors[fieldId] = TYPE_ERROR_MESSAGES.zipcode;
            continue;
          }
          break;
        case "creditcard":
          if (!validateCreditCard(value)) {
            errors[fieldId] = TYPE_ERROR_MESSAGES.creditcard;
            continue;
          }
          break;
        case "ip":
          if (!validateIPAddress(value)) {
            errors[fieldId] = TYPE_ERROR_MESSAGES.ip;
            continue;
          }
          break;
      }
    }

    // Validate min/max length
    if (
      block.config.minLength &&
      !validateMinLength(value, block.config.minLength)
    ) {
      errors[fieldId] = errorMessages.min_length
        ? interpolateMessage(errorMessages.min_length, {
            min: block.config.minLength,
          })
        : "This field must be at least " +
          block.config.minLength +
          " characters long";
      continue;
    }

    if (
      block.config.maxLength &&
      !validateMaxLength(value, block.config.maxLength)
    ) {
      errors[fieldId] = errorMessages.max_length
        ? interpolateMessage(errorMessages.max_length, {
            max: block.config.maxLength,
          })
        : "This field must be less than " +
          block.config.maxLength +
          " characters long";
      continue;
    }

    // Validate min/max value (for number inputs)
    if (
      block.config.min !== undefined &&
      !validateMinValue(value, block.config.min)
    ) {
      errors[fieldId] = errorMessages.min_value
        ? interpolateMessage(errorMessages.min_value, { min: block.config.min })
        : "Value must be at least " + block.config.min;
      continue;
    }

    if (
      block.config.max !== undefined &&
      !validateMaxValue(value, block.config.max)
    ) {
      errors[fieldId] = errorMessages.max_value
        ? interpolateMessage(errorMessages.max_value, { max: block.config.max })
        : "Value must be no more than " + block.config.max;
      continue;
    }

    // Validate custom pattern (runs last, after type-specific validation)
    if (block.config.pattern && !validatePattern(value, block.config.pattern)) {
      const patternMessage = block.config.pattern_message
        ? block.config.pattern_message
        : "This field has an invalid format";
      errors[fieldId] = patternMessage as string;
      continue;
    }
  }

  return Object.keys(errors).length > 0 ? errors : true;
}

/**
 * Validates a single field
 * @param block The block instance to validate
 * @param value The current value of the field
 * @param settings Optional form settings for custom error messages
 * @returns Error message if validation fails, undefined if valid
 */
export function validateField(
  block: BlockInstance,
  value: unknown,
  settings?: FormSettings,
): string | undefined {
  // Skip button blocks and non-input blocks
  if (block.type === "form-button" || block.type === "form-inline-group") {
    return undefined;
  }

  const errorMessages = settings?.error_messages || {};
  const inputType =
    typeof block.config.input_type === "string" ? block.config.input_type : "";

  // Validate required fields (standard required)
  if (block.config.required && isEmpty(value)) {
    return errorMessages.required || "This field is required";
  }

  // Validate checkbox required (must be checked)
  if (block.config.check_required && block.type === "form-checkbox") {
    const isChecked =
      value === true || (Array.isArray(value) && value.length > 0);
    if (!isChecked) {
      return (
        errorMessages.check_required || "You must check this box to continue"
      );
    }
  }

  // Validate per-option check_required for checkbox groups
  if (block.type === "form-checkbox" && block.config.options) {
    const options = block.config.options as Array<{
      value: string;
      label: string;
      check_required?: boolean;
    }>;
    const checkedValues = Array.isArray(value) ? value : [];

    for (const option of options) {
      if (option.check_required && !checkedValues.includes(option.value)) {
        return `You must check "${option.label}" to continue`;
      }
    }
  }

  // Skip further validations if field is empty and not required
  if (isEmpty(value)) {
    return undefined;
  }

  // Type-specific validation
  switch (inputType) {
    case "email":
      if (!validateEmail(value)) {
        return (
          errorMessages.invalid_email || "Please enter a valid email address"
        );
      }
      break;
    case "url":
      if (!validateURL(value)) {
        return (
          errorMessages.invalid_url ||
          "Please enter a valid URL (e.g., https://example.com)"
        );
      }
      break;
    case "tel":
      if (!validatePhoneNumber(value)) {
        return (
          errorMessages.invalid_phone || "Please enter a valid phone number"
        );
      }
      break;
    case "date":
      if (!validateDate(value)) {
        return errorMessages.invalid_date || "Please enter a valid date";
      }
      break;
    case "time":
      if (!validateTime(value)) {
        return errorMessages.invalid_time || "Please enter a valid time";
      }
      break;
    case "color":
      if (!validateColor(value)) {
        return (
          errorMessages.invalid_color ||
          "Please enter a valid color code (e.g., #FF0000)"
        );
      }
      break;
  }

  // Custom validation type
  if (block.config.validation_type) {
    const validationType = block.config.validation_type as string;

    switch (validationType) {
      case "zipcode":
        if (!validateZipCode(value)) {
          return TYPE_ERROR_MESSAGES.zipcode;
        }
        break;
      case "creditcard":
        if (!validateCreditCard(value)) {
          return TYPE_ERROR_MESSAGES.creditcard;
        }
        break;
      case "ip":
        if (!validateIPAddress(value)) {
          return TYPE_ERROR_MESSAGES.ip;
        }
        break;
    }
  }

  // Validate min/max length
  if (
    block.config.minLength &&
    !validateMinLength(value, block.config.minLength)
  ) {
    return errorMessages.min_length
      ? interpolateMessage(errorMessages.min_length, {
          min: block.config.minLength,
        })
      : "This field must be at least " +
          block.config.minLength +
          " characters long";
  }

  if (
    block.config.maxLength &&
    !validateMaxLength(value, block.config.maxLength)
  ) {
    return errorMessages.max_length
      ? interpolateMessage(errorMessages.max_length, {
          max: block.config.maxLength,
        })
      : "This field must be less than " +
          block.config.maxLength +
          " characters long";
  }

  // Validate min/max value (for number inputs)
  if (
    block.config.min !== undefined &&
    !validateMinValue(value, block.config.min)
  ) {
    return errorMessages.min_value
      ? interpolateMessage(errorMessages.min_value, { min: block.config.min })
      : "Value must be at least " + block.config.min;
  }

  if (
    block.config.max !== undefined &&
    !validateMaxValue(value, block.config.max)
  ) {
    return errorMessages.max_value
      ? interpolateMessage(errorMessages.max_value, { max: block.config.max })
      : "Value must be no more than " + block.config.max;
  }

  // Validate custom pattern (runs last, after type-specific validation)
  if (block.config.pattern && !validatePattern(value, block.config.pattern)) {
    const patternMessage = block.config.pattern_message
      ? block.config.pattern_message
      : "This field has an invalid format";
    return patternMessage as string;
  }

  return undefined;
}
