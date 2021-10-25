'use strict';

const Changeset = require('../../../static/js/Changeset');
const {randomMultiline, randomTestChangeset, poolOrArray} = require('../easysync-helper.js');

describe('easysync-inverseRandom', function () {
  describe('inverse random', function () {
    const testInverseRandom = (randomSeed) => {
      it(`testInverseRandom#${randomSeed}`, async function () {
        const p = poolOrArray(['apple,', 'apple,true', 'banana,', 'banana,true']);

        const startText = `${randomMultiline(10, 20)}\n`;
        const alines =
            Changeset.splitAttributionLines(Changeset.makeAttribution(startText), startText);
        const lines = startText.slice(0, -1).split('\n').map((s) => `${s}\n`);

        const stylifier = randomTestChangeset(startText, true)[0];

        Changeset.mutateAttributionLines(stylifier, alines, p);
        Changeset.mutateTextLines(stylifier, lines);

        const changeset = randomTestChangeset(lines.join(''), true)[0];
        const inverseChangeset = Changeset.inverse(changeset, lines, alines, p);

        const origLines = lines.slice();
        const origALines = alines.slice();

        Changeset.mutateTextLines(changeset, lines);
        Changeset.mutateAttributionLines(changeset, alines, p);
        Changeset.mutateTextLines(inverseChangeset, lines);
        Changeset.mutateAttributionLines(inverseChangeset, alines, p);
        expect(lines).to.eql(origLines);
        expect(alines).to.eql(origALines);
      });
    };

    for (let i = 0; i < 30; i++) testInverseRandom(i);
  });

  describe('inverse', function () {
    const testInverse = (testId, cs, lines, alines, pool, correctOutput) => {
      it(`testInverse#${testId}`, async function () {
        pool = poolOrArray(pool);
        Changeset.unpack(cs).validate();
        const str = Changeset.inverse(cs, lines, alines, pool);
        expect(str).to.equal(correctOutput);
      });
    };

    // take "FFFFTTTTT" and apply "-FT--FFTT", the inverse of which is "--F--TT--"
    testInverse(1, 'Z:9>0=1*0=1*1=1=2*0=2*1|1=2$', null,
        ['+4*1+5'], ['bold,', 'bold,true'], 'Z:9>0=2*0=1=2*1=2$');
  });
});
