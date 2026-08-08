import type { Timestamp } from 'firebase/firestore';

export const SEVERITY_LEVELS = ['重大', '高', '中', '低', 'その他'] as const;
export const FEASIBILITY_LEVELS = ['高', '中', '低', '不可'] as const;
export const RISK_LEVELS = ['緊急', '高', '中', '低', 'その他'] as const;
export const FINDING_STATUSES = ['NOT_STARTED', 'WIP', 'COMPLETED', 'REVIEWED'] as const;

export type Severity = (typeof SEVERITY_LEVELS)[number];
export type Feasibility = (typeof FEASIBILITY_LEVELS)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export interface FindingLocation {
  method: string;
  url: string;
  parameter: string;
}

export interface FindingImage {
  id: string;
  dataUrl: string;
  filename: string;
  sizeBytes: number;
}

export interface Finding {
  id: string;
  title: string;
  domainId: string | null;
  domainName: string;
  domainDeleted: boolean;
  assignedUserId: string | null;
  assignedUserName: string;
  reviewerUserId: string | null;
  reviewerUserName: string;
  status: FindingStatus;
  notFound: boolean;
  severity: Severity;
  feasibility: Feasibility;
  severityReason: string;
  feasibilityReason: string;
  locations: FindingLocation[];
  description: string;
  reproductionSteps: string[];
  solutions: string;
  otherRemarks: string;
  references: string[];
  riskLevel: RiskLevel;
  images: FindingImage[];
  deleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type FindingContentInput = Pick<
  Finding,
  | 'title'
  | 'notFound'
  | 'severity'
  | 'feasibility'
  | 'severityReason'
  | 'feasibilityReason'
  | 'locations'
  | 'description'
  | 'reproductionSteps'
  | 'solutions'
  | 'otherRemarks'
  | 'references'
  | 'images'
>;
