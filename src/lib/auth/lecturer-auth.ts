import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/client";

const BCRYPT_ROUNDS = 12;
// bcrypt silently truncates at 72 bytes, so anything longer must be rejected
// up front rather than accepted and quietly weakened.
const MAX_PASSWORD_BYTES = 72;

export class InvalidInputError extends Error {}
export class DuplicateEmailError extends Error {}
export class InvalidCredentialsError extends Error {}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((password) => Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES, {
      message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes`,
    }),
});

export type Lecturer = {
  id: string;
  email: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

export async function signUp(input: { email: string; password: string }): Promise<Lecturer> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidInputError(formatValidationError(parsed.error));
  }

  const email = normalizeEmail(parsed.data.email);

  const existing = await prisma.lecturer.findUnique({ where: { email } });
  if (existing) {
    throw new DuplicateEmailError(`An account with email ${email} already exists`);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);

  try {
    const lecturer = await prisma.lecturer.create({
      data: { email, passwordHash },
    });
    return { id: lecturer.id, email: lecturer.email };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Two concurrent signups raced past the findUnique check above.
      throw new DuplicateEmailError(`An account with email ${email} already exists`);
    }
    throw error;
  }
}

export async function findLecturerById(id: string): Promise<Lecturer | null> {
  const lecturer = await prisma.lecturer.findUnique({ where: { id } });
  if (!lecturer) {
    return null;
  }
  return { id: lecturer.id, email: lecturer.email };
}

export async function logIn(input: { email: string; password: string }): Promise<Lecturer> {
  const email = normalizeEmail(input.email);

  const lecturer = await prisma.lecturer.findUnique({ where: { email } });
  if (!lecturer) {
    throw new InvalidCredentialsError("Incorrect email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, lecturer.passwordHash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError("Incorrect email or password");
  }

  return { id: lecturer.id, email: lecturer.email };
}
