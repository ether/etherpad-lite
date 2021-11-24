'use strict';

const Changeset = require('../../../static/js/Changeset');

describe('easysync-assembler', function () {
  it('deserialize and serialize', async function () {
    const x = '-c*3*4+6|3=az*asdf0*1*2*3+1=1-1+1*0+1=1-1+1|c=c-1';
    expect(Changeset.serializeOps(Changeset.deserializeOps(x))).to.equal(x);
  });

  it('canonicalizeOps', async function () {
    const x = '-c*3*4+6|3=az*asdf0*1*2*3+1=1-1+1*0+1=1-1+1|c=c-1';
    expect(Changeset.serializeOps(Changeset.canonicalizeOps(Changeset.deserializeOps(x), true)))
        .to.equal(x);
  });

  describe('append atext to assembler', function () {
    const testAppendATextToAssembler = (testId, atext, correctOps) => {
      it(`testAppendATextToAssembler#${testId}`, async function () {
        const serializedOps =
            Changeset.serializeOps(Changeset.canonicalizeOps(Changeset.opsFromAText(atext), false));
        expect(serializedOps).to.equal(correctOps);
      });
    };

    testAppendATextToAssembler(1, {
      text: '\n',
      attribs: '|1+1',
    }, '');
    testAppendATextToAssembler(2, {
      text: '\n\n',
      attribs: '|2+2',
    }, '|1+1');
    testAppendATextToAssembler(3, {
      text: '\n\n',
      attribs: '*x|2+2',
    }, '*x|1+1');
    testAppendATextToAssembler(4, {
      text: '\n\n',
      attribs: '*x|1+1|1+1',
    }, '*x|1+1');
    testAppendATextToAssembler(5, {
      text: 'foo\n',
      attribs: '|1+4',
    }, '+3');
    testAppendATextToAssembler(6, {
      text: '\nfoo\n',
      attribs: '|2+5',
    }, '|1+1+3');
    testAppendATextToAssembler(7, {
      text: '\nfoo\n',
      attribs: '*x|2+5',
    }, '*x|1+1*x+3');
    testAppendATextToAssembler(8, {
      text: '\n\n\nfoo\n',
      attribs: '|2+2*x|2+5',
    }, '|2+2*x|1+1*x+3');
  });
});
