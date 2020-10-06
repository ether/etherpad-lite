function m(mod) {return __dirname + "/../../../src/" + mod;}
const assert = require("assert").strict;
const settings = require(m("node/utils/Settings"));

describe("Pad settings", async () => {
  it('The "getFaviconAddress" function must resolve URL address, If "setting.favicon" is a URL.', async (done) => {
    const favicon =
      "https://developer.mozilla.org/static/img/favicon32.7f3da72dcea1.png";
    const faviconAddress = settings.getFaviconAddress(favicon);
    assert.equal(faviconAddress, favicon);
    done();
  });

  it('The "getFaviconAddress" function must resolve the static file address, if "setting.favicon" is a static path.', async (done) => {
    const favicon = "favicon.ico";
    const faviconAddress = settings.getFaviconAddress(favicon);
    assert.equal(faviconAddress, `/static/${favicon}`);
    done();
  });

  it('The "getFaviconAddress" function must resolve static file address with root depth, if "setting.favicon" is a static path.', async (done) => {
    const favicon = "favicon.ico";
    const depth = "../../";
    const faviconAddress = settings.getFaviconAddress(favicon, depth);
    assert.equal(faviconAddress, `${depth}static/${favicon}`);
    done();
  });
});
