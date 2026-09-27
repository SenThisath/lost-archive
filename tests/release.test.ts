import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_UNLOCK_AT,
  isReleased,
  previewAllowed,
  releaseTime,
} from "../lib/release.ts";
test("Sri Lanka midnight resolves to September 30 at 18:30 UTC", () => {
  assert.equal(
    new Date(releaseTime(DEFAULT_UNLOCK_AT)).toISOString(),
    "2026-09-30T18:30:00.000Z",
  );
});
test("archive opens exactly at release, not a millisecond before", () => {
  const at = releaseTime(DEFAULT_UNLOCK_AT);
  assert.equal(isReleased(at - 1), false);
  assert.equal(isReleased(at), true);
});
test("malformed release configuration fails closed", () => {
  assert.equal(isReleased(Date.now(), "not-a-date"), false);
});
test("preview cannot bypass production", () => {
  assert.equal(previewAllowed("production", "true"), false);
  assert.equal(previewAllowed("development", "true"), true);
  assert.equal(previewAllowed("development", "false"), false);
});
