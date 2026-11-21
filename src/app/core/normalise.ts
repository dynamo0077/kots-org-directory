import { Organisation, OrgStatus, QualityCode, QualityFlag, RawOrganisation } from './models';

const QUALITY_KEY: Record<QualityCode, string> = {
  'missing-name': 'quality.missingName',
  'duplicate-id': 'quality.duplicateId',
  'unknown-status': 'quality.unknownStatus',
  'coerced-member-count': 'quality.coercedMemberCount',
  'invalid-member-count': 'quality.invalidMemberCount',
  'missing-owner': 'quality.missingOwner',
  'invalid-email': 'quality.invalidEmail',
  'coerced-date': 'quality.coercedDate',
  'invalid-date': 'quality.invalidDate',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function flag(code: QualityCode): QualityFlag {
  return { code, messageKey: QUALITY_KEY[code] };
}

function normaliseStatus(value: unknown, flags: QualityFlag[]): OrgStatus {
  if (typeof value === 'string') {
    const cleaned = value.trim().toLowerCase();
    if (cleaned === 'active' || cleaned === 'suspended' || cleaned === 'inactive') {
      return cleaned;
    }
  }
  flags.push(flag('unknown-status'));
  return 'unknown';
}

function normaliseMemberCount(value: unknown, flags: QualityFlag[]): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    flags.push(flag('coerced-member-count'));
    return Number.parseInt(value.trim(), 10);
  }
  if (value === null || value === undefined) {
    return null;
  }
  flags.push(flag('invalid-member-count'));
  return null;
}

function normaliseName(value: unknown, flags: QualityFlag[]): string | null {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  flags.push(flag('missing-name'));
  return null;
}

function normaliseOwner(raw: RawOrganisation, flags: QualityFlag[]): {
  email: string | null;
  valid: boolean;
} {
  const email = raw.owner?.email;
  if (typeof email !== 'string' || email.trim() === '') {
    flags.push(flag('missing-owner'));
    return { email: null, valid: false };
  }
  const trimmed = email.trim();
  const valid = EMAIL_RE.test(trimmed);
  if (!valid) {
    flags.push(flag('invalid-email'));
  }
  return { email: trimmed, valid };
}

function normaliseCreatedAt(value: unknown, flags: QualityFlag[]): {
  date: Date | null;
  raw: string;
} {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      flags.push(flag('coerced-date'));
      return { date, raw: String(value) };
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return { date: parsed, raw: value };
    }
    return { date: null, raw: value };
  }
  flags.push(flag('invalid-date'));
  return { date: null, raw: value === null || value === undefined ? '' : String(value) };
}

/**
 * Normalises the raw fixture rows without cleaning the data away:
 * bad values are surfaced through `flags`, never silently dropped.
 */
export function normaliseOrganisations(raws: readonly RawOrganisation[]): Organisation[] {
  const idCounts = new Map<number, number>();
  for (const raw of raws) {
    if (typeof raw.id === 'number') {
      idCounts.set(raw.id, (idCounts.get(raw.id) ?? 0) + 1);
    }
  }

  return raws.map((raw, index) => {
    const flags: QualityFlag[] = [];

    const id = typeof raw.id === 'number' ? raw.id : null;
    if (id !== null && (idCounts.get(id) ?? 0) > 1) {
      flags.push(flag('duplicate-id'));
    }

    const name = normaliseName(raw.name, flags);
    const status = normaliseStatus(raw.status, flags);
    const memberCount = normaliseMemberCount(raw.memberCount, flags);
    const owner = normaliseOwner(raw, flags);
    const created = normaliseCreatedAt(raw.createdAt, flags);

    return {
      key: `row-${index}`,
      id,
      name,
      status,
      memberCount,
      ownerEmail: owner.email,
      ownerEmailValid: owner.valid,
      createdAt: created.date,
      rawCreatedAt: created.raw,
      flags,
    };
  });
}
