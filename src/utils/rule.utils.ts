import { ConditionOperator, Rule } from "@otl-core/cms-types";

function evaluateCondition(
  operator: ConditionOperator,
  fieldValue: unknown,
  ruleValue: unknown,
): boolean {
  switch (operator) {
    case "equals":
      return fieldValue === ruleValue;
    case "not_equals":
      return fieldValue !== ruleValue;
    case "contains":
      return String(fieldValue || "").includes(String(ruleValue));
    case "not_contains":
      return !String(fieldValue || "").includes(String(ruleValue));
    case "starts_with":
      return String(fieldValue || "").startsWith(String(ruleValue));
    case "ends_with":
      return String(fieldValue || "").endsWith(String(ruleValue));
    case "greater_than":
      return Number(fieldValue) > Number(ruleValue);
    case "less_than":
      return Number(fieldValue) < Number(ruleValue);
    case "greater_than_or_equal":
      return Number(fieldValue) >= Number(ruleValue);
    case "less_than_or_equal":
      return Number(fieldValue) <= Number(ruleValue);
    case "is_empty":
      return (
        !fieldValue ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "is_not_empty":
      return (
        !!fieldValue &&
        fieldValue !== "" &&
        (!Array.isArray(fieldValue) || fieldValue.length > 0)
      );
    case "is_checked":
      return fieldValue === true;
    case "is_not_checked":
      return fieldValue !== true;
    case "includes":
      return Array.isArray(fieldValue) && fieldValue.includes(ruleValue);
    case "not_includes":
      return !Array.isArray(fieldValue) || !fieldValue.includes(ruleValue);
    default:
      return false;
  }
}

export function evaluateVisibilityRules(
  rules: Rule[],
  formValues: Record<string, unknown>,
): "block" | "none" {
  const visibilityRules = rules.filter((r) => r.type === "visible_when");

  // If no visibility rules, show by default
  if (visibilityRules.length === 0) {
    return "block";
  }

  // If any visibility rule matches, show the field
  for (const rule of visibilityRules) {
    const fieldValue = formValues[rule.field];
    if (evaluateCondition(rule.operator, fieldValue, rule.value)) {
      return "block";
    }
  }

  return "none";
}

export function evaluateDisabledRules(
  rules: Rule[],
  formValues: Record<string, unknown>,
): boolean {
  const disabledRules = rules.filter((r) => r.type === "disabled_when");

  // If no disabled rules, not disabled
  if (disabledRules.length === 0) {
    return false;
  }

  // If any disabled rule matches, disable the field
  for (const rule of disabledRules) {
    const fieldValue = formValues[rule.field];
    if (evaluateCondition(rule.operator, fieldValue, rule.value)) {
      return true;
    }
  }

  return false;
}
