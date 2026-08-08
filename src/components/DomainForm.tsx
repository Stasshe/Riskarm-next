"use client";

import { useEffect, useState } from "react";

import Button from "@/components/Button";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";
import type { DomainInput } from "@/types";

interface DomainFormProps {
  initialValue?: DomainInput;
  onSubmit: (input: DomainInput) => Promise<void>;
  submitLabel: string;
}

function createRowId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function createRowIds(values: readonly string[], prefix: string): string[] {
  return values.map(() => createRowId(prefix));
}

function currentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultInput(): DomainInput {
  const today = currentDateString();
  return {
    name: "",
    description: "",
    url: "",
    startDate: today,
    endDate: today,
    surveyItems: [""],
  };
}

function emptyToNull(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

export default function DomainForm({ initialValue, onSubmit, submitLabel }: DomainFormProps) {
  const [formData, setFormData] = useState<DomainInput>(() => {
    if (initialValue) {
      return initialValue;
    }
    return createDefaultInput();
  });
  const [surveyItemIds, setSurveyItemIds] = useState<string[]>(() => {
    if (initialValue) {
      return createRowIds(initialValue.surveyItems, "survey-item");
    }
    return createRowIds(createDefaultInput().surveyItems, "survey-item");
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setFormData(initialValue);
      setSurveyItemIds(createRowIds(initialValue.surveyItems, "survey-item"));
    }
  }, [initialValue]);

  const updateTextField = (field: "name" | "description" | "url", value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateDateField = (field: "startDate" | "endDate", value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateSurveyItem = (index: number, value: string) => {
    setFormData((current) => ({
      ...current,
      surveyItems: current.surveyItems.map((item, itemIndex) => {
        if (itemIndex === index) {
          return value;
        }
        return item;
      }),
    }));
  };

  const addSurveyItem = () => {
    setFormData((current) => ({ ...current, surveyItems: [...current.surveyItems, ""] }));
    setSurveyItemIds((current) => [...current, createRowId("survey-item")]);
  };

  const removeSurveyItem = (index: number) => {
    setFormData((current) => {
      const nextItems = current.surveyItems.filter((_, itemIndex) => itemIndex !== index);
      if (nextItems.length === 0) {
        return { ...current, surveyItems: [""] };
      }
      return { ...current, surveyItems: nextItems };
    });
    setSurveyItemIds((current) => {
      const nextIds = current.filter((_, itemIndex) => itemIndex !== index);
      if (nextIds.length === 0) {
        return [createRowId("survey-item")];
      }
      return nextIds;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        url: formData.url.trim(),
        startDate: emptyToNull(formData.startDate),
        endDate: emptyToNull(formData.endDate),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    window.history.back();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-dark-border bg-dark-card p-6 shadow-md"
    >
      <Input
        label="ドメイン名称"
        type="text"
        id="name"
        name="name"
        value={formData.name}
        onChange={(event) => updateTextField("name", event.target.value)}
        required
        disabled={submitting}
      />

      <TextArea
        label="説明"
        id="description"
        name="description"
        rows={4}
        value={formData.description}
        onChange={(event) => updateTextField("description", event.target.value)}
        disabled={submitting}
      />

      <Input
        label="URL"
        type="text"
        id="url"
        name="url"
        value={formData.url}
        onChange={(event) => updateTextField("url", event.target.value)}
        required
        disabled={submitting}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="開始日"
          type="date"
          id="startDate"
          name="startDate"
          value={formData.startDate ?? ""}
          onChange={(event) => updateDateField("startDate", event.target.value)}
          disabled={submitting}
        />
        <Input
          label="終了日"
          type="date"
          id="endDate"
          name="endDate"
          value={formData.endDate ?? ""}
          onChange={(event) => updateDateField("endDate", event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="mb-6">
        <div className="mb-2 text-sm font-medium text-light-text">検査実施項目</div>
        <div className="space-y-2">
          {formData.surveyItems.map((item, index) => (
            <div className="flex items-start gap-2" key={surveyItemIds[index]}>
              <Input
                type="text"
                name={`surveyItems.${index}`}
                placeholder="実施項目"
                value={item}
                onChange={(event) => updateSurveyItem(index, event.target.value)}
                className="mb-0 flex-1"
                disabled={submitting}
              />
              <Button
                type="button"
                variant="danger"
                outline
                size="small"
                onClick={() => removeSurveyItem(index)}
                disabled={submitting}
              >
                削除
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="primary"
          outline
          size="small"
          className="mt-3"
          onClick={addSurveyItem}
          disabled={submitting}
        >
          項目を追加
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          outline
          onClick={handleCancel}
          disabled={submitting}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
