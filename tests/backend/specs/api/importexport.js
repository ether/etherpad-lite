'use strict';
/*
 * ACHTUNG: there is a copied & modified version of this file in
 * <basedir>/tests/container/spacs/api/pad.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

/* eslint-disable max-len */

const common = require('../../common');
const supertest = require(`${__dirname}/../../../../src/node_modules/supertest`);
const settings = require(`${__dirname}/../../../../tests/container/loadSettings.js`).loadSettings();
const api = supertest(`http://${settings.ip}:${settings.port}`);

const apiKey = common.apiKey;
const apiVersion = 1;

const testImports = {
  'malformed': {
    input: '<html><body><li>wtf</ul></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>wtf<br><br></body></html>',
    expectedText: 'wtf\n\n',
  },
  'nonelistiteminlist #3620': {
    input: '<html><body><ul>test<li>FOO</li></ul></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ul class="bullet">test<li>FOO</ul><br></body></html>',
    expectedText: '\ttest\n\t* FOO\n\n',
  },
  'whitespaceinlist #3620': {
    input: '<html><body><ul> <li>FOO</li></ul></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ul class="bullet"><li>FOO</ul><br></body></html>',
    expectedText: '\t* FOO\n\n',
  },
  'prefixcorrectlinenumber': {
    input: '<html><body><ol><li>should be 1</li><li>should be 2</li></ol></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ol start="1" class="number"><li>should be 1</li><li>should be 2</ol><br></body></html>',
    expectedText: '\t1. should be 1\n\t2. should be 2\n\n',
  },
  'prefixcorrectlinenumbernested': {
    input: '<html><body><ol><li>should be 1</li><ol><li>foo</li></ol><li>should be 2</li></ol></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ol start="1" class="number"><li>should be 1<ol start="2" class="number"><li>foo</ol><li>should be 2</ol><br></body></html>',
    expectedText: '\t1. should be 1\n\t\t1.1. foo\n\t2. should be 2\n\n',
  },

  /*
  "prefixcorrectlinenumber when introduced none list item - currently not supported see #3450":{
    input: '<html><body><ol><li>should be 1</li>test<li>should be 2</li></ol></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ol start="1" class="number"><li>should be 1</li>test<li>should be 2</li></ol><br></body></html>',
    expectedText: '\t1. should be 1\n\ttest\n\t2. should be 2\n\n'
  }
  ,
  "newlinesshouldntresetlinenumber #2194":{
    input: '<html><body><ol><li>should be 1</li>test<li>should be 2</li></ol></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ol class="number"><li>should be 1</li>test<li>should be 2</li></ol><br></body></html>',
    expectedText: '\t1. should be 1\n\ttest\n\t2. should be 2\n\n'
  }
  */
  'ignoreAnyTagsOutsideBody': {
    description: 'Content outside body should be ignored',
    input: '<html><head><title>title</title><style></style></head><body>empty<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>empty<br><br></body></html>',
    expectedText: 'empty\n\n',
  },
  'indentedListsAreNotBullets': {
    description: 'Indented lists are represented with tabs and without bullets',
    input: '<html><body><ul class="indent"><li>indent</li><li>indent</ul></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><ul class="indent"><li>indent</li><li>indent</ul><br></body></html>',
    expectedText: '\tindent\n\tindent\n\n'
  },
  lineWithMultipleSpaces: {
    description: 'Multiple spaces should be collapsed',
    input: '<html><body>Text with  more   than    one space.<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>Text with more than one space.<br><br></body></html>',
    expectedText: 'Text with more than one space.\n\n'
  },
  lineWithMultipleNonBreakingAndNormalSpaces: {
    // XXX the HTML between "than" and "one" looks strange
    description: 'non-breaking space should be preserved, but can be replaced when it',
    input: '<html><body>Text&nbsp;with&nbsp; more&nbsp;&nbsp;&nbsp;than   &nbsp;one space.<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>Text with&nbsp; more&nbsp;&nbsp; than&nbsp; one space.<br><br></body></html>',
    expectedText: 'Text with  more   than  one space.\n\n'
  },
  multiplenbsp: {
    description: 'Multiple non-breaking space should be preserved',
    input: '<html><body>&nbsp;&nbsp;<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>&nbsp;&nbsp;<br><br></body></html>',
    expectedText: '  \n\n'
  },
  multipleNonBreakingSpaceBetweenWords: {
    description: 'A normal space is always inserted before a word',
    input: '<html><body>&nbsp;&nbsp;word1&nbsp;&nbsp;word2&nbsp;&nbsp;&nbsp;word3<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>&nbsp; word1&nbsp; word2&nbsp;&nbsp; word3<br><br></body></html>',
    expectedText: '  word1  word2   word3\n\n'
  },
  nonBreakingSpacePreceededBySpaceBetweenWords: {
    description: 'A non-breaking space preceeded by a normal space',
    input: '<html><body> &nbsp;word1 &nbsp;word2 &nbsp;word3<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>&nbsp;word1&nbsp; word2&nbsp; word3<br><br></body></html>',
    expectedText: ' word1  word2  word3\n\n'
  },
  nonBreakingSpaceFollowededBySpaceBetweenWords: {
    description: 'A non-breaking space followed by a normal space',
    input: '<html><body>&nbsp; word1&nbsp; word2&nbsp; word3<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>&nbsp; word1&nbsp; word2&nbsp; word3<br><br></body></html>',
    expectedText: '  word1  word2  word3\n\n'
  },
  spacesAfterNewline: {
    description: 'Collapse spaces that follow a newline',
    input:'<!doctype html><html><body>something<br>             something<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>something<br>something<br><br></body></html>',
    expectedText: 'something\nsomething\n\n'
  },
  spacesAfterNewlineP: {
    description: 'Collapse spaces that follow a paragraph',
    input:'<!doctype html><html><body>something<p></p>             something<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>something<br><br>something<br><br></body></html>',
    expectedText: 'something\n\nsomething\n\n'
  },
  spacesAtEndOfLine: {
    description: 'Collapse spaces that preceed/follow a newline',
    input:'<html><body>something            <br>             something<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>something<br>something<br><br></body></html>',
    expectedText: 'something\nsomething\n\n'
  },
  spacesAtEndOfLineP: {
    description: 'Collapse spaces that preceed/follow a paragraph',
    input:'<html><body>something            <p></p>             something<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>something<br><br>something<br><br></body></html>',
    expectedText: 'something\n\nsomething\n\n'
  },
  nonBreakingSpacesAfterNewlines: {
    description: 'Don\'t collapse non-breaking spaces that follow a newline',
    input:'<html><body>something<br>&nbsp;&nbsp;&nbsp;something<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>something<br>&nbsp;&nbsp; something<br><br></body></html>',
    expectedText: 'something\n   something\n\n'
  },
  nonBreakingSpacesAfterNewlinesP: {
    description: 'Don\'t collapse non-breaking spaces that follow a paragraph',
    input:'<html><body>something<p></p>&nbsp;&nbsp;&nbsp;something<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>something<br><br>&nbsp;&nbsp; something<br><br></body></html>',
    expectedText: 'something\n\n   something\n\n'
  },
  collapseSpacesInsideElements: {
    description: 'Preserve only one space when multiple are present',
    input: '<html><body>Need <span> more </span> space<i>  s </i> !<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>Need more space<em> s </em>!<br><br></body></html>',
    expectedText: 'Need more space s !\n\n'
  },
  collapseSpacesAcrossNewlines: {
    description: 'Newlines and multiple spaces across newlines should be collapsed',
    input: `
      <html><body>Need
          <span> more </span>
          space
          <i>  s </i>
          !<br></body></html>`,
    expectedHTML: '<!DOCTYPE HTML><html><body>Need more space <em>s </em>!<br><br></body></html>',
    expectedText: 'Need more space s !\n\n'
  },
  multipleNewLinesAtBeginning: {
    description: 'Multiple new lines and paragraphs at the beginning should be preserved',
    input: '<html><body><br><br><p></p><p></p>first line<br><br>second line<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body><br><br><br><br>first line<br><br>second line<br><br></body></html>',
    expectedText: '\n\n\n\nfirst line\n\nsecond line\n\n'
  },
  multiLineParagraph:{
    description: "A paragraph with multiple lines should not loose spaces when lines are combined",
    input:`<html><body>
    <p>
      а б в г ґ д е є ж з и і ї й к л м н о
      п р с т у ф х ц ч ш щ ю я ь
    </p>
</body></html>`,
    expectedHTML: '<!DOCTYPE HTML><html><body>&#1072; &#1073; &#1074; &#1075; &#1169; &#1076; &#1077; &#1108; &#1078; &#1079; &#1080; &#1110; &#1111; &#1081; &#1082; &#1083; &#1084; &#1085; &#1086; &#1087; &#1088; &#1089; &#1090; &#1091; &#1092; &#1093; &#1094; &#1095; &#1096; &#1097; &#1102; &#1103; &#1100;<br><br></body></html>',
    expectedText: 'а б в г ґ д е є ж з и і ї й к л м н о п р с т у ф х ц ч ш щ ю я ь\n\n'
  },
  multiLineParagraphWithPre:{
    //XXX why is there &nbsp; before "in"?
    description: "lines in preformatted text should be kept intact",
    input:`<html><body>
    <p>
        а б в г ґ д е є ж з и і ї й к л м н о<pre>multiple
   lines
 in
      pre
</pre></p><p>п р с т у ф х ц ч ш щ ю я
ь</p>
</body></html>`,
    expectedHTML: '<!DOCTYPE HTML><html><body>&#1072; &#1073; &#1074; &#1075; &#1169; &#1076; &#1077; &#1108; &#1078; &#1079; &#1080; &#1110; &#1111; &#1081; &#1082; &#1083; &#1084; &#1085; &#1086;<br>multiple<br>&nbsp;&nbsp; lines<br>&nbsp;in<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; pre<br><br>&#1087; &#1088; &#1089; &#1090; &#1091; &#1092; &#1093; &#1094; &#1095; &#1096; &#1097; &#1102; &#1103; &#1100;<br><br></body></html>',
    expectedText: 'а б в г ґ д е є ж з и і ї й к л м н о\nmultiple\n   lines\n in\n      pre\n\nп р с т у ф х ц ч ш щ ю я ь\n\n'
  },
  preIntroducesASpace: {
    description: "pre should be on a new line not preceeded by a space",
    input:`<html><body><p>
    1
<pre>preline
</pre></p></body></html>`,
    expectedHTML: '<!DOCTYPE HTML><html><body>1<br>preline<br><br><br></body></html>',
    expectedText: '1\npreline\n\n\n'
  },
  dontDeleteSpaceInsideElements: {
    description: 'Preserve spaces inside elements',
    input: '<html><body>Need<span> more </span>space<i> s </i>!<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>Need more space<em> s </em>!<br><br></body></html>',
    expectedText: 'Need more space s !\n\n'
  },
  dontDeleteSpaceOutsideElements: {
    description: 'Preserve spaces outside elements',
    input: '<html><body>Need <span>more</span> space <i>s</i> !<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>Need more space <em>s</em> !<br><br></body></html>',
    expectedText: 'Need more space s !\n\n'
  },
  dontDeleteSpaceAtEndOfElement: {
    description: 'Preserve spaces at the end of an element',
    input: '<html><body>Need <span>more </span>space <i>s </i>!<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>Need more space <em>s </em>!<br><br></body></html>',
    expectedText: 'Need more space s !\n\n'
  },
  dontDeleteSpaceAtBeginOfElements: {
    description: 'Preserve spaces at the start of an element',
    input: '<html><body>Need<span> more</span> space<i> s</i> !<br></body></html>',
    expectedHTML: '<!DOCTYPE HTML><html><body>Need more space<em> s</em> !<br><br></body></html>',
    expectedText: 'Need more space s !\n\n'
  },
};

