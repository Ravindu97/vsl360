import fs from 'fs';
import path from 'path';

const inputPath = process.argv[2] || path.join(process.cwd(), 'itineary_details.csv');
const outputDir = process.argv[3] || path.join(process.cwd(), 'data', 'itinerary');

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function cleanText(value) {
  if (!value) return '';

  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function inferCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (/safari|wildlife|elephant|whale|dolphin|bird|turtle|national park|lagoon/.test(text)) return 'WILDLIFE';
  if (/temple|sacred|pooja|pilgrimage|stupa|bodhi|spiritual/.test(text)) return 'SPIRITUAL';
  if (/fort|museum|unesco|city tour|heritage|history|historical|dance/.test(text)) return 'CULTURAL';
  if (/surf|zipline|hike|climb|train ride|water sports|parasailing|jet ski|adventure/.test(text)) return 'ADVENTURE';
  if (/beach|sunset|lake|relax|cafe|nightlife|dining/.test(text)) return 'LEISURE';
  if (/spa|ayurvedic|wellness|yoga/.test(text)) return 'WELLNESS';

  return 'GENERAL';
}

function toYamlScalar(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);

  const text = String(value ?? '');
  if (text === '') return "''";
  if (/^[A-Za-z0-9_./:-]+$/.test(text)) return text;

  return `'${text.replace(/'/g, "''")}'`;
}

