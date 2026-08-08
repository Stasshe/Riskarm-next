import type { Timestamp } from 'firebase/firestore';
import type { Feasibility, FindingImage, FindingLocation, RiskLevel, Severity } from './Finding';

export interface FindingTemplate {
  id: string;
  title: string;
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
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type FindingTemplateInput = Omit<FindingTemplate, 'id' | 'createdAt' | 'updatedAt' | 'riskLevel'>;
