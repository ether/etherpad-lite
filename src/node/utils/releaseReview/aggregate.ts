'use strict';

import * as path from 'path';
import {computeFingerprint} from './fingerprint';
import {Finding, Severity, Category, SuppressionEntry} from './types';

const SEVERITY_RANK: Record<Severity, number> = {high: 3, medium: 2, low: 1, info: 0};
const CATEGORY_RANK: Record<Category, number> =
  {cve: 4, bug: 3, perf: 2, 'supply-chain': 1, lint: 0};

export const isSeverity = (s: unknown): s is Severity =>
  typeof s === 'string' && Object.prototype.hasOwnProperty.call(SEVERITY_RANK, s);

const meetsFloor = (sev: Severity, floor: Severity): boolean =>
  SEVERITY_RANK[sev] >= SEVERITY_RANK[floor];

// Higher severity wins; on a tie the higher category does, so a merge never
// downgrades a cve to a bug because of the order the sources were read in.
const outranks = (a: Finding, b: Finding): boolean =>
  SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity]
    ? SEVERITY_RANK[a.severity] > SEVERITY_RANK[b.severity]
    : CATEGORY_RANK[a.category] > CATEGORY_RANK[b.category];

/**
 * Turns a raw finding from a tool or subagent into a Finding. The file path is
 * normalised to a repo-relative POSIX path, so the same file always gives the
 * same fingerprint, and the fingerprint is always computed here from the file's
 * current content, never taken from the input. Returns null, without reading
 * anything, when the path is missing or resolves outside repoRoot.
 */
export const prepareFinding = (
  raw: any,
  repoRoot: string,
  readLines: (absPath: string) => string[],
): Finding | null => {
  if (typeof raw?.file !== 'string' || raw.file === '') return null;
  const root = path.resolve(repoRoot);
  const abs = path.resolve(root, raw.file);
  const rel = path.relative(root, abs);
  if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    return null;
  }
  const file = rel.split(path.sep).join('/');
  return {
    ...raw,
    file,
    fingerprint: computeFingerprint(raw.ruleId, file, raw.line, readLines(abs)),
  };
};

/**
 * Merge findings from N sources, applying suppression and severity floor.
 * Dedupe by fingerprint: highest severity, then category, wins; sources are unioned.
 * Sort: severity desc, then category rank desc.
 */
export const aggregate = (
  findingArrays: Finding[][],
  suppression: SuppressionEntry[],
  severityFloor: Severity,
): Finding[] => {
  if (!isSeverity(severityFloor)) {
    throw new Error(`severity floor must be one of ${Object.keys(SEVERITY_RANK).join(', ')}, ` +
        `got ${JSON.stringify(severityFloor)}`);
  }
  const suppressed = new Map<string, SuppressionEntry>();
  for (const e of suppression) suppressed.set(e.fingerprint, e);

  const byFingerprint = new Map<string, Finding>();
  for (const arr of findingArrays) {
    for (const f of arr) {
      const sup = suppressed.get(f.fingerprint);
      if (sup && (sup.status === 'wontfix' || sup.status === 'accepted-risk')) continue;
      if (!meetsFloor(f.severity, severityFloor)) continue;
      const annotated: Finding = sup && sup.status === 'deferred'
        ? {...f, firstSeen: sup.decidedInRun}
        : f;
      const existing = byFingerprint.get(annotated.fingerprint);
      if (!existing) {
        byFingerprint.set(annotated.fingerprint, annotated);
      } else {
        const winner = outranks(annotated, existing) ? annotated : existing;
        const sources = new Set([existing.source, annotated.source].flatMap((s) => s.split(',')));
        byFingerprint.set(annotated.fingerprint, {
          ...winner,
          source: [...sources].join(','),
        });
      }
    }
  }

  return [...byFingerprint.values()].sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;
    return CATEGORY_RANK[b.category] - CATEGORY_RANK[a.category];
  });
};
