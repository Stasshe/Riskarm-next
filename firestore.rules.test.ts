import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

import { computeRiskLevel } from "@/lib/riskMatrix";
import type { Finding, FindingTemplate } from "@/types";

// The only allowlisted (and only admin) email in the current placeholder
// firestore.rules. Multiple distinct uids share this email to simulate
// several allowlisted users, since the rules distinguish roles by uid, not
// by email (email only gates the allowlist itself).
const ALLOWED_EMAIL = "egnm9stasshe@gmail.com";
const OUTSIDER_EMAIL = "not-allowed@example.com";

const ADMIN_UID = "admin-uid";
const ASSIGNEE_UID = "assignee-uid";
const REVIEWER_UID = "reviewer-uid";
const OTHER_UID = "other-uid";
const OUTSIDER_UID = "outsider-uid";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "riskarm-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed user profiles directly (bypassing rules) so role-based update rules
  // can be exercised without going through the self-provisioning create path.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", ADMIN_UID), {
      email: ALLOWED_EMAIL,
      displayName: "Admin",
      isAdmin: true,
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users", ASSIGNEE_UID), {
      email: ALLOWED_EMAIL,
      displayName: "Assignee",
      isAdmin: false,
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users", REVIEWER_UID), {
      email: ALLOWED_EMAIL,
      displayName: "Reviewer",
      isAdmin: false,
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users", OTHER_UID), {
      email: ALLOWED_EMAIL,
      displayName: "Other",
      isAdmin: false,
      createdAt: Timestamp.now(),
    });
  });
});

function ctx(uid: string, email = ALLOWED_EMAIL) {
  return testEnv.authenticatedContext(uid, { email }).firestore();
}

function unauthed() {
  return testEnv.unauthenticatedContext().firestore();
}

type FindingSeed = Omit<Finding, "id">;

function findingSeed(overrides: Partial<FindingSeed> = {}): FindingSeed {
  const severity = overrides.severity ?? "中";
  const feasibility = overrides.feasibility ?? "中";
  return {
    title: "Test finding",
    domainId: null,
    domainName: "",
    domainDeleted: false,
    assignedUserId: ASSIGNEE_UID,
    assignedUserName: "Assignee",
    reviewerUserId: REVIEWER_UID,
    reviewerUserName: "Reviewer",
    status: "NOT_STARTED",
    notFound: false,
    severity,
    feasibility,
    severityReason: "",
    feasibilityReason: "",
    locations: [],
    description: "",
    reproductionSteps: [],
    solutions: "",
    otherRemarks: "",
    references: [],
    riskLevel: computeRiskLevel(severity, feasibility),
    images: [],
    deleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

async function seedFinding(id: string, overrides: Partial<FindingSeed> = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "findings", id), findingSeed(overrides));
  });
}

describe("allowlist enforcement", () => {
  it("rejects a non-allowlisted authenticated user from reading domains", async () => {
    await assertFails(getDoc(doc(unauthed(), "domains", "d1")));
    const outsider = ctx(OUTSIDER_UID, OUTSIDER_EMAIL);
    await assertFails(getDoc(doc(outsider, "domains", "d1")));
  });

  it("allows an allowlisted user to read domains", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "domains", "d1"), { name: "example.com" });
    });
    await assertSucceeds(getDoc(doc(ctx(OTHER_UID), "domains", "d1")));
  });
});

