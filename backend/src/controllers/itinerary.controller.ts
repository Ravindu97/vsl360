import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../config/database';
import { getLegDistance } from '../services/distanceService';
import { backfillMissingCoordinates } from '../services/geocodingService';

const slugify = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

export class ItineraryController {
  async listDestinations(req: Request, res: Response): Promise<void> {
    const search = String(req.query.search ?? '').trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.max(1, Math.min(Number(req.query.pageSize ?? 10), 100));
    const offset = (page - 1) * pageSize;

    const [{ total }] = search
      ? await prisma.$queryRaw<Array<{ total: number }>>`
          SELECT COUNT(*)::int AS total
          FROM destinations
          WHERE name ILIKE ${`%${search}%`}
        `
      : await prisma.$queryRaw<Array<{ total: number }>>`
          SELECT COUNT(*)::int AS total
          FROM destinations
        `;

    const rows = search
      ? await prisma.$queryRaw<
          Array<{
            id: string;
            name: string;
            slug: string;
            isActive: boolean;
            sortOrder: number;
            latitude: number | null;
            longitude: number | null;
            geocodedAt: Date | null;
          }>
        >`
          SELECT
            id,
            name,
            slug,
            is_active AS "isActive",
            sort_order AS "sortOrder",
            latitude,
            longitude,
            geocoded_at AS "geocodedAt"
          FROM destinations
          WHERE name ILIKE ${`%${search}%`}
          ORDER BY sort_order ASC
          LIMIT ${pageSize}
          OFFSET ${offset}
        `
      : await prisma.$queryRaw<
          Array<{
            id: string;
            name: string;
            slug: string;
            isActive: boolean;
            sortOrder: number;
            latitude: number | null;
            longitude: number | null;
            geocodedAt: Date | null;
          }>
        >`
          SELECT
            id,
            name,
            slug,
            is_active AS "isActive",
            sort_order AS "sortOrder",
            latitude,
            longitude,
            geocoded_at AS "geocodedAt"
          FROM destinations
          ORDER BY sort_order ASC
          LIMIT ${pageSize}
          OFFSET ${offset}
        `;

    res.json({
      items: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }

  async createDestination(req: Request, res: Response): Promise<void> {
    const name = String(req.body.name).trim();
    const slug = (req.body.slug ? String(req.body.slug).trim() : slugify(name));
    const isActive = req.body.isActive ?? true;

    const [{ nextSortOrder }] = await prisma.$queryRaw<Array<{ nextSortOrder: number }>>`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS "nextSortOrder" FROM destinations
    `;

    const [row] = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
        sortOrder: number;
        latitude: number | null;
        longitude: number | null;
        geocodedAt: Date | null;
      }>
    >`
      INSERT INTO destinations (id, name, slug, is_active, sort_order)
      VALUES (${randomUUID()}, ${name}, ${slug}, ${isActive}, ${nextSortOrder})
      RETURNING
        id,
        name,
        slug,
        is_active AS "isActive",
        sort_order AS "sortOrder",
        latitude,
        longitude,
        geocoded_at AS "geocodedAt"
    `;

    res.status(201).json(row);
  }

  async updateDestination(req: Request, res: Response): Promise<void> {
    const id = req.params.destinationId;

    const existing = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
        sortOrder: number;
        latitude: number | null;
        longitude: number | null;
        geocodedAt: Date | null;
      }>
    >`
      SELECT
        id,
        name,
        slug,
        is_active AS "isActive",
        sort_order AS "sortOrder",
        latitude,
        longitude,
        geocoded_at AS "geocodedAt"
      FROM destinations
      WHERE id = ${id}
      LIMIT 1
    `;

    if (existing.length === 0) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }

    const current = existing[0];
    const name = req.body.name !== undefined ? String(req.body.name).trim() : current.name;
    const slug = req.body.slug !== undefined ? String(req.body.slug).trim() : current.slug;
    const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : current.isActive;

