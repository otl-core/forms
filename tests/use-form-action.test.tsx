import type { FormDocument, FormSettings } from "@otl-core/cms-types";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { FormProvider, useForm } from "../src/form-context";
import { useFormAction } from "../src/use-form-action";

function makeDocument(overrides?: Partial<FormDocument>): FormDocument {
  return {
    document_id: "doc-1",
    pages: [
      {
        id: "page-1",
        label: "Page 1",
        blocks: [],
      },
      {
        id: "page-2",
        label: "Page 2",
        blocks: [],
      },
    ],
    ...overrides,
  } as FormDocument;
}

function makeSettings(overrides?: Partial<FormSettings>): FormSettings {
  return { ...overrides } as FormSettings;
}

describe("useFormAction — set_values", () => {
  it("does not apply set_values on render, only after onClick is triggered", async () => {
    const blockId = "btn-1";
    const doc = makeDocument({
      pages: [
        {
          id: "page-1",
          label: "Page 1",
          blocks: [
            {
              id: blockId,
              type: "form-button",
              config: {
                action: "navigate",
                navigate_to_page: "next",
                advanced_options: {
                  set_values: { path: "website" },
                },
              },
            },
          ],
        },
        {
          id: "page-2",
          label: "Page 2",
          blocks: [],
        },
      ],
    } as Partial<FormDocument>);
    const settings = makeSettings();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FormProvider formId="form-1" document={doc} settings={settings}>
        {children}
      </FormProvider>
    );

    const { result } = renderHook(
      () => ({ form: useForm(), action: useFormAction(blockId) }),
      { wrapper },
    );

    // set_values must NOT be present before onClick
    expect(result.current.form.formValues).not.toHaveProperty("path");

    // Trigger onClick
    await act(async () => {
      await result.current.action?.onClick();
    });

    // set_values must be merged into formValues after onClick
    expect(result.current.form.formValues).toHaveProperty("path", "website");
  });

  it("merges set_values into existing formValues without overwriting unrelated keys", async () => {
    const blockId = "btn-2";
    const doc = makeDocument({
      pages: [
        {
          id: "page-1",
          label: "Page 1",
          blocks: [
            {
              id: blockId,
              type: "form-button",
              config: {
                action: "navigate",
                navigate_to_page: "next",
                advanced_options: {
                  set_values: { path: "website" },
                },
              },
            },
          ],
        },
        {
          id: "page-2",
          label: "Page 2",
          blocks: [],
        },
      ],
    } as Partial<FormDocument>);
    const settings = makeSettings();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FormProvider formId="form-1" document={doc} settings={settings}>
        {children}
      </FormProvider>
    );

    const { result } = renderHook(
      () => ({ form: useForm(), action: useFormAction(blockId) }),
      { wrapper },
    );

    // Pre-populate formValues with an unrelated key
    act(() => {
      result.current.form.setFormValues({ name: "Alice" });
    });

    expect(result.current.form.formValues).toEqual({ name: "Alice" });

    await act(async () => {
      await result.current.action?.onClick();
    });

    expect(result.current.form.formValues).toEqual({
      name: "Alice",
      path: "website",
    });
  });

  it("does not apply set_values when advanced_options is absent", async () => {
    const blockId = "btn-3";
    const doc = makeDocument({
      pages: [
        {
          id: "page-1",
          label: "Page 1",
          blocks: [
            {
              id: blockId,
              type: "form-button",
              config: {
                action: "navigate",
                navigate_to_page: "next",
              },
            },
          ],
        },
        {
          id: "page-2",
          label: "Page 2",
          blocks: [],
        },
      ],
    } as Partial<FormDocument>);
    const settings = makeSettings();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FormProvider formId="form-1" document={doc} settings={settings}>
        {children}
      </FormProvider>
    );

    const { result } = renderHook(
      () => ({ form: useForm(), action: useFormAction(blockId) }),
      { wrapper },
    );

    await act(async () => {
      await result.current.action?.onClick();
    });

    expect(result.current.form.formValues).toEqual({});
  });
});