describe("users/{uid} self-provisioning", () => {
  it("allows a user to self-provision with isAdmin matching the hardcoded admin list", async () => {
    const db = ctx("new-admin-uid");
    await assertSucceeds(
      setDoc(doc(db, "users", "new-admin-uid"), {
        email: ALLOWED_EMAIL,
        displayName: "New Admin",
        isAdmin: true, // ALLOWED_EMAIL is in adminEmails()
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("rejects self-provisioning with isAdmin not matching the hardcoded admin list", async () => {
    const db = ctx("new-user-uid");
    await assertFails(
      setDoc(doc(db, "users", "new-user-uid"), {
        email: ALLOWED_EMAIL,
        displayName: "New User",
        isAdmin: false, // self-demotion attempt: ALLOWED_EMAIL IS an admin email
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("rejects creating a profile for a different uid than the caller", async () => {
    const db = ctx("impersonator-uid");
    await assertFails(
      setDoc(doc(db, "users", "someone-else-uid"), {
        email: ALLOWED_EMAIL,
        displayName: "Impersonated",
        isAdmin: true,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("rejects self-provisioning for a non-allowlisted email", async () => {
    const db = ctx(OUTSIDER_UID, OUTSIDER_EMAIL);
    await assertFails(
      setDoc(doc(db, "users", OUTSIDER_UID), {
        email: OUTSIDER_EMAIL,
        displayName: "Outsider",
        isAdmin: false,
        createdAt: serverTimestamp(),
      }),
    );
  });
});

describe("users/{uid} updates", () => {
  it("allows a user to update their own displayName", async () => {
    await assertSucceeds(
      updateDoc(doc(ctx(ASSIGNEE_UID), "users", ASSIGNEE_UID), { displayName: "Renamed" }),
    );
  });

  it("rejects a user changing fields other than displayName on their own profile", async () => {
    await assertFails(updateDoc(doc(ctx(ASSIGNEE_UID), "users", ASSIGNEE_UID), { isAdmin: true }));
  });

  it("allows admin to update any field on any profile", async () => {
    await assertSucceeds(updateDoc(doc(ctx(ADMIN_UID), "users", ASSIGNEE_UID), { isAdmin: true }));
  });

  it("rejects a non-admin deleting a user profile; allows admin", async () => {
    await assertFails(deleteDoc(doc(ctx(ASSIGNEE_UID), "users", OTHER_UID)));
    await assertSucceeds(deleteDoc(doc(ctx(ADMIN_UID), "users", OTHER_UID)));
  });
});

describe("settings/app", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "app"), {
        reportTitle: "Report",
        notFoundPrefix: "[Not Found]",
        updatedAt: Timestamp.now(),
      });
    });
  });

  it("allows any allowlisted user to read settings", async () => {
    await assertSucceeds(getDoc(doc(ctx(OTHER_UID), "settings", "app")));
  });

  it("rejects a non-admin writing settings; allows admin", async () => {
    await assertFails(updateDoc(doc(ctx(OTHER_UID), "settings", "app"), { reportTitle: "Hacked" }));
    await assertSucceeds(
      updateDoc(doc(ctx(ADMIN_UID), "settings", "app"), { reportTitle: "Updated" }),
    );
  });
});

describe("domains", () => {
  it("allows any allowlisted user to create a domain", async () => {
    await assertSucceeds(
      setDoc(doc(ctx(OTHER_UID), "domains", "d1"), {
        name: "example.com",
        description: "",
        url: "",
        startDate: null,
        endDate: null,
        surveyItems: [],
        deleted: false,
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        findingsCount: 0,
      }),
    );
  });

  it("allows a non-admin to edit ordinary fields but not deleted/deletedAt", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "domains", "d1"), {
        name: "example.com",
        description: "",
        deleted: false,
        deletedAt: null,
      });
    });
    await assertSucceeds(
      updateDoc(doc(ctx(OTHER_UID), "domains", "d1"), { description: "updated" }),
    );
    await assertFails(updateDoc(doc(ctx(OTHER_UID), "domains", "d1"), { deleted: true }));
  });

  it("allows admin to soft-delete and restore a domain", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "domains", "d1"), {
        name: "example.com",
        deleted: false,
        deletedAt: null,
      });
    });
    await assertSucceeds(
      updateDoc(doc(ctx(ADMIN_UID), "domains", "d1"), {
        deleted: true,
        deletedAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(ctx(ADMIN_UID), "domains", "d1"), { deleted: false, deletedAt: null }),
    );
  });

  it("never allows hard delete, even for admin", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "domains", "d1"), { name: "example.com" });
    });
    await assertFails(deleteDoc(doc(ctx(ADMIN_UID), "domains", "d1")));
  });
});

