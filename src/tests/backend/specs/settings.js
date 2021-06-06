'use strict';

const assert = require('assert').strict;
const {parseSettings} = require('../../../node/utils/Settings').exportedForTestingOnly;
const path = require('path');
const process = require('process');

describe(__filename, function () {
  describe('parseSettings', function () {
    let settings;
    const envVarSubstTestCases = [
      {name: 'true', val: 'true', var: 'SET_VAR_TRUE', want: true},
      {name: 'false', val: 'false', var: 'SET_VAR_FALSE', want: false},
      {name: 'null', val: 'null', var: 'SET_VAR_NULL', want: null},
      {name: 'undefined', val: 'undefined', var: 'SET_VAR_UNDEFINED', want: undefined},
      {name: 'number', val: '123', var: 'SET_VAR_NUMBER', want: 123},
      {name: 'string', val: 'foo', var: 'SET_VAR_STRING', want: 'foo'},
      {name: 'empty string', val: '', var: 'SET_VAR_EMPTY_STRING', want: ''},
    ];

    before(async function () {
      for (const tc of envVarSubstTestCases) process.env[tc.var] = tc.val;
      delete process.env.UNSET_VAR;
      settings = parseSettings(path.join(__dirname, 'settings.json'), true);
      assert(settings != null);
    });

    describe('environment variable substitution', function () {
      describe('set', function () {
        for (const tc of envVarSubstTestCases) {
          it(tc.name, async function () {
            const obj = settings['environment variable substitution'].set;
            if (tc.name === 'undefined') {
              assert(!(tc.name in obj));
            } else {
              assert.equal(obj[tc.name], tc.want);
            }
          });
        }
      });

      describe('unset', function () {
        it('no default', async function () {
          const obj = settings['environment variable substitution'].unset;
          assert.equal(obj['no default'], null);
        });

        for (const tc of envVarSubstTestCases) {
          it(tc.name, async function () {
            const obj = settings['environment variable substitution'].unset;
            if (tc.name === 'undefined') {
              assert(!(tc.name in obj));
            } else {
              assert.equal(obj[tc.name], tc.want);
            }
          });
        }
      });
    });
  });
});
