import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { email, nigerianPhone, password, prose, socialHandle } from "@/lib/validation/shared";
import {
  discoveryQuerySchema,
  mimeMatchesSniff,
  reviewDecisionSchema,
  signUpSchema,
  sniffMimeType,
  validateFile,
} from "@/lib/validation/schemas";

describe("field validation", () => {
  test("accepts the Nigerian phone formats people actually type", () => {
    for (const input of [
      "08031234567",
      "0803 123 4567",
      "+2348031234567",
      "234 803 123 4567",
      "0701-234-5678",
      "(0803) 123 4567",
    ]) {
      const result = nigerianPhone.safeParse(input);
      assert.equal(result.success, true, `rejected a valid number: ${input}`);
    }
  });

  test("rejects numbers that are not Nigerian mobiles", () => {
    for (const input of ["12345", "+447700900000", "0123456789", "080312345678901", "abcdefghijk"]) {
      assert.equal(nigerianPhone.safeParse(input).success, false, `accepted: ${input}`);
    }
  });

  test("normalises email case and whitespace", () => {
    const result = email.safeParse("  Tola.Adeyemi@Example.COM ");
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data, "tola.adeyemi@example.com");
  });

  test("passwords need length and a number or symbol", () => {
    assert.equal(password.safeParse("short1").success, false, "accepted a short password");
    assert.equal(password.safeParse("allletterspls").success, false, "accepted letters only");
    assert.equal(password.safeParse("goodenough1").success, true);
    assert.equal(password.safeParse("good-enough-pw").success, true);
  });

  test("social handles are stored without the @ or a full URL", () => {
    for (const [input, expected] of [
      ["@iyatola", "iyatola"],
      ["iyatola", "iyatola"],
      ["https://instagram.com/iyatola", "iyatola"],
      ["https://www.instagram.com/iyatola/", "iyatola"],
    ] as const) {
      const result = socialHandle.safeParse(input);
      assert.equal(result.success, true, `rejected ${input}`);
      if (result.success) assert.equal(result.data, expected);
    }
  });

  test("prose fields enforce a minimum word count, not just a length", () => {
    const story = prose(60, 3000, "Your story");
    const padded = "a".repeat(400);
    assert.equal(story.safeParse(padded).success, false, "a single long word passed as a story");
    assert.equal(story.safeParse(Array(60).fill("word").join(" ")).success, true);
  });
});

describe("sign up", () => {
  test("a self-service signup cannot claim a staff role", () => {
    const result = signUpSchema.safeParse({
      fullName: "Tola Adeyemi",
      email: "tola@example.com",
      password: "goodenough1",
      role: "super_admin",
      acceptedTerms: true,
    });
    assert.equal(result.success, false, "signup accepted a staff role");
  });

  test("terms have to be accepted", () => {
    const base = {
      fullName: "Tola Adeyemi",
      email: "tola@example.com",
      password: "goodenough1",
      role: "alajo" as const,
    };
    assert.equal(signUpSchema.safeParse({ ...base, acceptedTerms: false }).success, false);
    assert.equal(signUpSchema.safeParse({ ...base, acceptedTerms: true }).success, true);
  });

  test("a single-word name is rejected", () => {
    const result = signUpSchema.safeParse({
      fullName: "Tola",
      email: "tola@example.com",
      password: "goodenough1",
      role: "alajo",
      acceptedTerms: true,
    });
    assert.equal(result.success, false);
  });
});

describe("review decisions", () => {
  test("a rejection must carry an internal reason", () => {
    assert.equal(
      reviewDecisionSchema.safeParse({ decision: "reject", applicantMessage: "Sorry" }).success,
      false,
      "allowed a rejection with no recorded reason",
    );
    assert.equal(
      reviewDecisionSchema.safeParse({
        decision: "reject",
        internalReason: "Could not verify the identity document.",
      }).success,
      true,
    );
  });

  test("requesting information needs at least one specific item", () => {
    assert.equal(reviewDecisionSchema.safeParse({ decision: "request_info", items: [] }).success, false);
    assert.equal(
      reviewDecisionSchema.safeParse({
        decision: "request_info",
        items: [{ fieldKey: "identity_document", message: "The photo is too blurry to read." }],
      }).success,
      true,
    );
  });

  test("an approval needs nothing beyond the decision", () => {
    const result = reviewDecisionSchema.safeParse({ decision: "approve" });
    assert.equal(result.success, true);
    if (result.success && result.data.decision === "approve") {
      assert.equal(result.data.feature, false, "featuring should be opt-in");
    }
  });
});

describe("file validation", () => {
  test("a document cannot be an executable renamed to look like a PDF", () => {
    const result = validateFile("document", "application/x-msdownload", 1000);
    assert.equal(result.ok, false);
  });

  test("size limits are enforced per kind", () => {
    assert.equal(validateFile("business_photo", "image/jpeg", 9 * 1024 * 1024).ok, false);
    assert.equal(validateFile("business_photo", "image/jpeg", 2 * 1024 * 1024).ok, true);
    assert.equal(validateFile("video", "video/mp4", 20 * 1024 * 1024).ok, true);
    assert.equal(validateFile("video", "video/mp4", 30 * 1024 * 1024).ok, false);
  });

  test("empty files are rejected", () => {
    assert.equal(validateFile("profile_photo", "image/png", 0).ok, false);
  });

  test("magic bytes identify real files", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0]);

    assert.equal(sniffMimeType(png), "image/png");
    assert.equal(sniffMimeType(jpeg), "image/jpeg");
    assert.equal(sniffMimeType(pdf), "application/pdf");
  });

  test("a declared type that contradicts the bytes is caught", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    assert.equal(mimeMatchesSniff("image/png", sniffMimeType(png)), true);
    assert.equal(mimeMatchesSniff("application/pdf", sniffMimeType(png)), false);
  });

  test("unrecognised bytes never pass as a match", () => {
    const junk = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    assert.equal(sniffMimeType(junk), null);
    assert.equal(mimeMatchesSniff("image/png", null), false);
  });
});

describe("discovery query", () => {
  test("defaults are applied when nothing is passed", () => {
    const result = discoveryQuerySchema.parse({});
    assert.equal(result.page, 1);
    assert.equal(result.sort, "featured");
  });

  test("a nonsense page number does not reach the database", () => {
    assert.equal(discoveryQuerySchema.safeParse({ page: "-4" }).success, false);
    assert.equal(discoveryQuerySchema.safeParse({ page: "99999" }).success, false);
    assert.equal(discoveryQuerySchema.safeParse({ page: "3" }).success, true);
  });

  test("an unknown category is rejected rather than silently ignored", () => {
    assert.equal(discoveryQuerySchema.safeParse({ category: "crypto" }).success, false);
    assert.equal(discoveryQuerySchema.safeParse({ category: "agriculture" }).success, true);
  });
});
