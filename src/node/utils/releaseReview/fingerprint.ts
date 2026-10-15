'use strict';

import {createHash} from 'crypto';

/**
 * Compute a stable fingerprint for a finding.
 *
 * Inputs:
 *   - ruleId: tool rule or AI rule slug
 *   - file:   repo-relative POSIX path (see prepareFinding in aggregate.ts)
 *   - line:   1-indexed line number of the finding
 *   - lines:  full file contents split by '\n'; used to extract a 5-line window
 *             centered on `line` (2 above + the line + 2 below; clamped at edges)
 *
 * Each context line is trimmed of leading/trailing whitespace before hashing,
 * so reformatting noise doesn't break suppression. Identifiers and structure
 * are preserved, so a real logic edit does break it.
 */
export const computeFingerprint = (
  ruleId: string,
  file: string,
  line: number,
  lines: readonly string[],
): string => {
  const idx = line - 1;
  const start = Math.max(0, idx - 2);
  const end = Math.min(lines.length, idx + 3);
  // With no context to hash (missing file, or a line past the end) fall back to
  // the line number, so distinct findings in the same file don't collide.
  const context = start < end
    ? lines.slice(start, end).map((l) => l.trim()).join('\n')
    : `no-context:${line}`;
  const payload = `${ruleId}::${file}::${context}`;
  return createHash('sha256').update(payload).digest('hex');
};
