import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  DuplicateEmailError,
  InvalidCredentialsError,
  InvalidInputError,
  logIn,
  signUp,
} from "@/lib/auth/lecturer-auth";

beforeEach(async () => {
  await prisma.lecturer.deleteMany();
});

describe("signUp", () => {
  it("creates a Lecturer and returns their id and email, never the password hash", async () => {
    const lecturer = await signUp({
      email: "ada@example.com",
      password: "correct-horse-battery-staple",
    });

    expect(lecturer.email).toBe("ada@example.com");
    expect(lecturer.id).toEqual(expect.any(String));
    expect(lecturer).not.toHaveProperty("passwordHash");
    expect(lecturer).not.toHaveProperty("password");
  });

  it("normalizes email case so duplicates are caught regardless of case", async () => {
    await signUp({ email: "Ada@Example.com", password: "correct-horse-battery-staple" });

    await expect(
      signUp({ email: "ada@example.com", password: "another-password-1" })
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("rejects an invalid email format", async () => {
    await expect(
      signUp({ email: "not-an-email", password: "correct-horse-battery-staple" })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects a password shorter than 8 characters", async () => {
    await expect(
      signUp({ email: "ada@example.com", password: "short" })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects a password longer than 72 bytes, since bcrypt would silently truncate it", async () => {
    await expect(
      signUp({ email: "ada@example.com", password: "a".repeat(73) })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("raises a human-readable message on invalid input, not a raw validation error object", async () => {
    await expect(signUp({ email: "not-an-email", password: "short" })).rejects.toThrow(
      /^(?!\[).+/
    );
  });

  it("rejects the loser of two concurrent sign-ups racing on the same email", async () => {
    const results = await Promise.allSettled([
      signUp({ email: "ada@example.com", password: "correct-horse-battery-staple" }),
      signUp({ email: "ada@example.com", password: "another-password-1" }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(DuplicateEmailError);
  });
});

describe("logIn", () => {
  it("succeeds with the correct email and password", async () => {
    await signUp({ email: "ada@example.com", password: "correct-horse-battery-staple" });

    const lecturer = await logIn({
      email: "ada@example.com",
      password: "correct-horse-battery-staple",
    });

    expect(lecturer.email).toBe("ada@example.com");
    expect(lecturer.id).toEqual(expect.any(String));
  });

  it("is case-insensitive on email", async () => {
    await signUp({ email: "ada@example.com", password: "correct-horse-battery-staple" });

    const lecturer = await logIn({
      email: "Ada@Example.com",
      password: "correct-horse-battery-staple",
    });

    expect(lecturer.email).toBe("ada@example.com");
  });

  it("rejects an incorrect password", async () => {
    await signUp({ email: "ada@example.com", password: "correct-horse-battery-staple" });

    await expect(
      logIn({ email: "ada@example.com", password: "wrong-password" })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects an email with no matching account", async () => {
    await expect(
      logIn({ email: "nobody@example.com", password: "correct-horse-battery-staple" })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
