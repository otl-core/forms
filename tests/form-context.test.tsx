import type {
  FormAnalyticsSettings,
  FormDocument,
  FormSettings,
} from "@otl-core/cms-types";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "../src/form-context";

function makeDocument(overrides?: Partial<FormDocument>): FormDocument {
  return {
    document_id: "doc-1",
    pages: [
      {
        id: "page-1",
        label: "Page 1",
        blocks: [],
      },
    ],
    ...overrides,
  } as FormDocument;
}

function makeSettings(overrides?: Partial<FormSettings>): FormSettings {
  return {
    ...overrides,
  } as FormSettings;
}

describe("FormProvider", () => {
  it("should provide form context to children", () => {
    const doc = makeDocument();
    const settings = makeSettings();

    const { result } = renderHook(() => useForm(), {
      wrapper: ({ children }) => (
        <FormProvider formId="form-1" document={doc} settings={settings}>
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.formId).toBe("form-1");
    expect(result.current.document).toBe(doc);
    expect(result.current.settings).toBe(settings);
    expect(result.current.loading).toBe(false);
    expect(result.current.formValues).toEqual({});
    expect(result.current.errors).toBeNull();
    expect(result.current.globalError).toBeNull();
    expect(result.current.hasStarted).toBe(false);
  });

  it("should throw when useForm is called outside provider", () => {
    expect(() => {
      renderHook(() => useForm());
    }).toThrow("useForm must be used within a FormProvider");
  });

  it("should accept analytics settings", () => {
    const doc = makeDocument();
    const settings = makeSettings();
    const analyticsSettings: FormAnalyticsSettings = {
      track_form_start: true,
      track_form_submit: true,
      track_form_error: false,
      track_page_navigation: false,
    };
    const onAnalyticsEvent = vi.fn();

    const { result } = renderHook(() => useForm(), {
      wrapper: ({ children }) => (
        <FormProvider
          formId="form-1"
          document={doc}
          settings={settings}
          analyticsSettings={analyticsSettings}
          onAnalyticsEvent={onAnalyticsEvent}
          formName="Test Form"
        >
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.analyticsSettings).toBe(analyticsSettings);
    expect(result.current.onAnalyticsEvent).toBe(onAnalyticsEvent);
    expect(result.current.formName).toBe("Test Form");
  });

  it("should accept locale prop", () => {
    const doc = makeDocument();
    const settings = makeSettings();

    const { result } = renderHook(() => useForm(), {
      wrapper: ({ children }) => (
        <FormProvider
          formId="form-1"
          document={doc}
          settings={settings}
          locale="de"
        >
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.locale).toBe("de");
  });

  it("should accept variant IDs", () => {
    const doc = makeDocument();
    const settings = makeSettings();

    const { result } = renderHook(() => useForm(), {
      wrapper: ({ children }) => (
        <FormProvider
          formId="form-1"
          document={doc}
          settings={settings}
          environmentVariantId="env-variant-1"
          formVariantId="form-variant-1"
        >
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.environmentVariantId).toBe("env-variant-1");
    expect(result.current.formVariantId).toBe("form-variant-1");
  });

  it("should allow setting form values", () => {
    const doc = makeDocument();
    const settings = makeSettings();

    const { result } = renderHook(() => useForm(), {
      wrapper: ({ children }) => (
        <FormProvider formId="form-1" document={doc} settings={settings}>
          {children}
        </FormProvider>
      ),
    });

    act(() => {
      result.current.setFormValues({ name: "John", email: "john@test.com" });
    });

    expect(result.current.formValues).toEqual({
      name: "John",
      email: "john@test.com",
    });
  });

  it("should allow setting errors", () => {
    const doc = makeDocument();
    const settings = makeSettings();

    const { result } = renderHook(() => useForm(), {
      wrapper: ({ children }) => (
        <FormProvider formId="form-1" document={doc} settings={settings}>
          {children}
        </FormProvider>
      ),
    });

    act(() => {
      result.current.setErrors({ name: "Name is required" });
    });

    expect(result.current.errors).toEqual({ name: "Name is required" });

    act(() => {
      result.current.setErrors(null);
    });

    expect(result.current.errors).toBeNull();
  });

  it("should track hasStarted state", () => {
    const doc = makeDocument();
    const settings = makeSettings();

    const { result } = renderHook(() => useForm(), {
      wrapper: ({ children }) => (
        <FormProvider formId="form-1" document={doc} settings={settings}>
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.hasStarted).toBe(false);

    act(() => {
      result.current.setHasStarted(true);
    });

    expect(result.current.hasStarted).toBe(true);
  });

  it("should set current page from first document page", () => {
    const doc = makeDocument({
      pages: [
        { id: "p1", label: "First", blocks: [] },
        { id: "p2", label: "Second", blocks: [] },
      ],
    } as Partial<FormDocument>);
    const settings = makeSettings();

    const { result } = renderHook(() => useForm(), {
      wrapper: ({ children }) => (
        <FormProvider formId="form-1" document={doc} settings={settings}>
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.currentPage.id).toBe("p1");
  });
});
