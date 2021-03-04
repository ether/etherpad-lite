let settings
const assert = require('assert').strict;
const argv = require('../../../node/utils/Cli').argv;
const fs = require('fs');
const TEST_SETTINGS_FILE = 'settings.js.test'

// Set the content of the settings file to be loaded by the settings module
function setSettingsFile(testSettings) {
  fs.writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(testSettings));
  argv.settings = 'src/' + TEST_SETTINGS_FILE
}

function setEmptySettingsFile() {
  // It won't accept a totally empty file so we make an irrelevant dummy field
  fs.writeFileSync(TEST_SETTINGS_FILE, JSON.stringify({irrelevant_dummy_field: null}));
  argv.settings = 'src/' + TEST_SETTINGS_FILE
}

// Don't trust settings.reloadSettings(), since we're testing it in the
// first place. Make sure that any mistakes here don't mess up other tests.
function reloadSettingsModule() {
  delete require.cache[require.resolve('../../../node/utils/Settings')]
  settings = require('../../../node/utils/Settings');
}

describe(__filename, function () {
  this.timeout(200);

  let originalSettingsFile

  before(async function () {
    originalSettingsFile = argv.settings
  })

  beforeEach(async function () {
    // Start from scratch each time
    reloadSettingsModule()
  })

  after(async function () {
    // after all the tests make sure we're back to normal
    argv.settings = originalSettingsFile
    reloadSettingsModule()
  })

  describe('hard-coded defaults are set', function () {
    it('for individual values', async function () {
      setEmptySettingsFile()
      settings.reloadSettings()
      assert.equal(settings.loglevel, 'INFO')
    })

    it('for arrays', async function () {
      setEmptySettingsFile()
      settings.reloadSettings()
      assert.deepEqual(settings.socketTransportProtocols, ['xhr-polling', 'jsonp-polling', 'htmlfile'])
    })

    it('for objects', async function () {
      setEmptySettingsFile()
      settings.reloadSettings()
      assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90000, max: 10})
    })
  })


  // `reloadSettings` is used in the admin panel, wherein the user can change the settings file
  // and reload to actiate the new settings. It has had some strange issues related to removing
  // values, or objects within values. These tests aim to test various such scenarios.
  describe('reloadSettings', function () {
    describe('sets and updates the settings', function () {
      it('for individual values', async function () {
        setSettingsFile({loglevel: 'WARNING'})
        settings.reloadSettings()
        assert.equal(settings.loglevel, 'WARNING')
        setSettingsFile({loglevel: 'ERROR'})
        settings.reloadSettings()
        assert.equal(settings.loglevel, 'ERROR')
      })
      it('for arrays', async function () {
        setSettingsFile({socketTransportProtocols: ['a', 'b', 'c']})
        settings.reloadSettings()
        assert.deepEqual(settings.socketTransportProtocols, ['a', 'b', 'c'])
        setSettingsFile({socketTransportProtocols: ['x', 'y', 'z']})
        settings.reloadSettings()
        assert.deepEqual(settings.socketTransportProtocols, ['x', 'y', 'z'])
      })
      it('for objects', async function () {
        // setting only one fields
        setSettingsFile({importExportRateLimiting: {max: 11}})
        settings.reloadSettings()
        assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90000, max: 11})

        // setting the same field again
        setSettingsFile({importExportRateLimiting: {max: 12}})
        settings.reloadSettings()
        assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90000, max: 12})

        // setting both fields, twice
        setSettingsFile({importExportRateLimiting: {windowMs: 90003, max: 13}})
        settings.reloadSettings()
        assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90003, max: 13})
        setSettingsFile({importExportRateLimiting: {windowMs: 90004, max: 14}})
        settings.reloadSettings()
        assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90004, max: 14})
      })
    })

    describe('returns setting fields and subfields to default values after removal from settings file', function () {
      it('when setting individual value', async function () {
        setSettingsFile({loglevel: 'WARNING'})
        settings.reloadSettings()
        assert.equal(settings.loglevel, 'WARNING')

        setEmptySettingsFile()
        settings.reloadSettings()
        assert.equal(settings.loglevel, 'INFO') // The hard-coded default
      })

      it('when setting an array', async function () {
        setSettingsFile({socketTransportProtocols: ['a', 'b', 'c']})
        settings.reloadSettings()
        assert.deepEqual(settings.socketTransportProtocols, ['a', 'b', 'c'])

        setEmptySettingsFile()
        settings.reloadSettings()
        assert.deepEqual(settings.socketTransportProtocols, ['xhr-polling', 'jsonp-polling', 'htmlfile'])
      })

      it('when changing all fields of an object with specified fields', async function () {
        // Set both fields
        setSettingsFile({importExportRateLimiting: {windowMs: 90001, max: 11}})
        settings.reloadSettings()
        assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90001, max: 11})

        // Set only one field
        setSettingsFile({importExportRateLimiting: {max: 11}})
        settings.reloadSettings()
        assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90000, max: 11})

        // Set only the other field
        setSettingsFile({importExportRateLimiting: {windowMs: 90001}})
        settings.reloadSettings()
        assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90001, max: 10})

        setEmptySettingsFile()
        settings.reloadSettings()
        assert.deepEqual(settings.importExportRateLimiting, {windowMs: 90000, max: 10})
      })

      it('when setting an object that is empty by default', async function () {
        setSettingsFile({users: {user_1: {password: 'password_1'}, user_2: {password: 'password_2'}}})
        settings.reloadSettings()
        assert.deepEqual(settings.users, {user_1: {password: 'password_1'}, user_2: {password: 'password_2'}})

        // Remove a field from the object; make sure it goes away
        setSettingsFile({users: {user_1: {password: 'password_1'}}})
        settings.reloadSettings()
        assert.deepEqual(settings.users, {user_1: {password: 'password_1'}})

        // Change to a different field; make sure the old one goes away
        setSettingsFile({users: {user_3: {password: 'password_3'}}})
        settings.reloadSettings()
        assert.deepEqual(settings.users, {user_3: {password: 'password_3'}})

        // Change a sub-field; make sure the old one goes away
        setSettingsFile({users: {user_3: {is_admin: false}}})
        settings.reloadSettings()
        assert.deepEqual(settings.users, {user_3: {is_admin: false}})

        setEmptySettingsFile()
        settings.reloadSettings()
        assert.deepEqual(settings.users, {})
      })

      // I think this should also be empty by default
      it('when setting an object that represents plugin settings', async function () {
        setSettingsFile({ep_example: {key_1: {subkey_1: 'val_1'}, key_2: {subkey_1: 'val_1'}}})
        settings.reloadSettings()
        assert.deepEqual(settings.ep_example, {key_1: {subkey_1: 'val_1'}, key_2: {subkey_1: 'val_1'}})

        // Remove a field from the object; make sure it goes away
        setSettingsFile({ep_example: {key_1: {subkey_1: 'val_1'}}})
        settings.reloadSettings()
        assert.deepEqual(settings.ep_example, {key_1: {subkey_1: 'val_1'}})

        // Change to a different field; make sure the old one goes away
        setSettingsFile({ep_example: {key_2: {subkey_1: 'val_1'}}})
        settings.reloadSettings()
        assert.deepEqual(settings.ep_example, {key_2: {subkey_1: 'val_1'}})

        // Change a sub-field; make sure the old one goes away
        setSettingsFile({ep_example: {key_2: {subkey_2: 'val_1'}}})
        settings.reloadSettings()
        assert.deepEqual(settings.ep_example, {key_2: {subkey_2: 'val_1'}})

        setEmptySettingsFile()
        settings.reloadSettings()
        assert.deepEqual(settings.ep_example, undefined)
      })
    })

    // TO TEST
    //
    // Array stuff? _.defaults?
    // Unknown setting - warning, gets ignored
    // ep_ settiing - i feel like there was something special about how the innards of this behaved. not just the struct itself.
    //
    // TODO - go through setDefaults, and maybe some others,
    // and make a note to test all edge cases and other things I could test
    //
    // TODO - reducing existing objects, particularly the ep_ ones, reducing lists
  });
});
