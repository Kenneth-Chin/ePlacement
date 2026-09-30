import fs from 'node:fs/promises';

const sourcePath = new URL('../clinics_raw.json', import.meta.url);
const outputPath = new URL('./clinic-data.js', import.meta.url);
const raw = JSON.parse((await fs.readFile(sourcePath, 'utf8')).replace(/^\uFEFF/, ''));
const grouped = new Map();

for (const record of raw.records) {
  const state = record.state.toUpperCase();
  if (!grouped.has(state)) grouped.set(state, []);
  grouped.get(state).push({
    name: record.clinic_name,
    district: record.district,
    code: record.facility_code,
  });
}

const facilityData = [...grouped.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([state, clinics]) => ({
    state,
    clinics: clinics.sort((a, b) =>
      a.district.localeCompare(b.district) || a.name.localeCompare(b.name)
    ),
  }));

const banner = '// Generated from the GIReT public clinic directory. Run generate-clinic-data.mjs after refreshing clinics_raw.json.\n';
await fs.writeFile(outputPath, `${banner}window.GIRET_FACILITY_DATA = ${JSON.stringify(facilityData, null, 2)};\n`, 'utf8');
console.log(`Generated ${facilityData.reduce((sum, state) => sum + state.clinics.length, 0)} clinics across ${facilityData.length} state/category groups.`);
