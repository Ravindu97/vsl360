import prisma from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

let lastNominatimAt = 0;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const wait = 1100 - (now - lastNominatimAt);
  if (wait > 0) {
    await sleep(wait);
  }
  lastNominatimAt = Date.now();
}

type NominatimHit = { lat: string; lon: string };

export async function geocodeDestinationName(name: string): Promise<{ lat: number; lon: number } | null> {
  const q = `${name} Sri Lanka`;
  const url = new URL('/search', NOMINATIM_BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  if (env.NOMINATIM_EMAIL) {
    url.searchParams.set('email', env.NOMINATIM_EMAIL);
  }

  await throttleNominatim();

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), env.DISTANCE_PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'User-Agent': env.NOMINATIM_USER_AGENT },
      signal: ac.signal,
    });
    if (!res.ok) {
      logger.warn(`Nominatim HTTP ${res.status} for "${name}"`);
      return null;
    }
    const data = (await res.json()) as NominatimHit[];
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    return { lat, lon: lon };
  } catch (e) {
    logger.warn(`Nominatim request failed for "${name}"`, e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Geocode a destination row and persist when missing coordinates.
 */
export async function ensureDestinationCoordinates(
  id: string,
  name: string
): Promise<{ lat: number; lon: number } | null> {
  const [row] = await prisma.$queryRaw<
    Array<{ id: string; name: string; latitude: number | null; longitude: number | null }>
  >`
    SELECT id, name, latitude, longitude
    FROM destinations
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!row) {
    return null;
  }
  if (row.latitude != null && row.longitude != null) {
    return { lat: row.latitude, lon: row.longitude };
  }

  const found = await geocodeDestinationName(row.name || name);
  if (!found) {
    return null;
  }

  const geocodedAt = new Date();
  await prisma.$executeRaw`
    UPDATE destinations
    SET
      latitude = ${found.lat},
      longitude = ${found.lon},
      geocoded_at = ${geocodedAt}
    WHERE id = ${id}
  `;

  return { lat: found.lat, lon: found.lon };
}

export type GeocodeBackfillResult = {
  updated: number;
  skipped: number;
  failed: string[];
};

/**
 * Geocode every destination with NULL coordinates (≤1 Nominatim request/sec in-process).
 */
export async function backfillMissingCoordinates(): Promise<GeocodeBackfillResult> {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; name: string }>
  >`
    SELECT id, name
    FROM destinations
    WHERE latitude IS NULL OR longitude IS NULL
    ORDER BY sort_order ASC
  `;

  const failed: string[] = [];
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const found = await geocodeDestinationName(row.name);
    if (!found) {
      failed.push(row.id);
      skipped += 1;
      continue;
    }
    const geocodedAt = new Date();
    await prisma.$executeRaw`
      UPDATE destinations
      SET
        latitude = ${found.lat},
        longitude = ${found.lon},
        geocoded_at = ${geocodedAt}
      WHERE id = ${row.id}
    `;
    updated += 1;
  }

  return { updated, skipped, failed };
}
