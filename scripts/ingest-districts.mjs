/**
 * Ingests NY State legislative districts (Senate + Assembly):
 *   1. Creates `legislative_districts` and fills it with the contact/attribute
 *      data from both GeoJSON files (name, party, phone, email, office address).
 *   2. Spatially joins every facility (by lat/lng) to its Senate and Assembly
 *      district, storing `senate_district` + `assembly_district` on `facilities`.
 *      Uses the FULL-resolution polygons for an accurate point-in-polygon test.
 *
 * Usage: node --env-file=.env.local scripts/ingest-districts.mjs
 */

import fs from 'fs';
import pg from 'pg';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('Set DATABASE_URL'); process.exit(1); }

const SENATE_FILE   = new URL('../NYS_Senate_Districts_-4944317966473631202.geojson', import.meta.url).pathname;
const ASSEMBLY_FILE = new URL('../NYS_Assembly_Districts_6337436834021899798.geojson', import.meta.url).pathname;

const pool = new Pool({ connectionString: DATABASE_URL, ssl: true });

function load(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

// Properties differ in case between the two files; normalize to one shape.
function senateRow(p) {
  return { chamber: 'senate', district: p.DISTRICT, name: p.NAME, party: p.Party,
    phone: p.Phone, email: p.email, dist_phone: p.dist_phone,
    address: p.Address, address2: p.Address2, city: p.City, state: p.State, zip: p.Zip };
}
function assemblyRow(p) {
  return { chamber: 'assembly', district: p.District, name: p.Name, party: p.Party,
    phone: p.Phone, email: p.Email, dist_phone: p.Dist_Phone,
    address: p.Address, address2: p.Address2, city: p.City, state: p.State, zip: p.Zip };
}

async function main() {
  const senate   = load(SENATE_FILE);
  const assembly = load(ASSEMBLY_FILE);

  // 1. Table + contact data ---------------------------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS legislative_districts (
      chamber     text NOT NULL,
      district    int  NOT NULL,
      name        text,
      party       text,
      phone       text,
      email       text,
      dist_phone  text,
      address     text,
      address2    text,
      city        text,
      state       text,
      zip         text,
      PRIMARY KEY (chamber, district)
    )
  `);

  const rows = [
    ...senate.features.map(f => senateRow(f.properties)),
    ...assembly.features.map(f => assemblyRow(f.properties)),
  ];
  for (const r of rows) {
    await pool.query(
      `INSERT INTO legislative_districts
         (chamber, district, name, party, phone, email, dist_phone, address, address2, city, state, zip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (chamber, district) DO UPDATE SET
         name=$3, party=$4, phone=$5, email=$6, dist_phone=$7,
         address=$8, address2=$9, city=$10, state=$11, zip=$12`,
      [r.chamber, r.district, r.name, r.party, r.phone, r.email, r.dist_phone,
       r.address, r.address2, r.city, r.state, r.zip]
    );
  }
  console.log(`Inserted ${rows.length} districts (${senate.features.length} senate, ${assembly.features.length} assembly).`);

  // 2. Facility spatial join --------------------------------------------------
  await pool.query(`ALTER TABLE facilities ADD COLUMN IF NOT EXISTS senate_district int`);
  await pool.query(`ALTER TABLE facilities ADD COLUMN IF NOT EXISTS assembly_district int`);

  const facilities = (await pool.query(
    `SELECT facility_id, latitude, longitude FROM facilities
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL`
  )).rows;
  console.log(`Joining ${facilities.length} facilities to districts…`);

  // Precompute [district, feature] pairs.
  const senFeatures = senate.features.map(f => [f.properties.DISTRICT, f]);
  const asmFeatures = assembly.features.map(f => [f.properties.District, f]);

  function districtFor(lng, lat, pairs) {
    const pt = { type: 'Point', coordinates: [lng, lat] };
    for (const [d, f] of pairs) {
      if (booleanPointInPolygon(pt, f)) return d;
    }
    return null;
  }

  // Compute all assignments in memory first…
  const assignments = [];
  let done = 0, senHit = 0, asmHit = 0;
  for (const f of facilities) {
    const lng = Number(f.longitude), lat = Number(f.latitude);
    const sen = districtFor(lng, lat, senFeatures);
    const asm = districtFor(lng, lat, asmFeatures);
    if (sen != null) senHit++;
    if (asm != null) asmHit++;
    assignments.push([f.facility_id, sen, asm]);
    if (++done % 2000 === 0) console.log(`  …computed ${done}/${facilities.length}`);
  }

  // …then write in batches with a single set-based UPDATE per batch.
  const BATCH = 500;
  for (let i = 0; i < assignments.length; i += BATCH) {
    const slice = assignments.slice(i, i + BATCH);
    const ids = slice.map(a => a[0]);
    const sens = slice.map(a => a[1]);
    const asms = slice.map(a => a[2]);
    await pool.query(
      `UPDATE facilities f SET
         senate_district   = u.sen,
         assembly_district = u.asm
       FROM (
         SELECT * FROM unnest($1::int[], $2::int[], $3::int[]) AS t(fid, sen, asm)
       ) u
       WHERE f.facility_id = u.fid`,
      [ids, sens, asms]
    );
    console.log(`  …wrote ${Math.min(i + BATCH, assignments.length)}/${assignments.length}`);
  }
  console.log(`Done. Matched senate=${senHit}, assembly=${asmHit} of ${facilities.length}.`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
