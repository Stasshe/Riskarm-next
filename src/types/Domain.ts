import type { Timestamp } from "firebase/firestore";

export interface Domain {
  id: string;
  name: string;
  description: string;
  url: string;
  startDate: string | null;
  endDate: string | null;
  surveyItems: string[];
  deleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  findingsCount: number;
}

export type DomainInput = Omit<
  Domain,
  "id" | "createdAt" | "updatedAt" | "deleted" | "deletedAt" | "findingsCount"
>;