    const [row] = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
        sortOrder: number;
        latitude: number | null;
        longitude: number | null;
        geocodedAt: Date | null;
      }>
    >`
      UPDATE destinations
      SET name = ${name},
          slug = ${slug},
          is_active = ${isActive}
      WHERE id = ${id}
      RETURNING
        id,
        name,
        slug,
        is_active AS "isActive",
        sort_order AS "sortOrder",
        latitude,
        longitude,
        geocoded_at AS "geocodedAt"
    `;

    res.json(row);
  }

  async deleteDestination(req: Request, res: Response): Promise<void> {
    const id = req.params.destinationId;

    const deleted = await prisma.$executeRaw`
      DELETE FROM destinations WHERE id = ${id}
    `;

    if (deleted === 0) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }

    res.json({ message: 'Destination deleted' });
  }

  async listActivities(req: Request, res: Response): Promise<void> {
    const destinationId = String(req.query.destinationId ?? '').trim();
    const search = String(req.query.search ?? '').trim();
    const category = String(req.query.category ?? '').trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.max(1, Math.min(Number(req.query.pageSize ?? 10), 100));
    const offset = (page - 1) * pageSize;

    const conditions: Prisma.Sql[] = [];
    if (destinationId) conditions.push(Prisma.sql`a.destination_id = ${destinationId}`);
    if (search) conditions.push(Prisma.sql`a.title ILIKE ${`%${search}%`}`);
    if (category) conditions.push(Prisma.sql`a.category = ${category}`);

    const whereSql = conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.sql``;

    const [countRow] = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total
      FROM destination_activities a
      ${whereSql}
    `;

    const total = countRow?.total ?? 0;

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      destinationId: string;
      destinationSlug: string;
      title: string;
      description: string;
      category: string;
      isSeasonal: boolean;
      sortOrder: number;
      sourceRow: number | null;
    }>>`
      SELECT
        a.id,
        a.destination_id AS "destinationId",
        d.slug AS "destinationSlug",
        a.title,
        a.description,
        a.category,
        a.is_seasonal AS "isSeasonal",
        a.sort_order AS "sortOrder",
        a.source_row AS "sourceRow"
      FROM destination_activities a
      INNER JOIN destinations d ON d.id = a.destination_id
      ${whereSql}
      ORDER BY d.sort_order ASC, a.sort_order ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    res.json({
      items: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }

  async createActivity(req: Request, res: Response): Promise<void> {
    const destinationId = String(req.body.destinationId).trim();
    const title = String(req.body.title).trim();
    const description = String(req.body.description).trim();
    const category = String(req.body.category ?? 'GENERAL').trim();
    const isSeasonal = Boolean(req.body.isSeasonal ?? false);

    const destinationExists = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM destinations WHERE id = ${destinationId} LIMIT 1
    `;

    if (destinationExists.length === 0) {
      res.status(400).json({ error: 'Destination not found' });
      return;
    }

    const [{ nextSortOrder }] = await prisma.$queryRaw<Array<{ nextSortOrder: number }>>`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS "nextSortOrder"
      FROM destination_activities
      WHERE destination_id = ${destinationId}
    `;

    const [row] = await prisma.$queryRaw<Array<{
      id: string;
      destinationId: string;
      title: string;
      description: string;
      category: string;
      isSeasonal: boolean;
      sortOrder: number;
      sourceRow: number | null;
    }>>`
      INSERT INTO destination_activities (id, destination_id, title, description, category, is_seasonal, sort_order, source_row)
      VALUES (${randomUUID()}, ${destinationId}, ${title}, ${description}, ${category}, ${isSeasonal}, ${nextSortOrder}, NULL)
      RETURNING id,
                destination_id AS "destinationId",
                title,
                description,
                category,
                is_seasonal AS "isSeasonal",
                sort_order AS "sortOrder",
                source_row AS "sourceRow"
    `;

    res.status(201).json(row);
  }

  async updateActivity(req: Request, res: Response): Promise<void> {
    const id = req.params.activityId;

    const existing = await prisma.$queryRaw<Array<{
      id: string;
      destinationId: string;
      title: string;
      description: string;
      category: string;
      isSeasonal: boolean;
      sortOrder: number;
      sourceRow: number | null;
    }>>`
      SELECT id,
             destination_id AS "destinationId",
             title,
             description,
             category,
             is_seasonal AS "isSeasonal",
             sort_order AS "sortOrder",
             source_row AS "sourceRow"
      FROM destination_activities
      WHERE id = ${id}
      LIMIT 1
    `;

    if (existing.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const current = existing[0];
    const destinationId = req.body.destinationId !== undefined ? String(req.body.destinationId).trim() : current.destinationId;
    const title = req.body.title !== undefined ? String(req.body.title).trim() : current.title;
    const description = req.body.description !== undefined ? String(req.body.description).trim() : current.description;
    const category = req.body.category !== undefined ? String(req.body.category).trim() : current.category;
    const isSeasonal = req.body.isSeasonal !== undefined ? Boolean(req.body.isSeasonal) : current.isSeasonal;

    const [row] = await prisma.$queryRaw<Array<{
      id: string;
      destinationId: string;
      title: string;
      description: string;
      category: string;
      isSeasonal: boolean;
      sortOrder: number;
      sourceRow: number | null;
    }>>`
      UPDATE destination_activities
      SET destination_id = ${destinationId},
          title = ${title},
          description = ${description},
          category = ${category},
          is_seasonal = ${isSeasonal}
      WHERE id = ${id}
      RETURNING id,
                destination_id AS "destinationId",
                title,
                description,
                category,
                is_seasonal AS "isSeasonal",
                sort_order AS "sortOrder",
                source_row AS "sourceRow"
    `;

    res.json(row);
  }

  async deleteActivity(req: Request, res: Response): Promise<void> {
    const id = req.params.activityId;

    const deleted = await prisma.$executeRaw`
      DELETE FROM destination_activities WHERE id = ${id}
    `;

    if (deleted === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json({ message: 'Activity deleted' });
  }

  async geocodeDestinations(_req: Request, res: Response): Promise<void> {
    try {
      const result = await backfillMissingCoordinates();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Geocoding failed' });
    }
  }

  async getDestinationDistance(req: Request, res: Response): Promise<void> {
    const fromId = String(req.params.fromId ?? '');
    const toId = String(req.params.toId ?? '');
    if (!fromId || !toId) {
      res.status(400).json({ error: 'from and to destination ids required' });
      return;
    }
    try {
      const d = await getLegDistance(fromId, toId);
      res.json(d);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || 'Distance lookup failed' });
    }
  }

  async exportCatalog(_req: Request, res: Response): Promise<void> {
    const destinations = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
        sortOrder: number;
        latitude: number | null;
        longitude: number | null;
        geocodedAt: Date | null;
      }>
    >`
      SELECT
        id,
        name,
        slug,
        is_active AS "isActive",
        sort_order AS "sortOrder",
        latitude,
        longitude,
        geocoded_at AS "geocodedAt"
      FROM destinations
      ORDER BY sort_order ASC
    `;

    const activities = await prisma.$queryRaw<Array<{
      id: string;
      destinationId: string;
      title: string;
      description: string;
      category: string;
      isSeasonal: boolean;
      sortOrder: number;
      sourceRow: number | null;
    }>>`
      SELECT id,
             destination_id AS "destinationId",
             title,
             description,
             category,
             is_seasonal AS "isSeasonal",
             sort_order AS "sortOrder",
             source_row AS "sourceRow"
      FROM destination_activities
      ORDER BY sort_order ASC
    `;

    res.json({
      exportedAt: new Date().toISOString(),
      destinationCount: destinations.length,
      activityCount: activities.length,
      destinations,
      activities,
    });
  }

  async importCatalog(req: Request, res: Response): Promise<void> {
    const replaceAll = Boolean(req.body.replaceAll ?? false);
    const destinations = req.body.destinations as Array<{
      id: string;
      name: string;
      slug: string;
      isActive?: boolean;
      sortOrder: number;
      latitude?: number | null;
      longitude?: number | null;
    }>;
    const activities = req.body.activities as Array<{
      id: string;
      destinationId: string;
      title: string;
      description: string;
      category: string;
      isSeasonal?: boolean;
      sortOrder: number;
      sourceRow?: number | null;
    }>;

    await prisma.$transaction(async (tx) => {
      if (replaceAll) {
        await tx.$executeRaw`DELETE FROM destination_activities`;
        await tx.$executeRaw`DELETE FROM destinations`;
      }

      for (const destination of destinations) {
        const lat = destination.latitude != null && Number.isFinite(Number(destination.latitude))
          ? Number(destination.latitude)
          : null;
        const lng = destination.longitude != null && Number.isFinite(Number(destination.longitude))
          ? Number(destination.longitude)
          : null;
        const geocodedAt = lat != null && lng != null ? new Date() : null;
        await tx.$executeRaw`
          INSERT INTO destinations (id, name, slug, is_active, sort_order, latitude, longitude, geocoded_at)
          VALUES (
            ${destination.id},
            ${destination.name},
            ${destination.slug},
            ${destination.isActive ?? true},
            ${destination.sortOrder},
            ${lat},
            ${lng},
            ${geocodedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            is_active = EXCLUDED.is_active,
            sort_order = EXCLUDED.sort_order,
            latitude = COALESCE(EXCLUDED.latitude, destinations.latitude),
            longitude = COALESCE(EXCLUDED.longitude, destinations.longitude),
            geocoded_at = COALESCE(EXCLUDED.geocoded_at, destinations.geocoded_at)
        `;
      }

      for (const activity of activities) {
        await tx.$executeRaw`
          INSERT INTO destination_activities (id, destination_id, title, description, category, is_seasonal, sort_order, source_row)
          VALUES (
            ${activity.id},
            ${activity.destinationId},
            ${activity.title},
            ${activity.description},
            ${activity.category},
            ${activity.isSeasonal ?? false},
            ${activity.sortOrder},
            ${activity.sourceRow ?? null}
          )
          ON CONFLICT (id) DO UPDATE SET
            destination_id = EXCLUDED.destination_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            is_seasonal = EXCLUDED.is_seasonal,
            sort_order = EXCLUDED.sort_order,
            source_row = EXCLUDED.source_row
        `;
      }
    });

    res.json({
      message: 'Catalog import completed',
      replaceAll,
      importedDestinations: destinations.length,
      importedActivities: activities.length,
    });
  }
}

export const itineraryController = new ItineraryController();
