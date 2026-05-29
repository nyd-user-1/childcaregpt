import { sql } from '@/lib/db'

// Server-only. Site-wide search across the real facilities data.

export interface SearchResults {
  counties: { name: string; slug: string }[]
  cities: { name: string; county: string; slug: string }[]
  zips: { zip: string; city: string }[]
  facilities: { id: number; name: string; city: string; county: string; programType: string }[]
}

export async function searchSite(q: string): Promise<SearchResults> {
  const p = `%${q}%`
  const [counties, cities, zips, facilities] = await Promise.all([
    sql`SELECT DISTINCT county FROM facilities WHERE county ILIKE ${p} ORDER BY county LIMIT 8`,
    sql`SELECT MAX(city) AS city, MAX(county) AS county,
          regexp_replace(lower(MAX(city)), '[^a-z0-9]+', '-', 'g') AS slug
        FROM facilities WHERE city ILIKE ${p}
        GROUP BY lower(city) ORDER BY MAX(city) LIMIT 8`,
    sql`SELECT zip_code, MAX(city) AS city FROM facilities WHERE zip_code ILIKE ${p}
        GROUP BY zip_code ORDER BY zip_code LIMIT 8`,
    sql`SELECT facility_id, facility_name, city, county, program_type
        FROM facilities WHERE facility_name ILIKE ${p}
        ORDER BY facility_name LIMIT 10`,
  ])

  return {
    counties: counties.map(r => ({
      name: r.county as string,
      slug: (r.county as string).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    })),
    cities: cities.map(r => ({ name: r.city as string, county: r.county as string, slug: r.slug as string })),
    zips: zips.map(r => ({ zip: r.zip_code as string, city: r.city as string })),
    facilities: facilities.map(r => ({
      id: Number(r.facility_id),
      name: r.facility_name as string,
      city: r.city as string,
      county: r.county as string,
      programType: r.program_type as string,
    })),
  }
}