describe("findingTemplates", () => {
  type TemplateSeed = Omit<FindingTemplate, "id">;
  const templateSeed: TemplateSeed = {
    title: "Template",
    notFound: false,
    severity: "中",
    feasibility: "中",
    severityReason: "",
    feasibilityReason: "",
    locations: [],
    description: "",
    reproductionSteps: [],
    solutions: "",
    otherRemarks: "",
    references: [],
    riskLevel: computeRiskLevel("中", "中"),
    images: [],
    createdAt: null,
    updatedAt: null,
  };

  it("allows any allowlisted user to create and update a template", async () => {
    await assertSucceeds(setDoc(doc(ctx(OTHER_UID), "findingTemplates", "t1"), templateSeed));
    await assertSucceeds(
      updateDoc(doc(ctx(OTHER_UID), "findingTemplates", "t1"), { title: "Renamed" }),
    );
  });

  it("rejects a non-admin deleting a template; allows admin", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "findingTemplates", "t1"), templateSeed);
    });
    await assertFails(deleteDoc(doc(ctx(OTHER_UID), "findingTemplates", "t1")));
    await assertSucceeds(deleteDoc(doc(ctx(ADMIN_UID), "findingTemplates", "t1")));
  });
});

describe("findings create", () => {
  it("allows the creator to create a finding assigned to themself with a consistent riskLevel", async () => {
    const severity = "重大";
    const feasibility = "高";
    await assertSucceeds(
      setDoc(
        doc(ctx(ASSIGNEE_UID), "findings", "f1"),
        findingSeed({
          assignedUserId: ASSIGNEE_UID,
          reviewerUserId: null,
          status: "NOT_STARTED",
          severity,
          feasibility,
          riskLevel: computeRiskLevel(severity, feasibility),
        }),
      ),
    );
  });

  it("rejects creating a finding assigned to someone else", async () => {
    await assertFails(
      setDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), findingSeed({ assignedUserId: OTHER_UID })),
    );
  });

  it("rejects creating a finding with a status other than NOT_STARTED", async () => {
    await assertFails(
      setDoc(
        doc(ctx(ASSIGNEE_UID), "findings", "f1"),
        findingSeed({ assignedUserId: ASSIGNEE_UID, status: "WIP" }),
      ),
    );
  });

  it("rejects creating a finding with a riskLevel inconsistent with the severity/feasibility matrix", async () => {
    await assertFails(
      setDoc(
        doc(ctx(ASSIGNEE_UID), "findings", "f1"),
        findingSeed({
          assignedUserId: ASSIGNEE_UID,
          severity: "重大",
          feasibility: "高",
          riskLevel: "低",
        }),
      ),
    );
  });
});

