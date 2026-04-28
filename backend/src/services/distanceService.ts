import prisma from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';
import { ensureDestinationCoordinates } from './geocodingService';
import type { ItineraryPlanDay } from '../types/itineraryPlan';

export type DistanceSource = 'osrm' | 'ors' | 'haversine';

const EARTH_R_M = 6371000;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_R_M * c);
}

type RouteResult = { drivingM: number; durationS: number; source: 'osrm' | 'ors' };

async function fetchOsrm(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): Promise<RouteResult | null> {
  const path = `route/v1/driving/${lon1},${lat1};${lon2},${lat2}`;
  const url = `${env.OSRM_BASE_URL}/${path}?overview=false`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), env.DISTANCE_PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', signal: ac.signal });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { routes?: Array<{ distance: number; duration: number }> };
    const route = data.routes?.[0];
    if (!route) {
      return null;
    }
    return { drivingM: Math.round(route.distance), durationS: Math.round(route.duration), source: 'osrm' };
  } catch (e) {
    logger.debug('OSRM request failed', e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchOrs(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  apiKey: string
): Promise<RouteResult | null> {
  const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), env.DISTANCE_PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({ coordinates: [[lon1, lat1], [lon2, lat2]] }),
      signal: ac.signal,
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { routes?: Array<{ summary: { distance: number; duration: number } }> };
    const s = data.routes?.[0]?.summary;
    if (!s) {
      return null;
    }
    return { drivingM: Math.round(s.distance), durationS: Math.round(s.duration), source: 'ors' };
  } catch (e) {
    logger.debug('OpenRouteService request failed', e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

type CachedRow = {
  drivingMeters: number | null;
  drivingDurationS: number | null;
  straightMeters: number;
  source: string;
};

export type LegDistanceResult = {
  drivingMeters?: number;
  drivingDurationS?: number;
  straightMeters: number;
  source: DistanceSource;
};

/**
 * Get driving + straight distance between two destinations, using DB cache and OSRM/ORS when possible.
 */
export async function getLegDistance(fromId: string, toId: string): Promise<LegDistanceResult> {
  if (fromId === toId) {
    return { straightMeters: 0, drivingMeters: 0, drivingDurationS: 0, source: 'haversine' };
  }

  const [cached] = await prisma.$queryRaw<CachedRow[]>`
    SELECT driving_meters AS "drivingMeters", driving_duration_s AS "drivingDurationS", straight_meters AS "straightMeters", source
    FROM destination_distances
    WHERE from_destination_id = ${fromId} AND to_destination_id = ${toId}
    LIMIT 1
  `;
  if (cached) {
    return {
      drivingMeters: cached.drivingMeters ?? undefined,
      drivingDurationS: cached.drivingDurationS ?? undefined,
      straightMeters: cached.straightMeters,
      source: cached.source as DistanceSource,
    };
  }

  const [a] = await prisma.$queryRaw<
    Array<{ id: string; name: string; latitude: number | null; longitude: number | null }>
  >`SELECT id, name, latitude, longitude FROM destinations WHERE id = ${fromId} LIMIT 1`;
  const [b] = await prisma.$queryRaw<
    Array<{ id: string; name: string; latitude: number | null; longitude: number | null }>
  >`SELECT id, name, latitude, longitude FROM destinations WHERE id = ${toId} LIMIT 1`;
  if (!a || !b) {
    throw new Error('Destination not found for distance');
  }

  const coordA = await ensureDestinationCoordinates(a.id, a.name);
  const coordB = await ensureDestinationCoordinates(b.id, b.name);
  if (!coordA || !coordB) {
    throw new Error('Could not resolve coordinates for one or both destinations');
  }

  const straightMeters = haversineMeters(coordA.lat, coordA.lon, coordB.lat, coordB.lon);

  let drivingMeters: number | undefined;
  let drivingDurationS: number | undefined;
  let source: DistanceSource = 'haversine';

  if (env.ORS_API_KEY) {
    const ors = await fetchOrs(coordA.lon, coordA.lat, coordB.lon, coordB.lat, env.ORS_API_KEY);
    if (ors) {
      drivingMeters = ors.drivingM;
      drivingDurationS = ors.durationS;
      source = ors.source;
    }
  } else {
    const osrm = await fetchOsrm(coordA.lon, coordA.lat, coordB.lon, coordB.lat);
    if (osrm) {
      drivingMeters = osrm.drivingM;
      drivingDurationS = osrm.durationS;
      source = osrm.source;
    }
  }

  if (drivingMeters == null) {
    source = 'haversine';
  }

  await prisma.$executeRaw`
    INSERT INTO destination_distances (
      from_destination_id, to_destination_id, driving_meters, driving_duration_s, straight_meters, source, computed_at
    )
    VALUES (
      ${fromId},
      ${toId},
      ${drivingMeters != null ? drivingMeters : null},
      ${drivingDurationS != null ? drivingDurationS : null},
      ${straightMeters},
      ${source},
      ${new Date()}
    )
    ON CONFLICT (from_destination_id, to_destination_id) DO UPDATE SET
      driving_meters = EXCLUDED.driving_meters,
      driving_duration_s = EXCLUDED.driving_duration_s,
      straight_meters = EXCLUDED.straight_meters,
      source = EXCLUDED.source,
      computed_at = EXCLUDED.computed_at
  `;

  return {
    drivingMeters: drivingMeters != null ? drivingMeters : undefined,
    drivingDurationS: drivingDurationS != null ? drivingDurationS : undefined,
    straightMeters,
    source,
  };
}

export type ItineraryPlanLeg = {
  fromDayNumber: number;
  toDayNumber: number;
  fromDestinationId: string;
  toDestinationId: string;
  fromDestinationName: string;
  toDestinationName: string;
  drivingMeters?: number;
  drivingDurationS?: number;
  straightMeters: number;
  source: DistanceSource;
  /** Human-readable, e.g. "145 km · ~5h 20m" */
  displayLabel: string;
};

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) {
    return `~1m`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
  }
  return `~${m}m`;
}

function kmLabel(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatLegDisplay(leg: LegDistanceResult, driving?: boolean): string {
  if (driving && leg.drivingMeters != null) {
    const d = leg.drivingDurationS != null ? ` · ${formatDuration(leg.drivingDurationS)}` : '';
    return `${kmLabel(leg.drivingMeters)} (driving)${d}`;
  }
  if (leg.source === 'haversine' && leg.drivingMeters == null) {
    return `~${kmLabel(leg.straightMeters)} straight-line`;
  }
  return `~${kmLabel(leg.straightMeters)}`;
}

export function legTemplateLabels(leg: ItineraryPlanLeg): { distanceLabel: string; durationLabel: string } {
  if (leg.drivingMeters != null) {
    return {
      distanceLabel: kmLabel(leg.drivingMeters),
      durationLabel: leg.drivingDurationS != null ? formatDuration(leg.drivingDurationS) : '—',
    };
  }
  return {
    distanceLabel: `~${kmLabel(leg.straightMeters)} (straight-line)`,
    durationLabel: '—',
  };
}

/**
 * One leg per day transition (Day N-1 → Day N) when both have destinations.
 */
export async function getLegsForPlan(planDays: ItineraryPlanDay[]): Promise<ItineraryPlanLeg[]> {
  if (!Array.isArray(planDays) || planDays.length === 0) {
    return [];
  }

  const byDay = new Map(planDays.map((d) => [d.dayNumber, d]));
  const sortedDays = [...byDay.keys()].filter((n) => Number.isInteger(n)).sort((a, b) => a - b);
  if (sortedDays.length < 2) {
    return [];
  }

  const out: ItineraryPlanLeg[] = [];

  for (let i = 1; i < sortedDays.length; i += 1) {
    const fromDay = sortedDays[i - 1];
    const toDay = sortedDays[i];
    const prev = byDay.get(fromDay);
    const curr = byDay.get(toDay);
    const fromId = prev?.destinationId?.trim();
    const toId = curr?.destinationId?.trim();
    if (!fromId || !toId) {
      continue;
    }

    const nameRows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id, name
      FROM destinations
      WHERE id = ${fromId} OR id = ${toId}
    `;
    const nameMap = new Map(nameRows.map((r) => [r.id, r.name]));
    const fromName = nameMap.get(fromId) || fromId;
    const toName = nameMap.get(toId) || toId;

    if (fromId === toId) {
      out.push({
        fromDayNumber: fromDay,
        toDayNumber: toDay,
        fromDestinationId: fromId,
        toDestinationId: toId,
        fromDestinationName: fromName,
        toDestinationName: toName,
        straightMeters: 0,
        drivingMeters: 0,
        drivingDurationS: 0,
        source: 'haversine',
        displayLabel: 'Same area',
      });
      continue;
    }

    try {
      const d = await getLegDistance(fromId, toId);
      const driving = d.drivingMeters != null;
      out.push({
        fromDayNumber: fromDay,
        toDayNumber: toDay,
        fromDestinationId: fromId,
        toDestinationId: toId,
        fromDestinationName: fromName,
        toDestinationName: toName,
        drivingMeters: d.drivingMeters,
        drivingDurationS: d.drivingDurationS,
        straightMeters: d.straightMeters,
        source: d.source,
        displayLabel: formatLegDisplay(d, driving),
      });
    } catch (e) {
      logger.warn(`getLegDistance failed for ${fromId} -> ${toId}`, e);
    }
  }

  return out;
}