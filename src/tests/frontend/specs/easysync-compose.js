'use strict';

const Changeset = require('../../../static/js/Changeset');
const AttributePool = require('../../../static/js/AttributePool');
const {randomMultiline, randomTestChangeset} = require('../easysync-helper.js');

describe('easysync-compose', function () {
  describe('compose', function () {
    const testCompose = (randomSeed) => {
      it(`testCompose#${randomSeed}`, async function () {
        const p = new AttributePool();

        const startText = `${randomMultiline(10, 20)}\n`;

        const x1 = randomTestChangeset(startText);
        const change1 = x1[0];
        const text1 = x1[1];

        const x2 = randomTestChangeset(text1);
        const change2 = x2[0];
        const text2 = x2[1];

        const x3 = randomTestChangeset(text2);
        const change3 = x3[0];
        const text3 = x3[1];

        const change12 = Changeset.compose(change1, change2, p);
        Changeset.unpack(change12).validate();
        const change23 = Changeset.compose(change2, change3, p);
        Changeset.unpack(change23).validate();
        const change123 = Changeset.compose(change12, change3, p);
        Changeset.unpack(change123).validate();
        const change123a = Changeset.compose(change1, change23, p);
        Changeset.unpack(change123a).validate();
        expect(change123a).to.equal(change123);

        expect(Changeset.applyToText(change12, startText)).to.equal(text2);
        expect(Changeset.applyToText(change23, text1)).to.equal(text3);
        expect(Changeset.applyToText(change123, startText)).to.equal(text3);
      });
    };

    for (let i = 0; i < 30; i++) testCompose(i);
  });

  describe('compose attributes', function () {
    it('simpleComposeAttributesTest', async function () {
      const p = new AttributePool();
      p.putAttrib(['bold', '']);
      p.putAttrib(['bold', 'true']);
      const cs1 = 'Z:2>1*1+1*1=1$x';
      Changeset.unpack(cs1).validate();
      const cs2 = 'Z:3>0*0|1=3$';
      Changeset.unpack(cs2).validate();
      const cs12 = Changeset.compose(cs1, cs2, p);
      Changeset.unpack(cs12).validate();
      expect(cs12).to.equal('Z:2>1+1*0|1=2$x');
    });
  });
});
