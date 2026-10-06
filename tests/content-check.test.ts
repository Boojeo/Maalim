import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkContent } from "@/lib/content-check";

type Files = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function copy(over: (files: Files) => void): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-cc-"));
  const files: Files = {};
  for (const f of ["curriculum", "passages", "items", "units", "videos", "referrals"]) files[f] = JSON.parse(fs.readFileSync(path.join("content", `${f}.json`), "utf8"));
  over(files);
  for (const [k, v] of Object.entries(files)) fs.writeFileSync(path.join(dir, `${k}.json`), JSON.stringify(v));
  return dir;
}

describe("content integrity gate (runs before production builds)", () => {
  it("passes on the repo's placeholder content", () => expect(checkContent()).toEqual([]));
  it("fails when a passage is marked verified without a reviewer or with placeholder text", () => {
    const dir = copy((f) => { f.passages.passages[0].verified = true; });
    const p = checkContent(dir).join("\n");
    expect(p).toContain("verified_by");
    expect(p).toContain("placeholder");
    expect(p).toContain("real source_id");
  });
  it("fails when an approved item has a placeholder or an unverified source", () => {
    const dir = copy((f) => { f.items.items[0].status = "approved"; });
    expect(checkContent(dir).join("\n")).toContain("approved but");
  });
  it("fails when a video is granted without a creator credit", () => {
    const dir = copy((f) => { f.videos.videos[0].permission = "granted"; });
    expect(checkContent(dir).join("\n")).toContain("creator credit");
  });
  it("detects prerequisite cycles and unknown prerequisites", () => {
    const dir = copy((f) => { f.curriculum.concepts[0].prerequisites = ["salah"]; f.curriculum.concepts[1].prerequisites = ["nope"]; });
    const p = checkContent(dir).join("\n");
    expect(p).toContain("cycle");
    expect(p).toContain("unknown prerequisite");
  });
});

describe("drafted wording stays hidden until a reviewer verifies it", () => {
  it("referral wording is blank for learners while unverified, released after verification", async () => {
    const { releaseReferralTexts } = await import("@/lib/content-gate");
    const file = JSON.parse(fs.readFileSync("content/referrals.json", "utf8"));
    expect(file.verified).toBe(false);
    expect(releaseReferralTexts(file, false).L3.en).toBe("");
    expect(releaseReferralTexts({ ...file, verified: true, reviewed_by: "Reviewer" }, false).L3.en).toContain("mentor");
    expect(releaseReferralTexts({ ...file, verified: true, reviewed_by: null }, false).L3.en).toBe(""); // needs a named reviewer
  });
  it("unit hooks are drafted but unverified, so the unit page still shows 'waiting for review'", () => {
    const units = JSON.parse(fs.readFileSync("content/units.json", "utf8")).units;
    expect(units).toHaveLength(6);
    for (const u of units) {
      expect(u.hook_en).not.toContain("[CONTENT NEEDED");
      expect(u.verified).toBe(false);
      expect(u.misconception_en).toContain("[CONTENT NEEDED"); // human-supplied
    }
  });
  it("a verified unit needs a reviewer name; a verified referral file needs one too", () => {
    const dir = copy((f) => { f.units.units[0].verified = true; });
    expect(checkContent(dir).join("\n")).toContain("needs reviewed_by");
  });
});