function toYamlList(items, rootKey) {
  const lines = [`${rootKey}:`];

  for (const item of items) {
    const entries = Object.entries(item);
    if (entries.length === 0) {
      lines.push('  - {}');
      continue;
    }

    const [firstKey, firstValue] = entries[0];
    lines.push(`  - ${firstKey}: ${toYamlScalar(firstValue)}`);

    for (let i = 1; i < entries.length; i += 1) {
      const [key, value] = entries[i];
      lines.push(`    ${key}: ${toYamlScalar(value)}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function sqlText(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function sqlBool(value) {
  return value ? 'TRUE' : 'FALSE';
}

function main() {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const rows = raw.split(/\r?\n/);

  let currentDestination = '';
  const sourceActivities = [];

  rows.forEach((line, idx) => {
    if (!line.trim()) return;

    const cols = parseCsvLine(line).map(cleanText);
    if (cols.every((c) => c === '')) return;

    const destinationCell = cols[1] || '';
    const activityTitle = cols[2] || '';
    const activityDescription = cols[3] || '';

    if (destinationCell) currentDestination = destinationCell;
    if (!currentDestination || !activityTitle) return;

    sourceActivities.push({
      source_row: idx + 1,
      destination_name: currentDestination,
      destination_slug: slugify(currentDestination),
      title: activityTitle,
      description: activityDescription,
    });
  });

  const destinationMap = new Map();

  for (const row of sourceActivities) {
    if (!destinationMap.has(row.destination_slug)) {
      const destinationCode = `DST_${String(destinationMap.size + 1).padStart(3, '0')}`;
      destinationMap.set(row.destination_slug, {
        destination_code: destinationCode,
        name: row.destination_name,
        slug: row.destination_slug,
        is_active: true,
        sort_order: destinationMap.size + 1,
      });
    }
  }

  const destinations = [...destinationMap.values()];

  const activities = sourceActivities.map((row, index) => ({
    activity_code: `ACT_${String(index + 1).padStart(4, '0')}`,
    destination_code: destinationMap.get(row.destination_slug).destination_code,
    destination_slug: row.destination_slug,
    title: row.title,
    description: row.description,
    category: inferCategory(row.title, row.description),
    is_seasonal: /seasonal|best during/i.test(`${row.title} ${row.description}`),
    source_order: index + 1,
    source_row: row.source_row,
  }));

  const bundle = {
    meta: {
      generated_at: new Date().toISOString(),
      source_file: path.basename(inputPath),
      destination_count: destinations.length,
      activity_count: activities.length,
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });

  const destinationsYaml = toYamlList(destinations, 'destinations');
  const activitiesYaml = toYamlList(activities, 'activities');
  const bundleYaml = [
    'meta:',
    `  generated_at: ${toYamlScalar(bundle.meta.generated_at)}`,
    `  source_file: ${toYamlScalar(bundle.meta.source_file)}`,
    `  destination_count: ${bundle.meta.destination_count}`,
    `  activity_count: ${bundle.meta.activity_count}`,
    '',
    destinationsYaml,
    activitiesYaml,
  ].join('\n');

  fs.writeFileSync(path.join(outputDir, 'itinerary.destinations.yaml'), destinationsYaml);
  fs.writeFileSync(path.join(outputDir, 'itinerary.activities.yaml'), activitiesYaml);
  fs.writeFileSync(path.join(outputDir, 'itinerary.bundle.yaml'), bundleYaml);

  const schemaSql = [
    '-- Suggested PostgreSQL schema for itinerary data',
    'CREATE TABLE IF NOT EXISTS destinations (',
    '  id TEXT PRIMARY KEY,',
    '  name TEXT NOT NULL,',
    '  slug TEXT UNIQUE NOT NULL,',
    '  is_active BOOLEAN NOT NULL DEFAULT TRUE,',
    '  sort_order INTEGER NOT NULL,',
    '  latitude DOUBLE PRECISION,',
    '  longitude DOUBLE PRECISION,',
    '  geocoded_at TIMESTAMPTZ',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS destination_activities (',
    '  id TEXT PRIMARY KEY,',
    '  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,',
    '  title TEXT NOT NULL,',
    '  description TEXT NOT NULL,',
    '  category TEXT NOT NULL,',
    '  is_seasonal BOOLEAN NOT NULL DEFAULT FALSE,',
    '  sort_order INTEGER NOT NULL,',
    '  source_row INTEGER',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS destination_distances (',
    '  from_destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,',
    '  to_destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,',
    '  driving_meters INTEGER,',
    '  driving_duration_s INTEGER,',
    '  straight_meters INTEGER NOT NULL,',
    "  source TEXT NOT NULL,",
    '  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),',
    '  PRIMARY KEY (from_destination_id, to_destination_id)',
    ');',
    '',
    '-- Seed destinations from itinerary.destinations.yaml',
    '-- Seed activities from itinerary.activities.yaml',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outputDir, 'schema.sql'), schemaSql);

  const destinationInsertValues = destinations
    .map((row) => `  (${sqlText(row.destination_code)}, ${sqlText(row.name)}, ${sqlText(row.slug)}, ${sqlBool(row.is_active)}, ${row.sort_order})`)
    .join(',\n');

  const activityInsertValues = activities
    .map((row) => `  (${sqlText(row.activity_code)}, ${sqlText(row.destination_code)}, ${sqlText(row.title)}, ${sqlText(row.description)}, ${sqlText(row.category)}, ${sqlBool(row.is_seasonal)}, ${row.source_order}, ${row.source_row})`)
    .join(',\n');

  const seedSql = [
    '-- Auto-generated by scripts/convert-itinerary-csv-to-yaml.mjs',
    '-- Run this after schema.sql',
    'BEGIN;',
    '',
    'INSERT INTO destinations (id, name, slug, is_active, sort_order)',
    'VALUES',
    destinationInsertValues,
    'ON CONFLICT (id) DO UPDATE SET',
    '  name = EXCLUDED.name,',
    '  slug = EXCLUDED.slug,',
    '  is_active = EXCLUDED.is_active,',
    '  sort_order = EXCLUDED.sort_order;',
    '',
    'INSERT INTO destination_activities (id, destination_id, title, description, category, is_seasonal, sort_order, source_row)',
    'VALUES',
    activityInsertValues,
    'ON CONFLICT (id) DO UPDATE SET',
    '  destination_id = EXCLUDED.destination_id,',
    '  title = EXCLUDED.title,',
    '  description = EXCLUDED.description,',
    '  category = EXCLUDED.category,',
    '  is_seasonal = EXCLUDED.is_seasonal,',
    '  sort_order = EXCLUDED.sort_order,',
    '  source_row = EXCLUDED.source_row;',
    '',
    'COMMIT;',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outputDir, 'seed.sql'), seedSql);

  console.log(`Converted ${activities.length} activities across ${destinations.length} destinations.`);
  console.log(`Output written to: ${outputDir}`);
}

main();
