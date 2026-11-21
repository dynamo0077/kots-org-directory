// Deterministic generator for the dirty mock fixture used by the mock API.
// Seed quirks are the 8 records from the assessment brief, kept verbatim and
// uncleaned. Generated rows deliberately repeat the same classes of mess.
//
// Usage: node scripts/generate-fixture.mjs > src/assets/organisations.fixture.json

const seedRows = [
  { id: 1, name: 'Northwind Traders', status: 'active', memberCount: 42, owner: { email: 'ops@northwind.example' }, createdAt: '2024-03-11T09:12:00Z' },
  { id: 2, name: '', status: 'ACTIVE', memberCount: '12', owner: { email: 'a@b.example' }, createdAt: 1710150720000 },
  { id: 3, name: null, status: 'Active', memberCount: -1, createdAt: '2024-01-02T00:00:00Z' },
  { id: 42, name: 'Globex Corporation', status: 'suspended', memberCount: 7, owner: { email: 'hq@globex.example' }, createdAt: '2023-11-30T14:45:10Z' },
  { id: 42, name: 'Globex Corporation Ltd', status: 'actve', memberCount: 7, owner: { email: 'hq@globex.example' }, createdAt: '2023-11-30T14:45:10Z' },
  { id: 6, name: 'شركة الأمل 🚀', status: 'active', memberCount: 3, owner: { email: 'info@amal.example' }, createdAt: '2025-06-01T08:00:00Z' },
  { id: 7, name: 'The Very Long Organisation Name That Somebody Actually Typed Into The Field Because Nobody Validated It And It Keeps Going Well Past Any Reasonable Column Width And Still Has Not Stopped', status: 'inactive', memberCount: 0, owner: { email: 'long@example.com' }, createdAt: '2024-07-19T16:20:00Z' },
  { id: 8, name: 'Initech', status: null, memberCount: null, owner: { email: 'not-an-email' }, createdAt: 'not a date' },
];

const PREFIX = ['Acme', 'Globex', 'Initech', 'Umbra', 'Vertex', 'Soylent', 'Hooli', 'Stark', 'Wayne', 'Wonka', 'Cyber', 'Nano', 'Blue', 'Red', 'Iron', 'Solar', 'Terra', 'Atlas', 'Nova', 'Orbit'];
const SUFFIX = ['Logistics', 'Systems', 'Holdings', 'Group', 'Labs', 'Industries', 'Partners', 'Trading', 'Media', 'Foods', 'Energy', 'Motors', 'Analytics', 'Consulting', 'Retail'];
const STATUSES = ['active', 'active', 'active', 'Active', 'ACTIVE', 'suspended', 'inactive', 'active'];
const TYPOS = ['actve', 'acive', 'suspnded', 'inactiv', ''];
const AR_NAMES = ['شركة النور', 'مؤسسة الأمل', 'مجموعة الفجر', 'شركة الصحراء 🌵'];

// Small deterministic LCG so the fixture never changes between runs.
let state = 20261121;
const rand = () => {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

const usedIds = new Set(seedRows.map((r) => r.id));
const usedNames = new Set(seedRows.map((r) => (r.name || '').toLowerCase()).filter(Boolean));
const rows = [...seedRows];

let nextId = 100;
while (rows.length < 137) {
  const roll = rand();
  const row = {};

  // id: sometimes collide with an existing id (duplicate-id quirk)
  if (roll < 0.05 && rows.length > 10) {
    row.id = pick([...usedIds]);
  } else {
    while (usedIds.has(nextId)) nextId += 1;
    row.id = nextId;
    usedIds.add(nextId);
    nextId += 1;
  }

  // name: mostly fine, sometimes missing, long, RTL, or colliding
  const nameRoll = rand();
  if (nameRoll < 0.07) {
    row.name = rand() < 0.5 ? '' : null;
  } else if (nameRoll < 0.11) {
    row.name = pick(AR_NAMES);
  } else if (nameRoll < 0.14) {
    row.name = `${pick(PREFIX)} ${pick(SUFFIX)} ${'Extremely Long Subsidiary Division '.repeat(3)}${int(1, 99)}`;
  } else {
    let name = `${pick(PREFIX)} ${pick(SUFFIX)}`;
    if (usedNames.has(name.toLowerCase())) name = `${name} ${int(2, 9)}`;
    row.name = name;
    usedNames.add(name.toLowerCase());
  }

  // status: mostly normalised-ish, sometimes hostile
  const statusRoll = rand();
  if (statusRoll < 0.08) {
    row.status = pick(TYPOS) || null;
  } else {
    row.status = pick(STATUSES);
  }

  // memberCount: number, numeric string, negative, or null
  const memberRoll = rand();
  if (memberRoll < 0.06) {
    row.memberCount = String(int(0, 500));
  } else if (memberRoll < 0.1) {
    row.memberCount = int(-25, -1);
  } else if (memberRoll < 0.13) {
    row.memberCount = null;
  } else {
    row.memberCount = int(0, 4000);
  }

  // owner: usually valid, sometimes broken or absent
  const ownerRoll = rand();
  if (ownerRoll < 0.06) {
    row.owner = { email: pick(['not-an-email', 'missing-at.example', 'a@', '@b.example', 'ops@@x.example']) };
  } else if (ownerRoll < 0.09) {
    // missing owner entirely (quirk of record id 3 in the brief)
  } else {
    row.owner = { email: `ops${rows.length}@${pick(PREFIX).toLowerCase()}.example` };
  }

  // createdAt: ISO string, epoch int, or garbage
  const dateRoll = rand();
  if (dateRoll < 0.07) {
    row.createdAt = 1650000000000 + int(0, 60000000);
  } else if (dateRoll < 0.1) {
    row.createdAt = pick(['not a date', '31/02/2024', 'yesterday', '']);
  } else {
    const y = int(2021, 2025);
    const m = String(int(1, 12)).padStart(2, '0');
    const d = String(int(1, 28)).padStart(2, '0');
    row.createdAt = `${y}-${m}-${d}T${String(int(0, 23)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00Z`;
  }

  rows.push(row);
}

process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
