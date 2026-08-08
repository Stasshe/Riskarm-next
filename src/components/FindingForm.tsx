"use client";

import { useEffect, useState } from "react";

import ArrayFieldEditor from "@/components/ArrayFieldEditor";
import Button from "@/components/Button";
import ImageUploadWidget from "@/components/ImageUploadWidget";
import Input from "@/components/Input";
import Select from "@/components/Select";
import TextArea from "@/components/TextArea";
import { computeRiskLevel } from "@/lib/riskMatrix";
import {
  FEASIBILITY_LEVELS,
  type Feasibility,
  type FindingContentInput,
  type FindingImage,
  type FindingLocation,
  type FindingTemplate,
  SEVERITY_LEVELS,
  type Severity,
} from "@/types";

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "TRACE",
  "CONNECT",
  "その他",
] as const;

interface FindingFormProps {
  initialValue?: FindingContentInput;
  onSubmit: (input: FindingContentInput) => Promise<void>;
  submitLabel: string;
  templates?: FindingTemplate[];
}

function createRowId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function createRowIds(count: number, prefix: string): string[] {
  return Array.from({ length: count }, () => createRowId(prefix));
}

function createDefaultContent(): FindingContentInput {
  return {
    title: "",
    notFound: false,
    severity: "中",
    feasibility: "中",
    severityReason: "",
    feasibilityReason: "",
    locations: [{ method: "GET", url: "", parameter: "" }],
    description: "",
    reproductionSteps: [""],
    solutions: "",
    otherRemarks: "",
    references: [""],
    images: [],
  };
}

