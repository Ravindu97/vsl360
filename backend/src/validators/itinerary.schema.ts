import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createDestinationSchema = z.object({
  name: z.string().min(1, 'Destination name is required'),
  slug: z.string().regex(slugRegex, 'Slug must be lowercase kebab-case').optional(),
  isActive: z.boolean().optional(),
});

export const updateDestinationSchema = z.object({
  name: z.string().min(1, 'Destination name is required').optional(),
  slug: z.string().regex(slugRegex, 'Slug must be lowercase kebab-case').optional(),
  isActive: z.boolean().optional(),
});

export const createActivitySchema = z.object({
  destinationId: z.string().min(1, 'Destination is required'),
  title: z.string().min(1, 'Activity title is required'),
  description: z.string().min(1, 'Activity description is required'),
  category: z.enum(['GENERAL', 'WILDLIFE', 'SPIRITUAL', 'CULTURAL', 'ADVENTURE', 'LEISURE', 'WELLNESS']).default('GENERAL'),
  isSeasonal: z.boolean().optional(),
});

export const updateActivitySchema = z.object({
  destinationId: z.string().min(1).optional(),
  title: z.string().min(1, 'Activity title is required').optional(),
  description: z.string().min(1, 'Activity description is required').optional(),
  category: z.enum(['GENERAL', 'WILDLIFE', 'SPIRITUAL', 'CULTURAL', 'ADVENTURE', 'LEISURE', 'WELLNESS']).optional(),
  isSeasonal: z.boolean().optional(),
});

const importDestinationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().regex(slugRegex, 'Slug must be lowercase kebab-case'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().positive(),
});

const importActivitySchema = z.object({
  id: z.string().min(1),
  destinationId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['GENERAL', 'WILDLIFE', 'SPIRITUAL', 'CULTURAL', 'ADVENTURE', 'LEISURE', 'WELLNESS']),
  isSeasonal: z.boolean().optional().default(false),
  sortOrder: z.number().int().positive(),
  sourceRow: z.number().int().positive().nullable().optional(),
});

export const importCatalogSchema = z.object({
  replaceAll: z.boolean().optional().default(false),
  destinations: z.array(importDestinationSchema),
  activities: z.array(importActivitySchema),
});
