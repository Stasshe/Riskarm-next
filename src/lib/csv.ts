import type { DomainInput } from "@/types";

/**
 * Port of original/app/utils/format.py parse_csv_to_json, adapted to the
 * camelCase DomainInput shape. Header-driven: any column not in the known
 * set is ignored, `name` is required, dates must be YYYY-MM-DD,
 * survey_items must be a JSON array when present. Bad rows throw (no
 * silent skipping) so the caller can surface the exact row/error to the
 * user before any writeBatch runs.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year as number, (month as number) - 1, day as number));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === (month as number) - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Parses one CSV line into fields, honoring double-quoted fields with "" as an escaped quote. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export class CsvParseError extends Error {}

export function parseCsvToDomainInputs(csvText: string): DomainInput[] {
  const lines = csvText.split(/\r\n|\r|\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0] as string);
  const domains: DomainInput[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const rowNumber = lineIndex + 1; // 1-based, header is row 1
    const values = parseCsvLine(lines[lineIndex] as string);
    const row: Record<string, string> = {};
    header.forEach((key, columnIndex) => {
      row[key] = values[columnIndex] ?? "";
    });

    const name = row.name;
    if (!name) {
      throw new CsvParseError(`CSVデータに'name'がありません。行: ${rowNumber}`);
    }

    let startDate: string | null = null;
    if (row.start_date) {
      if (!isValidDateString(row.start_date)) {
        throw new CsvParseError(
          `CSVデータの'start_date'が無効です。行: ${rowNumber}, 値: ${row.start_date}`,
        );
      }
      startDate = row.start_date;
    }

    let endDate: string | null = null;
    if (row.end_date) {
      if (!isValidDateString(row.end_date)) {
        throw new CsvParseError(
          `CSVデータの'end_date'が無効です。行: ${rowNumber}, 値: ${row.end_date}`,
        );
      }
      endDate = row.end_date;
    }

    let surveyItems: string[] = [];
    if (row.survey_items) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.survey_items);
      } catch {
        throw new CsvParseError(
          `CSVデータの'survey_items'が不正なJSON形式です。行: ${rowNumber}, 値: ${row.survey_items}`,
        );
      }
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
        throw new CsvParseError(
          `CSVデータの'survey_items'は文字列配列である必要があります。行: ${rowNumber}, 値: ${row.survey_items}`,
        );
      }
      surveyItems = parsed;
    }

    domains.push({
      name,
      description: row.description ?? "",
      url: row.url ?? "",
      startDate,
      endDate,
      surveyItems,
    });
  }

  return domains;
}
