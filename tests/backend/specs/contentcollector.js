'use strict';

/* eslint-disable max-len */
/*
 * While importexport tests target the `setHTML` API endpoint, which is nearly identical to what happens
 * when a user manually imports a document via the UI, the contentcollector tests here don't use rehype to process
 * the document. Rehype removes spaces and newĺines were applicable, so the expected results here can
 * differ from importexport.js.
 *
 * If you add tests here, please also add them to importexport.js
 */

const contentcollector = require('../../../src/static/js/contentcollector');
const AttributePool = require('../../../src/static/js/AttributePool');
const cheerio = require('../../../src/node_modules/cheerio');

const tests = {
  nestedLi: {
    description: 'Complex nested Li',
    html: '<!doctype html><html><body><ol><li>one</li><li><ol><li>1.1</li></ol></li><li>two</li></ol></body></html>',
    expectedLineAttribs: [
      '*0*1*2*3+1+3', '*0*4*2*5+1+3', '*0*1*2*5+1+3',
    ],
    expectedText: [
      '*one', '*1.1', '*two',
    ],
  },
  complexNest: {
    description: 'Complex list of different types',
    html: '<!doctype html><html><body><ul class="bullet"><li>one</li><li>two</li><li>0</li><li>1</li><li>2<ul class="bullet"><li>3</li><li>4</li></ul></li></ul><ol class="number"><li>item<ol class="number"><li>item1</li><li>item2</li></ol></li></ol></body></html>',
    expectedLineAttribs: [
      '*0*1*2+1+3',
      '*0*1*2+1+3',
      '*0*1*2+1+1',
      '*0*1*2+1+1',
      '*0*1*2+1+1',
      '*0*3*2+1+1',
      '*0*3*2+1+1',
      '*0*4*2*5+1+4',
      '*0*6*2*7+1+5',
      '*0*6*2*7+1+5',
    ],
    expectedText: [
      '*one',
      '*two',
      '*0',
      '*1',
      '*2',
      '*3',
      '*4',
      '*item',
      '*item1',
      '*item2',
    ],
  },
  ul: {
    description: 'Tests if uls properly get attributes',
    html: '<html><body><ul><li>a</li><li>b</li></ul><div>div</div><p>foo</p></body></html>',
    expectedLineAttribs: ['*0*1*2+1+1', '*0*1*2+1+1', '+3', '+3'],
    expectedText: ['*a', '*b', 'div', 'foo'],
  },
  ulIndented: {
    description: 'Tests if indented uls properly get attributes',
    html: '<html><body><ul><li>a</li><ul><li>b</li></ul><li>a</li></ul><p>foo</p></body></html>',
    expectedLineAttribs: ['*0*1*2+1+1', '*0*3*2+1+1', '*0*1*2+1+1', '+3'],
    expectedText: ['*a', '*b', '*a', 'foo'],
  },
  ol: {
    description: 'Tests if ols properly get line numbers when in a normal OL',
    html: '<html><body><ol><li>a</li><li>b</li><li>c</li></ol><p>test</p></body></html>',
    expectedLineAttribs: ['*0*1*2*3+1+1', '*0*1*2*3+1+1', '*0*1*2*3+1+1', '+4'],
    expectedText: ['*a', '*b', '*c', 'test'],
    noteToSelf: 'Ensure empty P does not induce line attribute marker, wont this break the editor?',
  },
  lineDoBreakInOl: {
    description: 'A single completely empty line break within an ol should reset count if OL is closed off..',
    html: '<html><body><ol><li>should be 1</li></ol><p>hello</p><ol><li>should be 1</li><li>should be 2</li></ol><p></p></body></html>',
    expectedLineAttribs: ['*0*1*2*3+1+b', '+5', '*0*1*2*4+1+b', '*0*1*2*4+1+b', ''],
    expectedText: ['*should be 1', 'hello', '*should be 1', '*should be 2', ''],
    noteToSelf: "Shouldn't include attribute marker in the <p> line",
  },
  bulletListInOL: {
    description: 'A bullet within an OL should not change numbering..',
    html: '<html><body><ol><li>should be 1</li><ul><li>should be a bullet</li></ul><li>should be 2</li></ol><p></p></body></html>',
    expectedLineAttribs: ['*0*1*2*3+1+b', '*0*4*2*3+1+i', '*0*1*2*5+1+b', ''],
    expectedText: ['*should be 1', '*should be a bullet', '*should be 2', ''],
  },
  testP: {
    description: 'A single <p></p> should create a new line',
    html: '<html><body><p></p><p></p></body></html>',
    expectedLineAttribs: ['', ''],
    expectedText: ['', ''],
    noteToSelf: '<p></p>should create a line break but not break numbering',
  },
  nestedOl: {
    description: 'Tests if ols properly get line numbers when in a normal OL',
    html: '<html><body>a<ol><li>b<ol><li>c</li></ol></ol>notlist<p>foo</p></body></html>',
    expectedLineAttribs: ['+1', '*0*1*2*3+1+1', '*0*4*2*5+1+1', '+7', '+3'],
    expectedText: ['a', '*b', '*c', 'notlist', 'foo'],
    noteToSelf: 'Ensure empty P does not induce line attribute marker, wont this break the editor?',
  },
  nestedOl2: {
    description: 'First item being an UL then subsequent being OL will fail',
    html: '<html><body><ul><li>a<ol><li>b</li><li>c</li></ol></li></ul></body></html>',
    expectedLineAttribs: ['+1', '*0*1*2*3+1+1', '*0*4*2*5+1+1'],
    expectedText: ['a', '*b', '*c'],
    noteToSelf: 'Ensure empty P does not induce line attribute marker, wont this break the editor?',
    disabled: true,
  },
  lineDontBreakOL: {
    description: 'A single completely empty line break within an ol should NOT reset count',
    html: '<html><body><ol><li>should be 1</li><p></p><li>should be 2</li><li>should be 3</li></ol><p></p></body></html>',
    expectedLineAttribs: [],
    expectedText: ['*should be 1', '*should be 2', '*should be 3'],
    noteToSelf: "<p></p>should create a line break but not break numbering -- This is what I can't get working!",
    disabled: true,
  },
  ignoreAnyTagsOutsideBody: {
    description: 'Content outside body should be ignored',
    html: '<html><head><title>title</title><style></style></head><body>empty<br></body></html>',
    expectedLineAttribs: ['+5'],
    expectedText: ['empty'],
  },
  lineWithMultipleSpaces: {
    description: 'Multiple spaces should be preserved',
    html: '<html><body>Text with  more   than    one space.<br></body></html>',
    expectedLineAttribs: [ '+10' ],
    expectedText: ['Text with  more   than    one space.']
  },
  lineWithMultipleNonBreakingAndNormalSpaces: {
    description: 'non-breaking and normal space should be preserved',
    html: '<html><body>Text&nbsp;with&nbsp; more&nbsp;&nbsp;&nbsp;than   &nbsp;one space.<br></body></html>',
    expectedLineAttribs: [ '+10' ],
    expectedText: ['Text with  more   than    one space.']
  },
  multiplenbsp: {
    description: 'Multiple nbsp should be preserved',
    html: '<html><body>&nbsp;&nbsp;<br></body></html>',
    expectedLineAttribs: [ '+2' ],
    expectedText: ['  ']
  },
  multipleNonBreakingSpaceBetweenWords: {
    description: 'Multiple nbsp between words ',
    html: '<html><body>&nbsp;&nbsp;word1&nbsp;&nbsp;word2&nbsp;&nbsp;&nbsp;word3<br></body></html>',
    expectedLineAttribs: [ '+m' ],
    expectedText: ['  word1  word2   word3']
  },
  nonBreakingSpacePreceededBySpaceBetweenWords: {
    description: 'A non-breaking space preceeded by a normal space',
    html: '<html><body> &nbsp;word1 &nbsp;word2 &nbsp;word3<br></body></html>',
    expectedLineAttribs: [ '+l' ],
    expectedText: ['  word1  word2  word3']
  },
  nonBreakingSpaceFollowededBySpaceBetweenWords: {
    description: 'A non-breaking space followed by a normal space',
    html: '<html><body>&nbsp; word1&nbsp; word2&nbsp; word3<br></body></html>',
    expectedLineAttribs: [ '+l' ],
    expectedText: ['  word1  word2  word3']
  },
  spacesAfterNewline: {
    description: 'Don\'t collapse spaces that follow a newline',
    html:'<!doctype html><html><body>something<br>             something<br></body></html>',
    expectedLineAttribs: ['+9', '+m'],
    expectedText: ['something', '             something']
  },
  spacesAfterNewlineP: {
    description: 'Don\'t collapse spaces that follow a empty paragraph',
    html:'<!doctype html><html><body>something<p></p>             something<br></body></html>',
    expectedLineAttribs: ['+9', '', '+m'],
    expectedText: ['something', '', '             something']
  },
  spacesAtEndOfLine: {
    description: 'Don\'t collapse spaces that preceed/follow a newline',
    html:'<html><body>something            <br>             something<br></body></html>',
    expectedLineAttribs: ['+l', '+m'],
    expectedText: ['something            ', '             something']
  },
  spacesAtEndOfLineP: {
    description: 'Don\'t collapse spaces that preceed/follow a empty paragraph',
    html:'<html><body>something            <p></p>             something<br></body></html>',
    expectedLineAttribs: ['+l', '', '+m'],
    expectedText: ['something            ', '', '             something']
  },
  nonBreakingSpacesAfterNewlines: {
    description: 'Don\'t collapse non-breaking spaces that follow a newline',
    html:'<html><body>something<br>&nbsp;&nbsp;&nbsp;something<br></body></html>',
    expectedLineAttribs: ['+9', '+c'],
    expectedText: ['something', '   something']
  },
  nonBreakingSpacesAfterNewlinesP: {
    description: 'Don\'t collapse non-breaking spaces that follow a paragraph',
    html:'<html><body>something<p></p>&nbsp;&nbsp;&nbsp;something<br></body></html>',
    expectedLineAttribs: ['+9', '', '+c'],
    expectedText: ['something', '', '   something']
  },
  preserveSpacesInsideElements: {
    description: 'Preserve all spaces when multiple are present',
    html: '<html><body>Need <span> more </span> space<i>  s </i> !<br></body></html>',
    expectedLineAttribs: ['+h*0+4+2'],
    expectedText: ['Need  more  space  s  !'],
  },
  preserveSpacesAcrossNewlines: {
    description: 'Newlines and multiple spaces across newlines should be preserved',
    html: `
      <html><body>Need
          <span> more </span>
          space
          <i>  s </i>
          !<br></body></html>`,
    expectedLineAttribs: [ '+19*0+4+b' ],
    expectedText: [ 'Need           more           space            s           !' ]
  },
  multipleNewLinesAtBeginning: {
    description: 'Multiple new lines at the beginning should be preserved',
    html: '<html><body><br><br><p></p><p></p>first line<br><br>second line<br></body></html>',
    expectedLineAttribs: ['', '', '', '', '+a', '', '+b'],
    expectedText: [ '', '', '', '', 'first line', '', 'second line']
  },
  multiLineParagraph:{
    description: "A paragraph with multiple lines should not loose spaces when lines are combined",
    html:`<html><body><p>
а б в г ґ д е є ж з и і ї й к л м н о
п р с т у ф х ц ч ш щ ю я ь</p>
</body></html>`,
    expectedLineAttribs: [ '+1t' ],
    expectedText: ["а б в г ґ д е є ж з и і ї й к л м н о п р с т у ф х ц ч ш щ ю я ь"]
  },
  multiLineParagraphWithPre:{
    description: "lines in preformatted text should be kept intact",
    html:`<html><body><p>
а б в г ґ д е є ж з и і ї й к л м н о<pre>multiple
lines
in
pre
</pre></p><p>п р с т у ф х ц ч ш щ ю я
ь</p>
</body></html>`,
    expectedLineAttribs: [ '+11', '+8', '+5', '+2', '+3', '+r' ],
    expectedText: ['а б в г ґ д е є ж з и і ї й к л м н о', 'multiple', 'lines', 'in', 'pre', 'п р с т у ф х ц ч ш щ ю я ь']
  },
  preIntroducesASpace: {
    description: "pre should be on a new line not preceeded by a space",
    html:`<html><body><p>
    1
<pre>preline
</pre></p></body></html>`,
    expectedLineAttribs: [ '+6', '+7' ],
    expectedText: ['    1 ', 'preline']
  },
  dontDeleteSpaceInsideElements: {
    description: 'Preserve spaces on the beginning and end of a element',
    html: '<html><body>Need<span> more </span>space<i> s </i>!<br></body></html>',
    expectedLineAttribs: ['+f*0+3+1'],
    expectedText: ['Need more space s !']
  },
  dontDeleteSpaceOutsideElements: {
    description: 'Preserve spaces outside elements',
    html: '<html><body>Need <span>more</span> space <i>s</i> !<br></body></html>',
    expectedLineAttribs: ['+g*0+1+2'],
    expectedText: ['Need more space s !']
  },
  dontDeleteSpaceAtEndOfElement: {
    description: 'Preserve spaces at the end of an element',
    html: '<html><body>Need <span>more </span>space <i>s </i>!<br></body></html>',
    expectedLineAttribs: ['+g*0+2+1'],
    expectedText: ['Need more space s !']
  },
  dontDeleteSpaceAtBeginOfElements: {
    description: 'Preserve spaces at the start of an element',
    html: '<html><body>Need<span> more</span> space<i> s</i> !<br></body></html>',
    expectedLineAttribs: ['+f*0+2+2'],
    expectedText: ['Need more space s !']
  },
};

