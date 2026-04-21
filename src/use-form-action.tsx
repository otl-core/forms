"use client";

import type {
  BlockInstance,
  FormAdvancedOptions,
  FormPage,
} from "@otl-core/cms-types";
import { useCallback, useMemo } from "react";
import { useForm } from "./form-context";
import {
  findBlockInDocument,
  getNextPage,
  getPreviousPage,
} from "./utils/page.utils";
import {
  evaluateDisabledRules,
  evaluateVisibilityRules,
} from "./utils/rule.utils";
import { validatePage } from "./utils/validation.utils";

interface FormAction {
  variant: "primary" | "secondary" | "outline" | "ghost";
  size: "sm" | "md" | "lg";
  align: "left" | "center" | "right";
  disabled: boolean;
  loading: boolean;
  display: "block" | "none";
  text: string;
  onClick: () => Promise<void>;
}

function parseFormButtonAlign(raw: unknown): FormAction["align"] {
  if (raw === "left" || raw === "center" || raw === "right") {
    return raw;
  }
  return "center";
}

export function useFormAction(id: string): FormAction | null {
  const {
    formId,
    document,
    formValues,
    setErrors,
    loading,
    setLoading,
    currentPage,
    setCurrentPage,
    setFormValues,
    setGlobalError,
    settings,
    analyticsSettings,
    onAnalyticsEvent,
    formName,
    environmentVariantId,
    formVariantId,
    locale,
  } = useForm();

  const block: BlockInstance | null = useMemo(() => {
    return findBlockInDocument(id, document);
  }, [document, id]);

  const navigate = useCallback(
    (to: string, skipValidation: boolean = false) => {
      const currentPageValid: true | { [key: string]: string } =
        skipValidation ||
        to === "first" ||
        validatePage(currentPage, formValues, settings);

      if (currentPageValid !== true) {
        // Replace errors, don't accumulate
        setErrors(currentPageValid);
        return;
      }

      // Clear errors when navigation is successful
      setErrors(null);
      setGlobalError(null);

      let targetPage: FormPage | null = null;

      switch (to) {
        case "prev":
          const previousPage = getPreviousPage(currentPage, document);
          if (previousPage) {
            targetPage = previousPage;
            setCurrentPage(previousPage);
          } else {
            console.error("[ERROR] No previous page found.");
            setGlobalError("Configuration Error: No previous page found.");
          }
          break;
        case "next":
          const nextPage = getNextPage(currentPage, document);
          if (nextPage) {
            targetPage = nextPage;
            setCurrentPage(nextPage);
          } else {
            console.error("[ERROR] No next page found.");
            setGlobalError("Configuration Error: No next page found.");
          }
          break;
        case "first":
          targetPage = document.pages[0];
          setCurrentPage(document.pages[0]);
          break;
        case "last":
          targetPage = document.pages[document.pages.length - 1];
          setCurrentPage(document.pages[document.pages.length - 1]);
          break;
        default:
          targetPage =
            document.pages.find((page) => page.id === to) || document.pages[0];
          setCurrentPage(targetPage);
          break;
      }

      // Notify parent window of page change (for editor sync)
      if (targetPage && typeof window !== "undefined" && window.parent) {
        window.parent.postMessage(
          { type: "FORM_PAGE_CHANGED", pageId: targetPage.id },
          window.location.origin,
        );
      }

      // Emit form_page_change analytics event
      if (
        targetPage &&
        analyticsSettings?.track_page_navigation &&
        onAnalyticsEvent
      ) {
        const targetIndex = document.pages.findIndex(
          (p) => p.id === targetPage.id,
        );
        onAnalyticsEvent("form_page_change", {
          form_id: formId,
          form_name: formName,
          page_id: targetPage.id,
          page_index: targetIndex,
          total_pages: document.pages.length,
        });
      }
    },
    [
      currentPage,
      setCurrentPage,
      document,
      formId,
      formValues,
      settings,
      setErrors,
      setGlobalError,
      analyticsSettings,
      onAnalyticsEvent,
      formName,
    ],
  );

  const submit = useCallback(
    async (skipValidation: boolean): Promise<boolean> => {
      if (!block) {
        return false;
      }

      if (!skipValidation) {
        // Collect all errors from all pages
        let allErrors: { [key: string]: string } = {};
        let hasErrors = false;

        for (const page of document.pages) {
          const result = validatePage(page, formValues, settings);
          if (result !== true) {
            allErrors = { ...allErrors, ...result };
            hasErrors = true;
          }
        }

        if (hasErrors) {
          setErrors(allErrors);
          setGlobalError(
            "Please fill in all required fields before submitting.",
          );

          // Emit form_error analytics event
          if (analyticsSettings?.track_form_error && onAnalyticsEvent) {
            onAnalyticsEvent("form_error", {
              form_id: formId,
              form_name: formName,
              error_count: Object.keys(allErrors).length,
              error_fields: Object.keys(allErrors),
            });
          }

          return false;
        }
      }

      // Clear all errors on successful validation
      setErrors(null);
      setGlobalError(null);

      setLoading(true);
      try {
        // Button-level submission_type override takes precedence over the form-level setting
        const buttonTypeOverride =
          block &&
          typeof block.config.submission_type === "string" &&
          block.config.submission_type
            ? block.config.submission_type
            : undefined;

        const submissionData = {
          form_id: formId,
          type: buttonTypeOverride ?? settings?.form_type ?? "General",
          locale: locale ?? "en",
          data: formValues,
          environment_type: "page",
          environment_id: formId,
          environment_path:
            typeof window !== "undefined"
              ? window.location.pathname
              : undefined,
          form_variant_id: formVariantId ?? "",
          environment_variant_id: environmentVariantId ?? "",
        };

        const response = await fetch("/api/submission", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submissionData),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setGlobalError(
            result.message || "Failed to submit form. Please try again.",
          );
          return false;
        }

        // Emit form_submit analytics event on success
        if (analyticsSettings?.track_form_submit && onAnalyticsEvent) {
          onAnalyticsEvent("form_submit", {
            form_id: formId,
            form_name: formName,
            total_pages: document.pages.length,
            custom_event_name: analyticsSettings.submit_event_name,
            target_providers: analyticsSettings.target_providers,
          });
        }

        return true;
      } catch (error) {
        setGlobalError("An error occurred while submitting the form.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [
      block,
      document,
      formId,
      formValues,
      setErrors,
      setGlobalError,
      setLoading,
      settings,
      analyticsSettings,
      onAnalyticsEvent,
      formName,
      locale,
      formVariantId,
      environmentVariantId,
    ],
  );

  const reset = useCallback(async () => {
    if (!block) {
      return;
    }
    setFormValues({});
    setErrors(null);
    setGlobalError(null);
    return Promise.resolve();
  }, [block, setFormValues, setErrors, setGlobalError]);

  const executeAction = useCallback(async () => {
    if (!block) {
      return;
    }

    const advancedOptions = block.config
      .advanced_options as FormAdvancedOptions;

    const setValues = advancedOptions?.set_values;
    if (
      setValues &&
      typeof setValues === "object" &&
      !Array.isArray(setValues)
    ) {
      setFormValues((prev) => ({ ...prev, ...setValues }));
    }

    const skipValidation = advancedOptions?.require_validation === false;
    const action = block.config.action as string;
    let to = String(block.config.navigate_to_page || "next");

    if (action === "reset") {
      await reset();
      to = "first"; // always navigate to first page after reset
      navigate(to, true);
    } else if (action === "submit") {
      const success = await submit(skipValidation);
      if (success) {
        navigate(to, skipValidation);
      }
    } else if (action === "navigate") {
      navigate(to, skipValidation);
    }

    return Promise.resolve();
  }, [block, navigate, submit, reset]);

  const display: "block" | "none" = useMemo(() => {
    if (!block) {
      return "none";
    }

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

    const rules = (block.config.advanced_options as FormAdvancedOptions)?.rules;
    if (!rules) {
      return false;
    }

    return evaluateDisabledRules(rules, formValues);
  }, [block, formValues, loading]);

  if (!block) {
    return null;
  }

  return {
    variant:
      typeof block.config.variant === "string"
        ? (block.config.variant as FormAction["variant"])
        : "primary",
    size:
      typeof block.config.size === "string"
        ? (block.config.size as FormAction["size"])
        : "md",
    align: parseFormButtonAlign(block.config.align),
    disabled,
    loading,
    display,
    text:
      typeof block.config.text === "string"
        ? block.config.text
        : typeof block.config.label === "string"
          ? block.config.label
          : "",
    onClick: executeAction,
  };
}
