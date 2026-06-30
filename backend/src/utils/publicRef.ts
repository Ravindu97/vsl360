import prisma from '../config/database';

/** A-Z and 2-9 — excludes ambiguous 0/O, 1/I/L */
const PUBLIC_REF_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generatePublicRefCandidate(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += PUBLIC_REF_CHARS[Math.floor(Math.random() * PUBLIC_REF_CHARS.length)];
  }
  return `VSL-${suffix}`;
}

export async function generateUniquePublicRef(maxAttempts = 12): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const publicRef = generatePublicRefCandidate();
    const existing = await prisma.customItineraryRequest.findUnique({
      where: { publicRef },
      select: { id: true },
    });
    if (!existing) return publicRef;
  }
  throw new Error('Failed to generate unique public reference');
}