describe(__filename, function () {
  for (const test of Object.keys(tests)) {
    const testObj = tests[test];
    describe(test, function () {
      if (testObj.disabled) {
        return xit('DISABLED:', test, function (done) {
          done();
        });
      }

      it(testObj.description, function (done) {
        const $ = cheerio.load(testObj.html); // Load HTML into Cheerio
        const doc = $('body')[0]; // Creates a dom-like representation of HTML
        // Create an empty attribute pool
        const apool = new AttributePool();
        // Convert a dom tree into a list of lines and attribute liens
        // using the content collector object
        const cc = contentcollector.makeContentCollector(true, null, apool);
        cc.collectContent(doc);
        const result = cc.finish();
        const recievedAttributes = result.lineAttribs;
        const expectedAttributes = testObj.expectedLineAttribs;
        const recievedText = new Array(result.lines);
        const expectedText = testObj.expectedText;

        // Check recieved text matches the expected text
        if (arraysEqual(recievedText[0], expectedText)) {
          // console.log("PASS: Recieved Text did match Expected Text\nRecieved:", recievedText[0], "\nExpected:", testObj.expectedText)
        } else {
          console.error('FAIL: Recieved Text did not match Expected Text\nRecieved:', recievedText[0], '\nExpected:', testObj.expectedText);
          throw new Error();
        }

        // Check recieved attributes matches the expected attributes
        if (arraysEqual(recievedAttributes, expectedAttributes)) {
          // console.log("PASS: Recieved Attributes matched Expected Attributes");
          done();
        } else {
          console.error('FAIL', test, testObj.description);
          console.error('FAIL: Recieved Attributes did not match Expected Attributes\nRecieved: ', recievedAttributes, '\nExpected: ', expectedAttributes);
          console.error('FAILING HTML', testObj.html);
          throw new Error();
        }
      });
    });
  }
});


function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
