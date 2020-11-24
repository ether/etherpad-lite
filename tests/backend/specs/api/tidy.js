const assert = require('assert');
os = require('os'),
fs = require('fs'),
path = require('path'),
TidyHtml = null,
Settings = null;

const npm = require('../../../../src/node_modules/npm/lib/npm.js');
const nodeify = require('../../../../src/node_modules/nodeify');

describe(__filename, function () {
  describe('tidyHtml', function () {
    before(function (done) {
      npm.load({}, (err) => {
        assert.ok(!err);
        TidyHtml = require('../../../../src/node/utils/TidyHtml');
        Settings = require('../../../../src/node/utils/Settings');
        return done();
      });
    });

    function tidy(file, callback) {
      return nodeify(TidyHtml.tidy(file), callback);
    }

    it('Tidies HTML', function (done) {
      // If the user hasn't configured Tidy, we skip this tests as it's required for this test
      if (!Settings.tidyHtml) {
        this.skip();
      }

      // Try to tidy up a bad HTML file
      const tmpDir = os.tmpdir();

      const tmpFile = path.join(tmpDir, `tmp_${Math.floor(Math.random() * 1000000)}.html`);
      fs.writeFileSync(tmpFile, '<html><body><p>a paragraph</p><li>List without outer UL</li>trailing closing p</p></body></html>');
      tidy(tmpFile, (err) => {
        assert.ok(!err);

        // Read the file again
        const cleanedHtml = fs.readFileSync(tmpFile).toString();

        const expectedHtml = [
          '<title></title>',
          '</head>',
          '<body>',
          '<p>a paragraph</p>',
          '<ul>',
          '<li>List without outer UL</li>',
          '<li style="list-style: none">trailing closing p</li>',
          '</ul>',
          '</body>',
          '</html>',
        ].join('\n');
        assert.notStrictEqual(cleanedHtml.indexOf(expectedHtml), -1);
        return done();
      });
    });

    it('can deal with errors', function (done) {
      // If the user hasn't configured Tidy, we skip this tests as it's required for this test
      if (!Settings.tidyHtml) {
        this.skip();
      }

      tidy('/some/none/existing/file.html', (err) => {
        assert.ok(err);
        return done();
      });
    });
  });
});
