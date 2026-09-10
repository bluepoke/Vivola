export type Credentials = { email: string; password: string };

export async function parseCredentials(request: Request): Promise<Credentials | null> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return null;
  }
  return { email: body.email, password: body.password };
}
