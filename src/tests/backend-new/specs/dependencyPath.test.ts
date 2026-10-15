'use strict';

import os from 'os';
import path from 'path';
import {describe, expect, it} from 'vitest';
import {
  isValidDependencyName,
  resolveDependencyPath,
} from '../../../static/js/pluginfw/dependencyPath';

describe('resolveDependencyPath', () => {
  const base = path.join(os.tmpdir(), 'ep-base');

  it('accepts plain and scoped npm names', () => {
    expect(resolveDependencyPath(base, 'ep_align')).toBe(path.join(base, 'ep_align'));
    expect(resolveDependencyPath(base, '@scope/pkg')).toBe(path.join(base, '@scope', 'pkg'));
  });

  it('rejects traversal, absolute and malformed names', () => {
    for (const bad of [
      'zzz/../../../../tmp/victim',
      '../victim',
      '..',
      '.',
      '',
      '/etc',
      'a/b',
      'a\\..\\b',
      '@scope/../x',
      '.hidden',
      '@scope/.x',
      null,
      undefined,
      42,
    ]) {
      expect(isValidDependencyName(bad), String(bad)).toBe(false);
      expect(resolveDependencyPath(base, bad), String(bad)).toBeNull();
    }
  });
});
