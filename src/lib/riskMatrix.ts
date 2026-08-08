import { FEASIBILITY_LEVELS, type Feasibility, type RiskLevel, SEVERITY_LEVELS, type Severity } from '@/types';

/**
 * Exact port of the risk matrix from original/app/models/finding.py.
 *
 * risk_matrix[feasibility_index][severity_index]
 *   severity_levels    = ["重大","高","中","低","その他"]
 *   feasibility_levels = ["高","中","低","不可"]
 */
const RISK_MATRIX: readonly (readonly RiskLevel[])[] = [
  ['緊急', '緊急', '高', '中', 'その他'],
  ['緊急', '高', '中', '低', 'その他'],
  ['高', '中', '低', '低', 'その他'],
  ['中', '低', '低', '低', 'その他'],
];

/**
 * Computes the risk level from severity x feasibility, mirroring the
 * server-side validation in firestore.rules (isValidRiskLevel). Keep these
 * two implementations in sync if the matrix ever changes.
 */
export function computeRiskLevel(severity: Severity, feasibility: Feasibility): RiskLevel {
  const severityIndex = SEVERITY_LEVELS.indexOf(severity);
  const feasibilityIndex = FEASIBILITY_LEVELS.indexOf(feasibility);

  if (severityIndex === -1) {
    throw new Error(`Invalid severity level: ${severity}`);
  }
  if (feasibilityIndex === -1) {
    throw new Error(`Invalid feasibility level: ${feasibility}`);
  }

  const row = RISK_MATRIX[feasibilityIndex];
  if (!row) {
    throw new Error(`Invalid feasibility index: ${feasibilityIndex}`);
  }
  const riskLevel = row[severityIndex];
  if (!riskLevel) {
    throw new Error(`Invalid severity index: ${severityIndex}`);
  }
  return riskLevel;
}
