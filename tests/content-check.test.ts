import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkContent } from "@/lib/content-check";

type Files = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function copy(over: (files: Files) => void): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "maalim-cc-"));
  const files: Files = {};
  for (const f of ["curriculum", "passages", "items", "units", "videos"]) files[f] = JSON.parse(fs.readFileSync(path.join("content", `${f}.json`), "utf8"));
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
