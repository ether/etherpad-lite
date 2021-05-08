'use strict';

const assert = require('assert').strict;
const path = require('path');
const sanitizePathname = require('../../../node/utils/sanitizePathname');

describe(__filename, function () {
  describe('absolute paths rejected', function () {
    const testCases = [
      ['posix', '/'],
      ['posix', '/foo'],
      ['win32', '/'],
      ['win32', '\\'],
      ['win32', 'C:/foo'],
      ['win32', 'C:\\foo'],
      ['win32', 'c:/foo'],
      ['win32', 'c:\\foo'],
      ['win32', '/foo'],
      ['win32', '\\foo'],
    ];
    for (const [platform, p] of testCases) {
      it(`${platform} ${p}`, async function () {
        assert.throws(() => sanitizePathname(p, path[platform]), {message: /absolute path/});
      });
    }
  });
  describe('directory traversal rejected', function () {
    const testCases = [
      ['posix', '..'],
      ['posix', '../'],
      ['posix', '../foo'],
      ['posix', 'foo/../..'],
      ['win32', '..'],
      ['win32', '../'],
      ['win32', '..\\'],
      ['win32', '../foo'],
      ['win32', '..\\foo'],
      ['win32', 'foo/../..'],
      ['win32', 'foo\\..\\..'],
    ];
    for (const [platform, p] of testCases) {
      it(`${platform} ${p}`, async function () {
        assert.throws(() => sanitizePathname(p, path[platform]), {message: /travers/});
      });
    }
  });

  describe('accepted paths', function () {
    const testCases = [
      ['posix', '', '.'],
      ['posix', '.'],
      ['posix', './'],
      ['posix', 'foo'],
      ['posix', 'foo/'],
      ['posix', 'foo/bar/..', 'foo'],
      ['posix', 'foo/bar/../', 'foo/'],
      ['posix', './foo', 'foo'],
      ['posix', 'foo/bar'],
      ['posix', 'foo\\bar'],
      ['posix', '\\foo'],
      ['posix', '..\\foo'],
      ['posix', 'foo/../bar', 'bar'],
      ['posix', 'C:/foo'],
      ['posix', 'C:\\foo'],
      ['win32', '', '.'],
      ['win32', '.'],
      ['win32', './'],
      ['win32', '.\\', './'],
      ['win32', 'foo'],
      ['win32', 'foo/'],
      ['win32', 'foo\\', 'foo/'],
      ['win32', 'foo/bar/..', 'foo'],
      ['win32', 'foo\\bar\\..', 'foo'],
      ['win32', 'foo/bar/../', 'foo/'],
      ['win32', 'foo\\bar\\..\\', 'foo/'],
      ['win32', './foo', 'foo'],
      ['win32', '.\\foo', 'foo'],
      ['win32', 'foo/bar'],
      ['win32', 'foo\\bar', 'foo/bar'],
      ['win32', 'foo/../bar', 'bar'],
      ['win32', 'foo\\..\\bar', 'bar'],
      ['win32', 'foo/..\\bar', 'bar'],
      ['win32', 'foo\\../bar', 'bar'],
    ];
    for (const [platform, p, tcWant] of testCases) {
      const want = tcWant == null ? p : tcWant;
      it(`${platform} ${p || '<empty string>'} -> ${want}`, async function () {
        assert.equal(sanitizePathname(p, path[platform]), want);
      });
    }
  });

  it('default path API', async function () {
    assert.equal(sanitizePathname('foo'), 'foo');
  });
});
