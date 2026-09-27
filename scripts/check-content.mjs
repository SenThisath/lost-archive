import { readFile, access } from "node:fs/promises";
import path from "node:path";
const story = JSON.parse(
  await readFile(new URL("../content/story.json", import.meta.url), "utf8"),
);
const warnings = [];
if (story.name === "Love") warnings.push("Set her name in content/story.json.");
if (!story.relationshipDate)
  warnings.push(
    "Set the relationship date, display text, and three matching date clue pieces.",
  );
for (const p of [...story.childhood, ...story.sharedPhotos]) {
  if (!p.src) warnings.push(`Add photograph: ${p.label}`);
}
for (const field of ["voiceMessage", "ambientTrack", "birthdayTrack"])
  if (!story[field])
    warnings.push(
      `${field} is empty. ${field === "voiceMessage" ? "The written transcript is used." : "The original synthesized score is used."}`,
    );
for (const asset of [
  ...story.childhood.map((p) => p.src),
  ...story.sharedPhotos.map((p) => p.src),
  story.voiceMessage,
  story.ambientTrack,
  story.birthdayTrack,
].filter(Boolean)) {
  if (!asset.startsWith("/api/media/"))
    warnings.push(
      `Use a protected /api/media/ path, not a public URL: ${asset}`,
    );
  else
    try {
      await access(
        path.join(process.cwd(), "private-media", asset.split("/").pop()),
      );
    } catch {
      warnings.push(`File is missing: ${asset}`);
    }
}
if (story.childhood.length !== 4)
  warnings.push(
    "The chronological puzzle requires exactly four childhood photos in chronological order.",
  );
if (
  story.dateClues.length !== 3 ||
  story.dayObjects.length !== 4 ||
  story.qualities.length !== 5
)
  warnings.push("Keep exactly 3 date clues, 4 day objects, and 5 qualities.");
if (story.sharedPhotos.length < 1)
  warnings.push("At least one shared-day photo is required.");
console.log(
  warnings.length
    ? "Personalization checklist:\n" + warnings.map((x) => " • " + x).join("\n")
    : "Personalization checks passed.",
);
console.log("\nAlways read the final letter and every clue before sharing.");
if (process.argv.includes("--strict") && warnings.length) process.exitCode = 1;
