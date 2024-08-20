'use strict';

import {MapArrayType} from "../../../node/types/MapType";

const assert = require('assert').strict;
const common = require('../common');
import {mkdtempSync, readFile, readFileSync} from 'fs';
import {rmSync, unlinkSync} from "node:fs";


const path = require('path');
const settings = require('../../../node/utils/Settings');
const superagent = require('superagent');

describe(__filename, function () {
  let agent:any;
  let backupSettings:MapArrayType<any>;
  let skinDir: string;
  let wantCustomIcon: Buffer;
  let wantDefaultIcon: Buffer;
  let wantSkinIcon: Buffer;

  before(async function () {
    agent = await common.init();
    wantCustomIcon = readFileSync(path.join(__dirname, 'favicon-test-custom.png'));
    wantDefaultIcon = readFileSync(path.join(settings.root, 'src', 'static', 'favicon.ico'));
    wantSkinIcon = readFileSync(path.join(__dirname, 'favicon-test-skin.png'));
  });

  beforeEach(async function () {
    backupSettings = {...settings};
    skinDir = mkdtempSync(path.join(settings.root, 'src', 'static', 'skins', 'test-'));
    settings.skinName = path.basename(skinDir);
  });

  afterEach(async function () {
    delete settings.favicon;
    delete settings.skinName;
    Object.assign(settings, backupSettings);
    try {
      unlinkSync(path.join(skinDir, 'favicon.ico'));
      rmSync(skinDir, {recursive: true});
    } catch (err) { /* intentionally ignored */ }
  });

  it('uses custom favicon if set (relative pathname)', async function () {
    settings.favicon =
        path.relative(settings.root, path.join(__dirname, 'favicon-test-custom.png'));
    assert(!path.isAbsolute(settings.favicon));
    const {body: gotIcon} = await agent.get('/favicon.ico')
        .accept('png').buffer(true).parse(superagent.parse.image)
        .expect(200);
    assert(gotIcon.equals(wantCustomIcon));
  });

  it('uses custom favicon from url', async function () {
    settings.favicon = 'https://etherpad.org/favicon.ico';
    await agent.get('/favicon.ico')
        .expect(302);
  });

  it('uses custom favicon if set (absolute pathname)', async function () {
    settings.favicon = path.join(__dirname, 'favicon-test-custom.png');
    assert(path.isAbsolute(settings.favicon));
    const {body: gotIcon} = await agent.get('/favicon.ico')
        .accept('png').buffer(true).parse(superagent.parse.image)
        .expect(200);
    assert(gotIcon.equals(wantCustomIcon));
  });

  it('falls back if custom favicon is missing', async function () {
    // The previous default for settings.favicon was 'favicon.ico', so many users will continue to
    // have that in their settings.json for a long time. There is unlikely to be a favicon at
    // path.resolve(settings.root, 'favicon.ico'), so this test ensures that 'favicon.ico' won't be
    // a problem for those users.
    settings.favicon = 'favicon.ico';
    const {body: gotIcon} = await agent.get('/favicon.ico')
        .accept('png').buffer(true).parse(superagent.parse.image)
        .expect(200);
    assert(gotIcon.equals(wantDefaultIcon));
  });

  it('uses skin favicon if present', async function () {
    await fsp.writeFile(path.join(skinDir, 'favicon.ico'), wantSkinIcon);
    settings.favicon = null;
    const {body: gotIcon} = await agent.get('/favicon.ico')
        .accept('png').buffer(true).parse(superagent.parse.image)
        .expect(200);
    assert(gotIcon.equals(wantSkinIcon));
  });

  it('falls back to default favicon', async function () {
    settings.favicon = null;
    const {body: gotIcon} = await agent.get('/favicon.ico')
        .accept('png').buffer(true).parse(superagent.parse.image)
        .expect(200);
    assert(gotIcon.equals(wantDefaultIcon));
  });
});
