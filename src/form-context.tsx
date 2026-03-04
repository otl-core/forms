"use client";

import type {
  FormAnalyticsCallback,
  FormAnalyticsSettings,
  FormDocument,
  FormPage,
  FormSettings,
} from "@otl-core/cms-types";
import React, { createContext, useContext, useEffect, useState } from "react";

interface FormContextValue {
  /** The actual form ID (from the form definition / PostgreSQL) */
  formId: string;
  document: FormDocument;
  settings: FormSettings;

  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;

  currentPage: FormPage;
  setCurrentPage: (page: FormPage) => void;

  formValues: Record<string, unknown>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;

  errors: { [key: string]: string } | null;
  setErrors: React.Dispatch<
    React.SetStateAction<{ [key: string]: string } | null>
  >;
  globalError: string | null;
  setGlobalError: React.Dispatch<React.SetStateAction<string | null>>;

  analyticsSettings?: FormAnalyticsSettings;
  onAnalyticsEvent?: FormAnalyticsCallback;
  formName?: string;
  hasStarted: boolean;
  setHasStarted: React.Dispatch<React.SetStateAction<boolean>>;
  /** A/B test: which page variant the form is rendered on */
  environmentVariantId?: string;
  /** A/B test: which form variant was resolved (for multivariate forms) */
  formVariantId?: string;
  /** Locale for the form submission */
  locale?: string;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export function useForm(): FormContextValue {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useForm must be used within a FormProvider");
  }
  return context;
}

export interface FormProviderProps {
  children: React.ReactNode;
  /** The actual form ID (from the form definition / PostgreSQL) */
  formId: string;
  document: FormDocument;
  settings: FormSettings;
  analyticsSettings?: FormAnalyticsSettings;
  onAnalyticsEvent?: FormAnalyticsCallback;
  formName?: string;
  /** A/B test: which page variant the form is rendered on */
  environmentVariantId?: string;
  /** A/B test: which form variant was resolved (for multivariate forms) */
  formVariantId?: string;
  /** Locale for the form submission */
  locale?: string;
}

export function FormProvider({
  children,
  formId,
  document,
  settings,
  analyticsSettings,
  onAnalyticsEvent,
  formName,
  environmentVariantId,
  formVariantId,
  locale,
}: FormProviderProps) {
  const [internalDocument, setInternalDocument] =
    useState<FormDocument>(document);
  const [currentPage, setCurrentPage] = useState<FormPage>(document.pages[0]);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Update internal document when prop changes
  useEffect(() => {
    setInternalDocument(document);

    // Update current page reference if it exists in the new document
    if (currentPage) {
      const updatedPage = document.pages.find((p) => p.id === currentPage.id);
      if (updatedPage) {
        setCurrentPage(updatedPage);
      } else if (document.pages.length > 0) {
        // If current page no longer exists, fall back to first page
        setCurrentPage(document.pages[0]);
      }
    } else if (document.pages.length > 0) {
      setCurrentPage(document.pages[0]);
    }
  }, [document]);

  return (
    <FormContext.Provider
      value={{
        formId,
        document: internalDocument,
        settings,

        loading,
        setLoading,

        currentPage,
        setCurrentPage,

        formValues,
        setFormValues,

        errors,
        setErrors,

        globalError,
        setGlobalError,

        analyticsSettings,
        onAnalyticsEvent,
        formName,
        hasStarted,
        setHasStarted,
        environmentVariantId,
        formVariantId,
        locale,
      }}
    >
      {children}
    </FormContext.Provider>
  );
}
