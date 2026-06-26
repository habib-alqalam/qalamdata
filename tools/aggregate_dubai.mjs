// Aggregates the real Dubai Land Department datasets (1M+ rows) into a compact
// intelligence file for the QalamData dashboard. Streams line-by-line (low memory).
import fs from 'fs';
import readline from 'readline';
import path from 'path';

const SRC = 'c:\\Users\\HP\\OneDrive\\Documents\\AL QALAM AI\\projects\\Aaronz and Co real estate data api';
const OUT = path.join(process.cwd(), 'site', 'data', 'dubai.json');

const files = {
  land: path.join(SRC, 'land_registry_2026-05-20_01-14-26_1.json'),
  buildings: path.join(SRC, 'buildings_2026-06-01_10-42-45_1.json'),
  summary: path.join(SRC, 'building_summary_information_2026-05-02_01-49-561_1.json'),
  areas: path.join(SRC, 'lkp_areas_2026-04-29_14-03-23_1.json'),
};

async function* records(file) {
  if (!fs.existsSync(file)) return;
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const raw of rl) {
    const line = raw.trim();
    if (!line || line === '[' || line === ']') continue;
    const j = line.endsWith(',') ? line.slice(0, -1) : line;
    try { yield JSON.parse(j); } catch { /* skip malformed */ }
  }
}

const inc = (obj, key) => { if (key == null || key === '') return; obj[key] = (obj[key] || 0) + 1; };
const topN = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
const isTrue1 = (v) => v === 1 || v === '1' || v === '1.00' || v === true;

function run() {
  return (async () => {
    const areaNames = new Map();
    for await (const a of records(files.areas)) {
      areaNames.set(String(a.area_id), { name_en: a.name_en, name_ar: a.name_ar, municipality_number: a.municipality_number });
    }

    const areas = new Map();
    const market = { freehold: 0, registered: 0, total: 0, propertyTypes: {}, landTypes: {} };
    const sampleParcels = [];
    const perAreaSampleCap = 3;
    const perAreaSampleCount = new Map();

    const areaAgg = (id) => {
      if (!areas.has(id)) areas.set(id, { area_id: id, name_en: null, name_ar: null, parcels: 0, freehold: 0, registered: 0, areaSum: 0, areaCount: 0, propertyTypes: {}, projects: {}, buildings: 0, builtUpSum: 0, builtUpCount: 0, flats: 0 });
      return areas.get(id);
    };

    for await (const r of records(files.land)) {
      const id = String(r.area_id ?? '');
      const a = areaAgg(id);
      if (!a.name_en && r.area_name_en) a.name_en = r.area_name_en;
      if (!a.name_ar && r.area_name_ar) a.name_ar = r.area_name_ar;
      a.parcels++; market.total++;
      if (isTrue1(r.is_free_hold)) { a.freehold++; market.freehold++; }
      if (isTrue1(r.is_registered)) { a.registered++; market.registered++; }
      const area = parseFloat(r.actual_area); if (!Number.isNaN(area)) { a.areaSum += area; a.areaCount++; }
      inc(a.propertyTypes, r.property_sub_type_en);
      inc(market.propertyTypes, r.property_sub_type_en);
      inc(market.landTypes, r.land_type_en);
      if (r.project_name_en) inc(a.projects, r.project_name_en);
      const c = perAreaSampleCount.get(id) || 0;
      if (c < perAreaSampleCap && r.parcel_id) {
        sampleParcels.push({
          parcel_id: String(r.parcel_id), area_id: id, area_name_en: r.area_name_en,
          property_type_en: r.property_type_en, property_sub_type_en: r.property_sub_type_en,
          land_type_en: r.land_type_en, actual_area: r.actual_area,
          is_free_hold: r.is_free_hold, is_registered: r.is_registered,
          project_name_en: r.project_name_en, master_project_en: r.master_project_en,
        });
        perAreaSampleCount.set(id, c + 1);
      }
    }

    for await (const b of records(files.buildings)) {
      const id = String(b.area_id ?? '');
      const a = areaAgg(id);
      if (!a.name_en && b.area_name_en) a.name_en = b.area_name_en;
      if (!a.name_ar && b.area_name_ar) a.name_ar = b.area_name_ar;
      a.buildings++;
      const bu = parseFloat(b.built_up_area); if (!Number.isNaN(bu)) { a.builtUpSum += bu; a.builtUpCount++; }
      const fl = parseInt(b.flats, 10); if (!Number.isNaN(fl)) a.flats += fl;
    }

    const ownershipTypes = {}; const buildingStatus = {}; let summaryCount = 0;
    for await (const s of records(files.summary)) {
      summaryCount++;
      inc(ownershipTypes, s.building_ownership_type);
      inc(buildingStatus, s.building_status_english);
    }

    const areaList = [...areas.values()].map((a) => {
      const meta = areaNames.get(a.area_id) || {};
      return {
        area_id: a.area_id,
        name_en: a.name_en || meta.name_en || `Area ${a.area_id}`,
        name_ar: a.name_ar || meta.name_ar || null,
        parcels: a.parcels,
        buildings: a.buildings,
        freehold_pct: a.parcels ? +(100 * a.freehold / a.parcels).toFixed(1) : 0,
        registered_pct: a.parcels ? +(100 * a.registered / a.parcels).toFixed(1) : 0,
        avg_parcel_area_sqm: a.areaCount ? +(a.areaSum / a.areaCount).toFixed(0) : null,
        avg_built_up_area_sqm: a.builtUpCount ? +(a.builtUpSum / a.builtUpCount).toFixed(0) : null,
        total_flats: a.flats,
        top_property_types: topN(a.propertyTypes, 3),
        top_projects: topN(a.projects, 3),
      };
    }).filter((a) => a.parcels > 0 || a.buildings > 0).sort((x, y) => y.parcels - x.parcels);

    const out = {
      emirate: 'Dubai',
      source: 'Dubai Land Department (Dubai Pulse open data)',
      data_status: 'live',
      generated_at: new Date().toISOString(),
      totals: {
        land_parcels: market.total,
        buildings: [...areas.values()].reduce((s, a) => s + a.buildings, 0),
        building_summaries: summaryCount,
        areas: areaList.length,
      },
      market: {
        freehold_pct: market.total ? +(100 * market.freehold / market.total).toFixed(1) : 0,
        registered_pct: market.total ? +(100 * market.registered / market.total).toFixed(1) : 0,
        top_property_types: topN(market.propertyTypes, 8),
        top_land_types: topN(market.landTypes, 6),
        building_ownership_types: topN(ownershipTypes, 6),
        building_status: topN(buildingStatus, 6),
      },
      areas: areaList,
      sample_parcels: sampleParcels.slice(0, 800),
    };

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out));
    const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
    console.log(`OK wrote ${OUT}`);
    console.log(`areas=${areaList.length} sampleParcels=${out.sample_parcels.length} parcels=${market.total} buildings=${out.totals.buildings} summaries=${summaryCount} fileKB=${kb}`);
  })();
}

run().catch((e) => { console.error('FAILED', e); process.exit(1); });
