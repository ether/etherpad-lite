'use strict';

const assert = require('assert').strict;
const common = require('../common');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const settings = require('../../../node/utils/Settings');
const superagent = require('superagent');

describe(__filename, function () {
  let agent;
  let backupSettings;
  let skinDir;
  let wantDefaultIcon;
  let wantSkinIcon;

  before(async function () {
    agent = await common.init();
    wantDefaultIcon = await fsp.readFile(path.join(settings.root, 'src', 'static', 'favicon.ico'));
    wantSkinIcon = await fsp.readFile(path.join(__dirname, 'favicon-test-skin.png'));
  });

  beforeEach(async function () {
    backupSettings = {...settings};
    skinDir = await fsp.mkdtemp(path.join(settings.root, 'src', 'static', 'skins', 'test-'));
    settings.skinName = path.basename(skinDir);
  });

  afterEach(async function () {
    delete settings.skinName;
    Object.assign(settings, backupSettings);
    try {
      // TODO: The {recursive: true} option wasn't added to fsp.rmdir() until Node.js v12.10.0 so we
      // can't rely on it until support for Node.js v10 is dropped.
      await fsp.unlink(path.join(skinDir, 'favicon.ico'));
      await fsp.rmdir(skinDir, {recursive: true});
    } catch (err) { /* intentionally ignored */ }
  });

  it('uses skin favicon if present', async function () {
    await fsp.writeFile(path.join(skinDir, 'favicon.ico'), wantSkinIcon);
    const {body: gotIcon} = await agent.get('/favicon.ico')
        .accept('png').buffer(true).parse(superagent.parse.image)
        .expect(200);
    assert(gotIcon.equals(wantSkinIcon));
  });

  it('falls back to default favicon', async function () {
    const {body: gotIcon} = await agent.get('/favicon.ico')
        .accept('png').buffer(true).parse(superagent.parse.image)
        .expect(200);
    assert(gotIcon.equals(wantDefaultIcon));
  });
});
