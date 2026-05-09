/**
 * Ingests NY State regulated childcare facilities from data.ny.gov (SODA2)
 * into the Neon `facilities` table.
 *
 * Usage: DATABASE_URL=<url> node scripts/ingest-facilities.mjs
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL before running');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: true });

const API_BASE = 'https://data.ny.gov/resource/fymg-3wv3.json';
const PAGE_SIZE = 1000;
const BATCH_SIZE = 100;

const toInt = (v) => { const n = Number.parseInt(v, 10); return isNaN(n) ? null : n; };
const toFloat = (v) => { const n = Number.parseFloat(v); return isNaN(n) ? null : n; };
const toBool = (v) => v === 'Y' ? true : v === 'N' ? false : null;

const COLS = [
  'facility_id','program_type','region_code','county','facility_status',
  'facility_name','address_omitted','street_number','street_name',
  'additional_address','floor','apartment','city','state','zip_code',
  'phone_number_omitted','phone_number','phone_extension','provider_name',
  'school_district_name','capacity_description',
  'infant_capacity','toddler_capacity','preschool_capacity',
  'school_age_capacity','total_capacity',
  'profile_url','latitude','longitude','ingested_at',
];

const UPDATE_COLS = COLS.filter(c => c !== 'facility_id' && c !== 'ingested_at');

function rowToParams(r) {
  return [
    toInt(r.facility_id),
    r.program_type ?? null,
    r.region_code ?? null,
    r.county ?? null,
    r.facility_status ?? null,
    r.facility_name ?? null,
    toBool(r.address_omitted),
    r.street_number ?? null,
    r.street_name ?? null,
    r.additional_address ?? null,
    r.floor ?? null,
    r.apartment ?? null,
    r.city ?? null,
    r.state ?? null,
    r.zip_code != null ? String(r.zip_code) : null,
    toBool(r.phone_number_omitted),
    r.phone_number ?? null,
    r.phone_extension ?? null,
    r.provider_name ?? null,
    r.school_district_name ?? null,
    r.capacity_description ?? null,
    toInt(r.infant_capacity),
    toInt(r.toddler_capacity),
    toInt(r.preschool_capacity),
    toInt(r.school_age_capacity),
    toInt(r.total_capacity),
    r.additional_information?.url ?? null,
    toFloat(r.latitude),
    toFloat(r.longitude),
    new Date(),
  ];
}

async function upsertBatch(client, rows) {
  const colList = COLS.join(', ');
  const updateSet = UPDATE_COLS.map(c => `${c} = EXCLUDED.${c}`).join(', ');

  // Build parameterized VALUES for all rows in one query
  const values = [];
  const placeholders = rows.map((row, i) => {
    const params = rowToParams(row);
    values.push(...params);
    const base = i * COLS.length;
    return `(${COLS.map((_, j) => `$${base + j + 1}`).join(', ')})`;
  });

  const sql = `
    INSERT INTO facilities (${colList})
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (facility_id) DO UPDATE SET ${updateSet}
  `;

  await client.query(sql, values);
}

async function fetchPage(offset) {
  const url = `${API_BASE}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=facility_id`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
  return res.json();
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('Starting facility ingest...');
    let offset = 0;
    let total = 0;

    while (true) {
      const rows = await fetchPage(offset);
      if (rows.length === 0) break;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await upsertBatch(client, rows.slice(i, i + BATCH_SIZE));
      }

      total += rows.length;
      console.log(`  ingested ${total} rows`);

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    console.log(`Done. Total rows ingested: ${total}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
