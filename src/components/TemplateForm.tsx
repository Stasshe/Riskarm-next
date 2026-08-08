"use client";

import { useEffect, useState } from "react";

import Button from "@/components/Button";
import Input from "@/components/Input";
import MarkdownEditor from "@/components/MarkdownEditor";
import Select from "@/components/Select";
import TextArea from "@/components/TextArea";
import { computeRiskLevel } from "@/lib/riskMatrix";
import {
  FEASIBILITY_LEVELS,
  type Feasibility,
  type FindingLocation,
  type FindingTemplateInput,
  SEVERITY_LEVELS,
  type Severity,
} from "@/types";

interface TemplateFormProps {
  initialValue?: FindingTemplateInput;
  onSubmit: (input: FindingTemplateInput) => Promise<void>;
  submitLabel: string;
}

function createRowId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function createRowIds(values: readonly (FindingLocation | string)[], prefix: string): string[] {
  return values.map(() => createRowId(prefix));
}

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
];

function createDefaultInput(): FindingTemplateInput {
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

function isSeverity(value: string): value is Severity {
  return SEVERITY_LEVELS.includes(value as Severity);
}

function isFeasibility(value: string): value is Feasibility {
  return FEASIBILITY_LEVELS.includes(value as Feasibility);
}

export default function TemplateForm({ initialValue, onSubmit, submitLabel }: TemplateFormProps) {
  const [formData, setFormData] = useState<FindingTemplateInput>(() => {
    if (initialValue) {
      return initialValue;
    }
    return createDefaultInput();
  });
  const [locationIds, setLocationIds] = useState<string[]>(() => {
    if (initialValue) {
      return createRowIds(initialValue.locations, "location");
    }
    return createRowIds(createDefaultInput().locations, "location");
  });
  const [stepIds, setStepIds] = useState<string[]>(() => {
    if (initialValue) {
      return createRowIds(initialValue.reproductionSteps, "step");
    }
    return createRowIds(createDefaultInput().reproductionSteps, "step");
  });
  const [referenceIds, setReferenceIds] = useState<string[]>(() => {
    if (initialValue) {
      return createRowIds(initialValue.references, "reference");
    }
    return createRowIds(createDefaultInput().references, "reference");
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setFormData(initialValue);
      setLocationIds(createRowIds(initialValue.locations, "location"));
      setStepIds(createRowIds(initialValue.reproductionSteps, "step"));
      setReferenceIds(createRowIds(initialValue.references, "reference"));
    }
  }, [initialValue]);

  const riskLevel = computeRiskLevel(formData.severity, formData.feasibility);

  const updateTextField = (
    field:
      | "title"
      | "severityReason"
      | "feasibilityReason"
      | "description"
      | "solutions"
      | "otherRemarks",
    value: string,
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateNotFound = (checked: boolean) => {
    setFormData((current) => ({ ...current, notFound: checked }));
  };

  const updateSeverity = (value: string) => {
    if (!isSeverity(value)) {
      return;
    }
    setFormData((current) => ({ ...current, severity: value }));
  };

  const updateFeasibility = (value: string) => {
    if (!isFeasibility(value)) {
      return;
    }
    setFormData((current) => ({ ...current, feasibility: value }));
  };

  const updateLocation = (index: number, field: keyof FindingLocation, value: string) => {
    setFormData((current) => ({
      ...current,
      locations: current.locations.map((location, locationIndex) => {
        if (locationIndex === index) {
          return { ...location, [field]: value };
        }
        return location;
      }),
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
      const nextLocations = current.locations.filter((_, locationIndex) => locationIndex !== index);
      if (nextLocations.length === 0) {
        return { ...current, locations: [{ method: "GET", url: "", parameter: "" }] };
      }
      return { ...current, locations: nextLocations };
    });
    setLocationIds((current) => {
      const nextIds = current.filter((_, locationIndex) => locationIndex !== index);
      if (nextIds.length === 0) {
        return [createRowId("location")];
      }
      return nextIds;
    });
  };

  const updateStringArray = (
    field: "reproductionSteps" | "references",
    index: number,
    value: string,
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => {
        if (itemIndex === index) {
          return value;
        }
        return item;
      }),
    }));
  };

  const addStringArrayRow = (field: "reproductionSteps" | "references", index?: number) => {
    setFormData((current) => {
      const nextItems = [...current[field]];
      if (index === undefined) {
        nextItems.push("");
      } else {
        nextItems.splice(index + 1, 0, "");
      }
      return { ...current, [field]: nextItems };
    });
    if (field === "reproductionSteps") {
      setStepIds((current) => {
        const nextIds = [...current];
        if (index === undefined) {
          nextIds.push(createRowId("step"));
        } else {
          nextIds.splice(index + 1, 0, createRowId("step"));
        }
        return nextIds;
      });
      return;
    }
    setReferenceIds((current) => {
      const nextIds = [...current];
      if (index === undefined) {
        nextIds.push(createRowId("reference"));
      } else {
        nextIds.splice(index + 1, 0, createRowId("reference"));
      }
      return nextIds;
    });
  };

  const removeStringArrayRow = (field: "reproductionSteps" | "references", index: number) => {
    setFormData((current) => {
      const nextItems = current[field].filter((_, itemIndex) => itemIndex !== index);
      if (nextItems.length === 0) {
        return { ...current, [field]: [""] };
      }
      return { ...current, [field]: nextItems };
    });
    if (field === "reproductionSteps") {
      setStepIds((current) => {
        const nextIds = current.filter((_, itemIndex) => itemIndex !== index);
        if (nextIds.length === 0) {
          return [createRowId("step")];
        }
        return nextIds;
      });
      return;
    }
    setReferenceIds((current) => {
      const nextIds = current.filter((_, itemIndex) => itemIndex !== index);
      if (nextIds.length === 0) {
        return [createRowId("reference")];
      }
      return nextIds;
    });
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    let targetIndex = index - 1;
    if (direction === "down") {
      targetIndex = index + 1;
    }

    setFormData((current) => {
      const currentStep = current.reproductionSteps[index];
      const targetStep = current.reproductionSteps[targetIndex];
      if (currentStep === undefined || targetStep === undefined) {
        return current;
      }

      const nextSteps = [...current.reproductionSteps];
      nextSteps[index] = targetStep;
      nextSteps[targetIndex] = currentStep;
      return { ...current, reproductionSteps: nextSteps };
    });
    setStepIds((current) => {
      const currentId = current[index];
      const targetId = current[targetIndex];
      if (currentId === undefined || targetId === undefined) {
        return current;
      }
      const nextIds = [...current];
      nextIds[index] = targetId;
      nextIds[targetIndex] = currentId;
      return nextIds;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        title: formData.title.trim(),
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
      <div className="mb-4 rounded-md border border-dark-border bg-dark-bg px-4 py-3 text-light-text">
        危険度: <span className="font-bold text-accent-color">{riskLevel}</span>
      </div>

      <Input
        label="タイトル"
        type="text"
        id="title"
        name="title"
        value={formData.title}
        onChange={(event) => updateTextField("title", event.target.value)}
        required
        disabled={submitting}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="被害度"
          id="severity"
          name="severity"
          options={SEVERITY_LEVELS.map((level) => ({ value: level, label: level }))}
          value={formData.severity}
          onChange={(event) => updateSeverity(event.target.value)}
          disabled={submitting}
        />
        <Select
          label="実現度"
          id="feasibility"
          name="feasibility"
          options={FEASIBILITY_LEVELS.map((level) => ({ value: level, label: level }))}
          value={formData.feasibility}
          onChange={(event) => updateFeasibility(event.target.value)}
          disabled={submitting}
        />
      </div>

      <TextArea
        label="被害設定理由"
        id="severityReason"
        name="severityReason"
        rows={3}
        value={formData.severityReason}
        onChange={(event) => updateTextField("severityReason", event.target.value)}
        disabled={submitting}
      />

      <TextArea
        label="実現度設定理由"
        id="feasibilityReason"
        name="feasibilityReason"
        rows={3}
        value={formData.feasibilityReason}
        onChange={(event) => updateTextField("feasibilityReason", event.target.value)}
        disabled={submitting}
      />

      <div className="mb-6">
        <div className="mb-2 text-sm font-medium text-light-text">発生個所</div>
        <div className="space-y-2">
          {formData.locations.map((location, index) => (
            <div className="grid gap-2 md:grid-cols-[8rem_1fr_1fr_auto]" key={locationIds[index]}>
              <Select
                name={`locationMethod.${index}`}
                options={HTTP_METHODS.map((method) => ({ value: method, label: method }))}
                value={location.method}
                onChange={(event) => updateLocation(index, "method", event.target.value)}
                className="mb-0"
                disabled={submitting}
              />
              <Input
                type="text"
                name={`locationUrl.${index}`}
                placeholder="URL"
                value={location.url}
                onChange={(event) => updateLocation(index, "url", event.target.value)}
                className="mb-0"
                disabled={submitting}
              />
              <Input
                type="text"
                name={`locationParameter.${index}`}
                placeholder="Parameter"
                value={location.parameter}
                onChange={(event) => updateLocation(index, "parameter", event.target.value)}
                className="mb-0"
                disabled={submitting}
              />
              <Button
                type="button"
                variant="danger"
                outline
                size="small"
                onClick={() => removeLocation(index)}
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
          onClick={addLocation}
          disabled={submitting}
        >
          発生個所を追加
        </Button>
      </div>

      <MarkdownEditor
        label="説明"
        rows={18}
        value={formData.description}
        onChange={(value) => updateTextField("description", value)}
        images={formData.images}
        disabled={submitting}
      />

      <div className="mb-6">
        <div className="mb-2 text-sm font-medium text-light-text">再現手順</div>
        <div className="space-y-2">
          {formData.reproductionSteps.map((step, index) => (
            <div className="grid gap-2 md:grid-cols-[auto_1fr_auto_auto]" key={stepIds[index]}>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="small"
                  onClick={() => moveStep(index, "up")}
                  disabled={submitting}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="small"
                  onClick={() => moveStep(index, "down")}
                  disabled={submitting}
                >
                  ↓
                </Button>
              </div>
              <TextArea
                name={`reproductionSteps.${index}`}
                placeholder="再現手順"
                rows={2}
                value={step}
                onChange={(event) =>
                  updateStringArray("reproductionSteps", index, event.target.value)
                }
                className="mb-0"
                disabled={submitting}
              />
              <Button
                type="button"
                variant="primary"
                outline
                size="small"
                onClick={() => addStringArrayRow("reproductionSteps", index)}
                disabled={submitting}
              >
                追加
              </Button>
              <Button
                type="button"
                variant="danger"
                outline
                size="small"
                onClick={() => removeStringArrayRow("reproductionSteps", index)}
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
          onClick={() => addStringArrayRow("reproductionSteps")}
          disabled={submitting}
        >
          再現手順を追加
        </Button>
      </div>

      <MarkdownEditor
        label="対策方法"
        rows={10}
        value={formData.solutions}
        onChange={(value) => updateTextField("solutions", value)}
        images={formData.images}
        disabled={submitting}
      />

      <MarkdownEditor
        label="その他指摘事項"
        rows={8}
        value={formData.otherRemarks}
        onChange={(value) => updateTextField("otherRemarks", value)}
        images={formData.images}
        disabled={submitting}
      />

      <div className="mb-6">
        <div className="mb-2 text-sm font-medium text-light-text">参考文献</div>
        <div className="space-y-2">
          {formData.references.map((reference, index) => (
            <div className="flex items-start gap-2" key={referenceIds[index]}>
              <TextArea
                name={`references.${index}`}
                placeholder="参考文献"
                rows={2}
                value={reference}
                onChange={(event) => updateStringArray("references", index, event.target.value)}
                className="mb-0 flex-1"
                disabled={submitting}
              />
              <Button
                type="button"
                variant="danger"
                outline
                size="small"
                onClick={() => removeStringArrayRow("references", index)}
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
          onClick={() => addStringArrayRow("references")}
          disabled={submitting}
        >
          参考文献を追加
        </Button>
      </div>

      <label className="mb-6 flex items-center gap-2 text-sm text-medium-text" htmlFor="notFound">
        <Input
          type="checkbox"
          id="notFound"
          name="notFound"
          checked={formData.notFound}
          onChange={(event) => updateNotFound(event.target.checked)}
          className="mb-0"
          inputClassName="!h-4 !w-4 !p-0"
          disabled={submitting}
        />
        発見されなかった脆弱性として扱う
      </label>

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
