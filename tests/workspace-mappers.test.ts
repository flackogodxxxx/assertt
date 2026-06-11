import { describe, expect, it } from "vitest";
import { mapWorkspaceRows } from "../src/features/demands/repository";

describe("demand workspace repository mapping", () => {
  it("orders pieces, submission versions, comments, and activity", () => {
    const workspace = mapWorkspaceRows({
      activities: [
        { created_at: "2026-06-11T10:00:00Z", id: "a1" },
        { created_at: "2026-06-11T12:00:00Z", id: "a2" }
      ],
      comments: [
        { created_at: "2026-06-11T09:00:00Z", id: "c1", status: "open" }
      ],
      items: [
        { id: "p2", position: 2 },
        { id: "p1", position: 1 }
      ],
      submissionItems: [
        { id: "si2", submission_id: "s2" },
        { id: "si1", submission_id: "s1" }
      ],
      submissions: [
        { created_at: "2026-06-11T11:00:00Z", id: "s2", version: 2 },
        { created_at: "2026-06-11T08:00:00Z", id: "s1", version: 1 }
      ],
      task: { id: "dem-1", status: "review" }
    });

    expect(workspace.items.map((item) => item.id)).toEqual(["p1", "p2"]);
    expect(workspace.submissions.map((submission) => submission.version)).toEqual([2, 1]);
    expect(workspace.submissions[0].items.map((item) => item.id)).toEqual(["si2"]);
    expect(workspace.activities.map((activity) => activity.id)).toEqual(["a2", "a1"]);
  });
});