export default function FindingForm({
  initialValue,
  onSubmit,
  submitLabel,
  templates = [],
}: FindingFormProps) {
  const [formData, setFormData] = useState<FindingContentInput>(
    () => initialValue ?? createDefaultContent(),
  );
  const [locationIds, setLocationIds] = useState<string[]>(() =>
    createRowIds((initialValue ?? createDefaultContent()).locations.length, "location"),
  );
  const [stepIds, setStepIds] = useState<string[]>(() =>
    createRowIds((initialValue ?? createDefaultContent()).reproductionSteps.length, "step"),
  );
  const [referenceIds, setReferenceIds] = useState<string[]>(() =>
    createRowIds((initialValue ?? createDefaultContent()).references.length, "reference"),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setFormData(initialValue);
      setLocationIds(createRowIds(initialValue.locations.length, "location"));
      setStepIds(createRowIds(initialValue.reproductionSteps.length, "step"));
      setReferenceIds(createRowIds(initialValue.references.length, "reference"));
    }
  }, [initialValue]);

  const riskLevel = computeRiskLevel(formData.severity, formData.feasibility);

  const updateField = <K extends keyof FindingContentInput>(
    field: K,
    value: FindingContentInput[K],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  // --- Locations ---
  const updateLocation = (index: number, field: keyof FindingLocation, value: string) => {
    setFormData((current) => ({
      ...current,
      locations: current.locations.map((location, locationIndex) =>
        locationIndex === index ? { ...location, [field]: value } : location,
      ),
    }));
  };
  const addLocation = () => {
    setFormData((current) => ({
      ...current,
      locations: [...current.locations, { method: "GET", url: "", parameter: "" }],
    }));
    setLocationIds((current) => [...current, createRowId("location")]);
  };
  const removeLocation = (index: number) => {
    setFormData((current) => {
      const next = current.locations.filter((_, i) => i !== index);
      return {
        ...current,
        locations: next.length > 0 ? next : [{ method: "GET", url: "", parameter: "" }],
      };
    });
    setLocationIds((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createRowId("location")];
    });
  };

  // --- Reproduction steps ---
  const updateStep = (index: number, value: string) => {
    setFormData((current) => ({
      ...current,
      reproductionSteps: current.reproductionSteps.map((step, stepIndex) =>
        stepIndex === index ? value : step,
      ),
    }));
  };
  const addStep = () => {
    setFormData((current) => ({
      ...current,
      reproductionSteps: [...current.reproductionSteps, ""],
    }));
    setStepIds((current) => [...current, createRowId("step")]);
  };
  const removeStep = (index: number) => {
    setFormData((current) => {
      const next = current.reproductionSteps.filter((_, i) => i !== index);
      return { ...current, reproductionSteps: next.length > 0 ? next : [""] };
    });
    setStepIds((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createRowId("step")];
    });
  };
  const moveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setFormData((current) => {
      if (targetIndex < 0 || targetIndex >= current.reproductionSteps.length) {
        return current;
      }
      const next = [...current.reproductionSteps];
      const a = next[index];
      const b = next[targetIndex];
      if (a === undefined || b === undefined) {
        return current;
      }
      next[index] = b;
      next[targetIndex] = a;
      return { ...current, reproductionSteps: next };
    });
    setStepIds((current) => {
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const a = next[index];
      const b = next[targetIndex];
      if (a === undefined || b === undefined) {
        return current;
      }
      next[index] = b;
      next[targetIndex] = a;
      return next;
    });
  };

  // --- References ---
  const updateReference = (index: number, value: string) => {
    setFormData((current) => ({
      ...current,
      references: current.references.map((reference, referenceIndex) =>
        referenceIndex === index ? value : reference,
      ),
    }));
  };
  const addReference = () => {
    setFormData((current) => ({ ...current, references: [...current.references, ""] }));
    setReferenceIds((current) => [...current, createRowId("reference")]);
  };
  const removeReference = (index: number) => {
    setFormData((current) => {
      const next = current.references.filter((_, i) => i !== index);
      return { ...current, references: next.length > 0 ? next : [""] };
    });
    setReferenceIds((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createRowId("reference")];
    });
  };

  // --- Images ---
  const handleImagesChange = (images: FindingImage[]) => {
    updateField("images", images);
  };
  const handleImageAdded = (image: FindingImage) => {
    const token = `\n![${image.filename}](riskarm-image:${image.id})\n`;
    setFormData((current) => ({ ...current, description: `${current.description}${token}` }));
  };

  // --- Template apply (ported UX from original FindingForm.tsx applyTemplate) ---
  const applyTemplate = () => {
    const template = templates.find((candidate) => candidate.id === selectedTemplateId);
    if (!template) {
      return;
    }

    const filledLabels: string[] = [];
    if (formData.severityReason.trim()) filledLabels.push("被害設定理由");
    if (formData.feasibilityReason.trim()) filledLabels.push("実現度設定理由");
    if (formData.description.trim()) filledLabels.push("説明");
    if (formData.solutions.trim()) filledLabels.push("対策方法");
    if (formData.otherRemarks.trim()) filledLabels.push("その他指摘事項");
    if (formData.reproductionSteps.some((step) => step.trim())) filledLabels.push("再現手順");
    if (formData.locations.some((location) => location.url.trim())) filledLabels.push("発生個所");
    if (formData.references.some((reference) => reference.trim())) filledLabels.push("参考文献");

    if (filledLabels.length > 0) {
      const confirmed = window.confirm(
        `以下のフィールドに既にデータが含まれています: ${filledLabels.join("、")}。上書きしますか？`,
      );
      if (!confirmed) {
        return;
      }
    }

    const nextLocations = template.locations.length > 0 ? template.locations : formData.locations;
    const nextSteps = template.reproductionSteps.some((step) => step.trim())
      ? template.reproductionSteps
      : formData.reproductionSteps;
    const nextReferences = template.references.some((reference) => reference.trim())
      ? template.references
      : formData.references;

    setFormData((current) => ({
      ...current,
      title: template.title || current.title,
      severity: template.severity,
      feasibility: template.feasibility,
      severityReason: template.severityReason || current.severityReason,
      feasibilityReason: template.feasibilityReason || current.feasibilityReason,
      description: template.description || current.description,
      solutions: template.solutions || current.solutions,
      otherRemarks: template.otherRemarks || current.otherRemarks,
      reproductionSteps: nextSteps,
      locations: nextLocations,
      references: nextReferences,
    }));
    setLocationIds(createRowIds(nextLocations.length, "location"));
    setStepIds(createRowIds(nextSteps.length, "step"));
    setReferenceIds(createRowIds(nextReferences.length, "reference"));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ ...formData, title: formData.title.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-dark-border bg-dark-card p-6 shadow-md"
    >
      <Input
        label="タイトル"
        type="text"
        value={formData.title}
        onChange={(event) => updateField("title", event.target.value)}
        required
        disabled={submitting}
      />

      {templates.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-light-text">テンプレートから適用</div>
          <div className="flex gap-2">
            <Select
              options={templates.map((template) => ({ value: template.id, label: template.title }))}
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="mb-0 flex-1"
              disabled={submitting}
            />
            <Button
              type="button"
              variant="primary"
              onClick={applyTemplate}
              disabled={submitting || !selectedTemplateId}
            >
              適用
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <input
          type="checkbox"
          id="notFound"
          checked={formData.notFound}
          onChange={(event) => updateField("notFound", event.target.checked)}
          disabled={submitting}
        />
        <label htmlFor="notFound" className="text-sm text-medium-text">
          発見されなかった脆弱性として扱う
        </label>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Select
          label="被害度"
          options={SEVERITY_LEVELS.map((level) => ({ value: level, label: level }))}
          value={formData.severity}
          onChange={(event) => updateField("severity", event.target.value as Severity)}
          className="mb-0"
          disabled={submitting}
        />
        <Select
          label="実現度"
          options={FEASIBILITY_LEVELS.map((level) => ({ value: level, label: level }))}
          value={formData.feasibility}
          onChange={(event) => updateField("feasibility", event.target.value as Feasibility)}
          className="mb-0"
          disabled={submitting}
        />
      </div>

      <div className="mb-6 rounded-md border border-accent-color bg-dark-bg px-4 py-3">
        <span className="text-sm text-medium-text">危険度（自動算出）: </span>
        <span className="text-lg font-bold text-accent-color">{riskLevel}</span>
      </div>

      <TextArea
        label="被害設定理由"
        rows={3}
        value={formData.severityReason}
        onChange={(event) => updateField("severityReason", event.target.value)}
        disabled={submitting}
      />
      <TextArea
        label="実現度設定理由"
        rows={3}
        value={formData.feasibilityReason}
        onChange={(event) => updateField("feasibilityReason", event.target.value)}
        disabled={submitting}
      />

      <ArrayFieldEditor
        label="発生個所"
        items={formData.locations}
        ids={locationIds}
        onAdd={addLocation}
        onRemove={removeLocation}
        addLabel="発生個所を追加"
        disabled={submitting}
        renderRow={(location, index) => (
          <div className="flex flex-wrap gap-2">
            <Select
              options={HTTP_METHODS.map((method) => ({ value: method, label: method }))}
              value={location.method}
              onChange={(event) => updateLocation(index, "method", event.target.value)}
              className="mb-0 w-32"
              disabled={submitting}
            />
            <Input
              type="text"
              placeholder="URL"
              value={location.url}
              onChange={(event) => updateLocation(index, "url", event.target.value)}
              className="mb-0 flex-1"
              disabled={submitting}
            />
            <Input
              type="text"
              placeholder="パラメータ"
              value={location.parameter}
              onChange={(event) => updateLocation(index, "parameter", event.target.value)}
              className="mb-0 flex-1"
              disabled={submitting}
            />
          </div>
        )}
      />

      <TextArea
        label="説明"
        rows={6}
        value={formData.description}
        onChange={(event) => updateField("description", event.target.value)}
        disabled={submitting}
      />

      <ImageUploadWidget
        images={formData.images}
        onChange={handleImagesChange}
        onImageAdded={handleImageAdded}
        disabled={submitting}
      />

      <ArrayFieldEditor
        label="再現手順"
        items={formData.reproductionSteps}
        ids={stepIds}
        onAdd={addStep}
        onRemove={removeStep}
        onMove={moveStep}
        addLabel="再現手順を追加"
        disabled={submitting}
        renderRow={(step, index) => (
          <TextArea
            rows={2}
            placeholder="再現手順"
            value={step}
            onChange={(event) => updateStep(index, event.target.value)}
            className="mb-0"
            disabled={submitting}
          />
        )}
      />

      <TextArea
        label="対策方法"
        rows={4}
        value={formData.solutions}
        onChange={(event) => updateField("solutions", event.target.value)}
        disabled={submitting}
      />

      <TextArea
        label="その他指摘事項"
        rows={3}
        value={formData.otherRemarks}
        onChange={(event) => updateField("otherRemarks", event.target.value)}
        disabled={submitting}
      />

      <ArrayFieldEditor
        label="参考文献"
        items={formData.references}
        ids={referenceIds}
        onAdd={addReference}
        onRemove={removeReference}
        addLabel="参考文献を追加"
        disabled={submitting}
        renderRow={(reference, index) => (
          <TextArea
            rows={2}
            placeholder="参考文献"
            value={reference}
            onChange={(event) => updateReference(index, event.target.value)}
            className="mb-0"
            disabled={submitting}
          />
        )}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          outline
          onClick={() => window.history.back()}
          disabled={submitting}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