describe(__filename, function () {
  Object.keys(testImports).forEach((testName) => {
    const testPadId = makeid();
    const test = testImports[testName];
    if (test.disabled) {
      return xit(`DISABLED: ${testName}`, function (done) {
        done();
      });
    }
    describe(`createPad ${testName}`, function () {
      it('creates a new Pad', function (done) {
        api.get(`${endPoint('createPad')}&padID=${testPadId}`)
            .expect((res) => {
              if (res.body.code !== 0) throw new Error('Unable to create new Pad');
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });

    describe(`setHTML ${testName}`, function () {
      it('Sets the HTML', function (done) {
        api.get(`${endPoint('setHTML')}&padID=${testPadId}&html=${encodeURIComponent(test.input)}`)
            .expect((res) => {
              if (res.body.code !== 0) throw new Error(`Error:${testName}`);
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });

    describe(`getHTML ${testName}`, function () {
      it('Gets back the HTML of a Pad', function (done) {
        api.get(`${endPoint('getHTML')}&padID=${testPadId}`)
            .expect((res) => {
              const receivedHtml = res.body.data.html;
              if (receivedHtml !== test.expectedHTML) {
                throw new Error(`HTML received from export is not the one we were expecting.
             Test Name:
             ${testName}

             Received:
             ${JSON.stringify(receivedHtml)}

             Expected:
             ${JSON.stringify(test.expectedHTML)}

             Which is a different version of the originally imported one:
             ${test.input}`);
              }
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });

    describe(`getText ${testName}`, function () {
      it('Gets back the Text of a Pad', function (done) {
        api.get(`${endPoint('getText')}&padID=${testPadId}`)
            .expect((res) => {
              const receivedText = res.body.data.text;
              if (receivedText !== test.expectedText) {
                throw new Error(`Text received from export is not the one we were expecting.
             Test Name:
             ${testName}

             Received:
             ${JSON.stringify(receivedText)}

             Expected:
             ${JSON.stringify(test.expectedText)}

             Which is a different version of the originally imported one:
             ${test.input}`);
              }
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });
  });
});


function endPoint(point, version) {
  version = version || apiVersion;
  return `/api/${version}/${point}?apikey=${apiKey}`;
};

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
