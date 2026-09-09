import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("web and mobile platform UX contracts", () => {
  it("keeps the web shell keyboard-navigable and exposes live status regions", () => {
    const web = source("apps/web/src/main.tsx");

    expect(web).toContain('<a className="skip-link" href="#main-content">');
    expect(web).toContain('<main id="main-content" className="shell">');
    expect(web).toContain('<nav aria-label="Primary">');
    expect(web).toContain('role="alert"');
    expect(web).toContain('role="status"');
  });

  it("requires explicit accessibility roles for every mobile Pressable control", () => {
    const mobileFiles = [
      "apps/mobile/app/day.tsx",
      "apps/mobile/app/index.tsx",
      "apps/mobile/app/medications.tsx",
      "apps/mobile/app/review.tsx",
      "apps/mobile/app/routines.tsx",
      "apps/mobile/app/schedule-adjust.tsx",
      "apps/mobile/app/schedule.tsx",
      "apps/mobile/app/settings.tsx",
      "apps/mobile/app/supplements.tsx",
      "apps/mobile/app/today.tsx",
    ];

    for (const relativePath of mobileFiles) {
      const mobile = source(relativePath);
      const pressables = mobile.match(/<Pressable\b/g) ?? [];
      const roles = mobile.match(/accessibilityRole=/g) ?? [];
      expect(roles.length, relativePath).toBe(pressables.length);
    }
  });

  it("labels every mobile text input and exposes the core V2 controls on both platforms", () => {
    const mobileFiles = [
      "apps/mobile/app/day.tsx",
      "apps/mobile/app/medications.tsx",
      "apps/mobile/app/routines.tsx",
      "apps/mobile/app/schedule-adjust.tsx",
      "apps/mobile/app/supplements.tsx",
      "apps/mobile/app/today.tsx",
    ];
    for (const relativePath of mobileFiles) {
      const mobile = source(relativePath);
      const textInputs = mobile.match(/<TextInput\b/g) ?? [];
      const labels = mobile.match(/accessibilityLabel=/g) ?? [];
      expect(labels.length, relativePath).toBeGreaterThanOrEqual(textInputs.length);
    }

    const web = source("apps/web/src/main.tsx");
    const today = source("apps/mobile/app/today.tsx");
    const review = source("apps/mobile/app/review.tsx");
    const medications = source("apps/mobile/app/medications.tsx");
    const routines = source("apps/mobile/app/routines.tsx");

    for (const platform of [web, today]) {
      expect(platform).toContain("Local reminder guidance");
      expect(platform).toContain("Enable reminder guidance");
      expect(platform).toContain("Turn off reminder guidance");
      expect(platform).toContain("Existing medication time");
      expect(platform).toContain("fixed");
      expect(platform).toContain("Routine templates");
    }
    expect(web).toMatch(
      /window\.confirm\(\s*"Use the grouping-oriented supplement times\? Medication anchors will remain fixed\."/s,
    );
    expect(review).toContain("Alert.alert(");
    expect(review).toContain('{ text: "Cancel", style: "cancel" }');
    expect(review).toContain('text: "Use times",');
    expect(review).toContain("Medication anchors remain fixed.");
    expect(web).toContain("unsupported coverage");
    expect(medications).toContain("Unsupported medication");
    for (const platform of [web, medications]) {
      expect(platform).toContain('? { kind: "unsupported"');
    }
    expect(web).toMatch(/never changes your supplements, doses, or\s+medication anchors/s);
    expect(routines).toContain("supplements, doses, and medication anchors stay unchanged");
  });
});
