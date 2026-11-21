/** Shapes of the messy fixture rows exactly as the "API" returns them. */
export interface RawOrganisation {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  memberCount?: unknown;
  owner?: { email?: unknown } | null;
  createdAt?: unknown;
}

export type OrgStatus = 'active' | 'suspended' | 'inactive' | 'unknown';

export const ORG_STATUSES: readonly OrgStatus[] = ['active', 'suspended', 'inactive', 'unknown'];

export type QualityCode =
  | 'missing-name'
  | 'duplicate-id'
  | 'unknown-status'
  | 'coerced-member-count'
  | 'invalid-member-count'
  | 'missing-owner'
  | 'invalid-email'
  | 'coerced-date'
  | 'invalid-date';

export interface QualityFlag {
  code: QualityCode;
  /** i18n key describing the flag for humans. */
  messageKey: string;
}

/** A row after normalisation: everything the view needs, plus how it got there. */
export interface Organisation {
  /** Stable per-row key. Raw ids collide, so they cannot be the row key. */
  key: string;
  id: number | null;
  name: string | null;
  status: OrgStatus;
  memberCount: number | null;
  ownerEmail: string | null;
  ownerEmailValid: boolean;
  createdAt: Date | null;
  /** Original createdAt value as text, shown when it could not be parsed. */
  rawCreatedAt: string;
  flags: QualityFlag[];
}