describe("findings status transitions", () => {
  beforeEach(async () => {
    await seedFinding("f1", {
      status: "NOT_STARTED",
      assignedUserId: ASSIGNEE_UID,
      reviewerUserId: REVIEWER_UID,
    });
  });

  it("NOT_STARTED -> WIP: assignee succeeds, others rejected", async () => {
    await assertFails(
      updateDoc(doc(ctx(REVIEWER_UID), "findings", "f1"), {
        status: "WIP",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(ctx(OTHER_UID), "findings", "f1"), {
        status: "WIP",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        status: "WIP",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("WIP -> COMPLETED: assignee succeeds, reviewer rejected", async () => {
    await seedFinding("f1", { status: "WIP" });
    await assertFails(
      updateDoc(doc(ctx(REVIEWER_UID), "findings", "f1"), {
        status: "COMPLETED",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        status: "COMPLETED",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("COMPLETED -> REVIEWED: reviewer succeeds, assignee rejected", async () => {
    await seedFinding("f1", { status: "COMPLETED" });
    await assertFails(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        status: "REVIEWED",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(ctx(REVIEWER_UID), "findings", "f1"), {
        status: "REVIEWED",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("REVIEWED -> COMPLETED: assignee or reviewer succeeds, third party rejected", async () => {
    await seedFinding("f1", { status: "REVIEWED" });
    await assertFails(
      updateDoc(doc(ctx(OTHER_UID), "findings", "f1"), {
        status: "COMPLETED",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        status: "COMPLETED",
        updatedAt: serverTimestamp(),
      }),
    );
    await seedFinding("f1", { status: "REVIEWED" });
    await assertSucceeds(
      updateDoc(doc(ctx(REVIEWER_UID), "findings", "f1"), {
        status: "COMPLETED",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("COMPLETED -> WIP: assignee succeeds, reviewer rejected", async () => {
    await seedFinding("f1", { status: "COMPLETED" });
    await assertFails(
      updateDoc(doc(ctx(REVIEWER_UID), "findings", "f1"), {
        status: "WIP",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        status: "WIP",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("WIP -> NOT_STARTED: assignee succeeds, reviewer rejected", async () => {
    await seedFinding("f1", { status: "WIP" });
    await assertFails(
      updateDoc(doc(ctx(REVIEWER_UID), "findings", "f1"), {
        status: "NOT_STARTED",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        status: "NOT_STARTED",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("admin can perform any transition regardless of role", async () => {
    await assertSucceeds(
      updateDoc(doc(ctx(ADMIN_UID), "findings", "f1"), {
        status: "WIP",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("rejects changing keys other than status/updatedAt during a transition", async () => {
    await assertFails(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        status: "WIP",
        title: "sneaky change",
      }),
    );
  });
});

describe("findings content edit", () => {
  beforeEach(async () => {
    await seedFinding("f1", {
      severity: "中",
      feasibility: "中",
      riskLevel: computeRiskLevel("中", "中"),
    });
  });

  it("allows the assignee to edit content fields with a consistent riskLevel", async () => {
    await assertSucceeds(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        title: "Updated title",
        description: "Updated description",
      }),
    );
  });

  it("rejects a non-assignee (including the reviewer) editing content", async () => {
    await assertFails(
      updateDoc(doc(ctx(REVIEWER_UID), "findings", "f1"), { description: "Hacked" }),
    );
    await assertFails(updateDoc(doc(ctx(OTHER_UID), "findings", "f1"), { description: "Hacked" }));
  });

  it("rejects tampering with riskLevel to be inconsistent with severity/feasibility", async () => {
    await assertFails(updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), { riskLevel: "緊急" }));
  });

  it("rejects the assignee changing role/lifecycle fields via a content edit", async () => {
    await assertFails(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), { status: "WIP", description: "x" }),
    );
    await assertFails(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), { assignedUserId: OTHER_UID }),
    );
  });
});

describe("findings reviewer assignment", () => {
  beforeEach(async () => {
    await seedFinding("f1", { assignedUserId: ASSIGNEE_UID, reviewerUserId: null });
  });

  it("allows the assignee to set a reviewer other than themself", async () => {
    await assertSucceeds(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        reviewerUserId: REVIEWER_UID,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("rejects the assignee appointing themself as reviewer", async () => {
    await assertFails(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        reviewerUserId: ASSIGNEE_UID,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("rejects a non-assignee setting the reviewer", async () => {
    await assertFails(
      updateDoc(doc(ctx(OTHER_UID), "findings", "f1"), {
        reviewerUserId: OTHER_UID,
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe("findings assignment (reassignment) is admin-only", () => {
  beforeEach(async () => {
    await seedFinding("f1", { assignedUserId: ASSIGNEE_UID });
  });

  it("rejects a non-admin reassigning the finding", async () => {
    await assertFails(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), { assignedUserId: OTHER_UID }),
    );
  });

  it("allows an admin to reassign the finding", async () => {
    await assertSucceeds(
      updateDoc(doc(ctx(ADMIN_UID), "findings", "f1"), { assignedUserId: OTHER_UID }),
    );
  });
});

describe("findings delete", () => {
  beforeEach(async () => {
    await seedFinding("f1", {});
  });

  it("never allows hard delete, even for admin", async () => {
    await assertFails(deleteDoc(doc(ctx(ADMIN_UID), "findings", "f1")));
  });

  it("allows admin to soft-delete via update; rejects non-admin", async () => {
    await assertFails(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), {
        deleted: true,
        deletedAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(ctx(ADMIN_UID), "findings", "f1"), {
        deleted: true,
        deletedAt: Timestamp.now(),
      }),
    );
  });
});

describe("findings document size guard", () => {
  it("rejects an update that pushes the document over the size budget", async () => {
    await seedFinding("f1", {});
    const oversized = "x".repeat(950_000);
    await assertFails(
      updateDoc(doc(ctx(ASSIGNEE_UID), "findings", "f1"), { otherRemarks: oversized }),
    );
  });
});
