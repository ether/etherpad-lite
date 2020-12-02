const contentcollector = require('../../../src/static/js/contentcollector');
const AttributePool = require('../../../src/static/js/AttributePool');
const cheerio = require('../../../src/node_modules/cheerio');

/**
 * The html of these tests is intentionally collapsed into a single line, except in special cases.
 * All tests are duplicated in ./tests/backend/specs/api/importexport/ where they are properly indented.
 *
 * While importexport tests target the `setHTML` API endpoint, which is nearly identical to what happens
 * when a user manually imports a document via the UI, the contentcollector tests don't use rehype to process
 * the document. Rehype remove spaces and newĺines were applicable.
 *
 * Note the final <br> in every of the tests except when the body ends in a list.
 */
const tests = {
  nestedOrderedLi: {
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
  brDontBreakOL: {
    description: 'A single completely empty line break using <br/> within an ol should NOT reset count',
    html: '<html><body><ol><li>should be 1</li><br/><li>should be 2</li><li>should be 3</li></ol><p></p></body></html>',
    expectedLineAttribs: [],
    expectedText: ['*should be 1', '*should be 2', '*should be 3'],
    disabled: true,
  },
  normalNewline: {
    description: 'A normal newline as <br> should work',
    html: '<html><body>line1<br>line2<br></body></html>',
    expectedLineAttribs: ['+5','+5'],
    expectedText: ['line1', 'line2'],
  },
  indents: {
    disabled:true,
    description: 'Two indentations',
    html: '<html><body><ul class="list-indent1"><li>indent1</li><li>indent1</li><li><ul class="list-indent2"><li>indent2</li><li>indent2</li></ul></li><li>indent1</li></ul><br></body></html>',
    expectedLineAttribs: ['*0*1*2+1+7', '*0*1*2+1+7', '*0*3*2+1+7', '*0*3*2+1+7'],
    expectedText: ['*indent1', '*indent1', '*indent2', '*indent2', '*indent1']
  },
  indentsAndNewlines: {
    disabled: true, // does <ul><ul> which might not be right? instead: <ul><li><ul>
    description: 'Indentations and newlines',
    html: '<html><body><ul class="list-indent1"><li>indent1</li></ul><br/><ul class="list-indent1"><li>indent1</li><ul class="list-indent2"><li>indent2</li></ul></ul><br/><ul class="list-indent1"><ul class="list-indent2"><li>indent2</li></ul></ul></body></html>',
    expectedLineAttribs: ['*0*1*2+1+7', '', '*0*1*2+1+7', '*0*3*2+1+7', '', '*0*1*2+1+7', '*0*3*2+1+7'],
    expectedText: ['*indent1', '', '*indent1', '*indent2', '', '*indent1', '*indent2']
  },
  multipleIndentLevelAndStyles: {
    disabled:true,
    description: '8 levels of indents, newlines and attributes',
    html: '<html><body><ul class="list-indent1"><li>indent line 1</li></ul><br/><ul class="list-indent1"><li>indent line 2</li><li><ul class="list-indent2"><li>indent2 line 1</li></ul></li></ul><br/><ul class="list-indent1"><li><ul class="list-indent2"><li><ul class="list-indent3"><li><ul class="list-indent4"><li><span class="b s i u"><b><i><s><u>indent4 line 2 bisu</u></s></i></b></span></li><li><span class="b s"><b><s>indent4 line 2 bs</s></b></span></li><li><span class="u"><u>indent4 line 2 u</u></span><span class="u i s"><i><s><u>uis</u></s></i></span></li><li><ul class="list-indent5"><li><ul class="list-indent6"><li><ul class="list-indent7"><li><ul class="list-indent8"><li><span class="">foo</span></li><li><span class="b s"><b><s>foobar bs</b></s></span></li></ul></li></ul></li></ul></li></ul></li><li><ul class="list-indent5"><li>foobar</li></ul></li></ul></li></ul></li></ul></body></html>',
    expectedLineAttribs: [],
    expectedText: ['*indent line 1', '*indent line 1']
  },
  bulletsAndEmptyLines: {
    disabled: true,
    description: 'Bullet lists that contain empty lines',
    html: '<html><body><ul class="list-bullet1"><li>bullet line 1</li><br/></ul><br/><ul class="list-bullet1"><li>bullet line 2</li><br/><li><ul class="list-bullet2"><li>bullet2 line 1</li></ul></li></ul><br/><br/><ul class="list-bullet1"><li><ul class="list-bullet2"><li>bullet2 line 2</li><li><br/></li></ul></li></ul></body></html>',
    expectedLineAttribs: [],
    expectedText: ['*bullet line 1', '', '*bullet line 2', '', '*bullet2 line 1', '', '', '*bullet2 line 2', '']
  },
  indentsAndEmptyLines: {
    disabled:true,
    description: 'Indented lines that contain empty lines',
    html: '<html><body><ul class="list-indent1"><li>indented line 1</li><br/></ul><br/><ul class="list-indent1"><li>indented line 2</li><br/><li><ul class="list-indent2"><li>indent2 line 1</li></ul></li></ul><br/><br/><ul class="list-indent1"><li><ul class="list-indent2"><li>indent2 line 2</li><li><br/></li></ul></li></ul></body></html>',
    expectedLineAttribs: [],
    expectedText: ['indented line 1', '', '', 'indented line 2', '', 'indent2 line 1']
  },
  bulletsAndNonBulletLines: {
    disabled:true,
    description: 'Bullet lists that contain not bullet lines',
    html: '<html><body><ul class="list-bullet1"><li>bullet line 1</li>not bullet</ul>not bullet<ul class="list-bullet1"><li>bullet line 2</li><br/><ul class="list-bullet2"><li>bullet2 line 1</li></ul></ul></body></html>',
    expectedLineAttribs: [],
    expectedText: []
  },
  indentsAndNonIndentedLines: {
    disabled: true,
    description: 'Indented lines that contain non indented lines',
    html: '<html><body><ul class="list-indent1"><li>indent line 1</li>not indent</ul>not indent<ul class="list-indent1"><li>indent line 2</li><br/><li><ul class="list-indent2"><li>indent2 line 1</li></ul></li></ul></body></html>',
    expectedLineAttribs: [],
    expectedText: ['*indent line 1', 'not indent', 'not indent', '*indent line 2', '', '*indent2 line 1']
  },
  olWithNonDefaultStart: {
    disabled: true,
    description: 'An ordered list that does not start with 1',
    html: '<html><body><ol start="6"><li>6</li><li>7</li></ol><ol start="4"><li>4</li><li>5</li></ol><ol class="list-number3" start="9"><li>0.0.9</li><li>0.0.10</li></ol></body></html>',
    expectedLineAttribs: [
    ],
    expectedText: ['*6', '*7', '*4', '*5', '*0.0.9', '*0.0.10'] //0.0. is wrong
//totally wrong after import
/**
1. 6
1. 7
2. 4
3. 5
  3.0.1 0.0.9
  3.0.1 0.0.10

only backwards key (and probably return key) trigger renumbering, it is not triggered when entering in any of the lines:
1. 6
2. 7
3. 4
4. 5
  4.0.1. 0.0.9
  4.0.2. 0.0.10
*/
  },
  stylingWithAttributesAndTags: {
    description: 'Styling applied as separate tags and span attributes',
    html: '<html><body>line<br/><span class="b s i u"><b><i><s><u>bold strikethrough italic underline</u></s></i></b></span><span> no style</span> no style<br></body></html>',
    expectedLineAttribs: ['+4', '*0*1*2*3+z+i'],
    expectedText: ['line', 'bold strikethrough italic underline no style no style']
  },
  stylingWithSpanAndTagsWithoutAttributes: {
    description: 'Styling applied as separate tags inside a span',
    html: '<html><body>line<br/><span><b><i><s><u>bold strikethrough italic underline</u></s></i></b></span><span> no style</span> no style<br></body></html>',
    expectedLineAttribs: ['+4', '*0*1*2*3+z+i'],
    expectedText: ['line', 'bold strikethrough italic underline no style no style']
  },
  stylingWithAttributesWithoutTags: {
    disabled:true,
    description: 'Styling applied as span attributes',
    html: '<html><body>line<br/><span class="b s i u">bold strikethrough italic underline</span><span> no style</span> no style<br></body></html>',
    expectedLineAttribs: ['+4', '*0*1*2*3+z+i'],
    expectedText: ['line', 'bold strikethrough italic underline no style no style']
  },
  stylingWithTagsWithoutAttributes: {
    description: 'Styling applied as separate tags',
    html: '<html><body>line<br/><b><i><s><u>bold strikethrough italic underline</u></s></i></b><span> no style</span> no style<br></body></html>',
    expectedLineAttribs: ['+4', '*0*1*2*3+z+i'],
    expectedText: ['line', 'bold strikethrough italic underline no style no style']
  },
  stylingWithFontAttributes: {
    disabled: true,
    description: "Styling applied as font-style",
    html: '<html><body>line<br/><span style="font-style:italic"><span style="font-style:bold"><span style="font-style:underline"><span style="font-style:strikethrough">bold strikethrough italic underline</span></span></span></span><span> no style</span> no style</body></html>',
    expectedLineAttribs: [],
    expectedText: ['abc']
  },
  dontDeleteSpaceInsideElements: { //BEGINNING AAND END
    description: 'Preserve spaces on the beginning and end of a element',
    html: '<html><body>Need<span> more </span>space<i>s </i>!<br></body></html>',
    expectedLineAttribs: ['+f*0+2+1'],
    expectedText: ['Need more spaces !']
  },
  collapseSpacesInsideElements: {
    description: 'Preserve only on space when multiple are present',
    html: '<html><body>Need <span> more </span> space<i>  s </i> !<br></body></html>',
    expectedLineAttribs: ['+f*0'],
    expectedText: ['Need more space s !'],
    disabled: true
  },
  collapseSpacesAcrossNewlines: {
    disabled:true,
    description: 'Newlines and multiple spaces across newlines should be collapsed',
    html: `
      <html><body>Need
          <span> more </span>
          space
          <i>  s </i>
          !<br></body></html>`,
    expectedLineAttribs: [],
    expectedText: []
  },
  multipleNewLinesAtBeginning: {
    disabled: true,
    description: 'Multiple new lines at the beginning should be preserved',
    html: '<html><body><br><br><p></p><p></p>first line<br><br>second line<br></body></html>',
    expectedLineAttribs: [],
    expectedText: []
  },
  spacesAfterNewline: {
    description: 'Don\'t collapse spaces that follow a newline',
    html: '<!doctype html><html><body>something<br>             something<br></body></html>',
    expectedLineAttribs: ['+9', '+m'],
    expectedText: ['something', '             something']
  },
  spacesAfterNewlineP: {
    description: 'Don\'t collapse spaces that follow a newline',
    html: '<!doctype html><html><body>something<p></p>             something<br></body></html>',
    expectedLineAttribs: ['+9', '', '+m'],
    expectedText: ['something', '', '             something']
  },
  spacesAtEndOfLine: {
    description: 'Don\'t collapse spaces that follow a newline',
    html: '<html><body>something            <br>             something<br></body></html>',
    expectedLineAttribs: ['+l', '+m'],
    expectedText: ['something            ', '             something']
  },
  spacesAtEndOfLineP: {
    description: 'Don\'t collapse spaces that follow a newline',
    html: '<html><body>something            <p></p>             something<br></body></html>',
    expectedLineAttribs: ['+l', '', '+m'],
    expectedText: ['something            ', '', '             something']
  },
  nonBreakingSpacesAfterNewlines: {
    description: 'Don\'t collapse non-breaking spaces that follow a newline',
    html: '<html><body>something<br>&nbsp;&nbsp;&nbsp;something<br></body></html>',
    expectedLineAttribs: ['+9', '+c'],
    expectedText: ['something', '   something']
  },
  nonBreakingSpacesAfterNewlinesP: {
    description: 'Don\'t collapse non-breaking spaces that follow a newline',
    html: '<html><body>something<p></p>&nbsp;&nbsp;&nbsp;something<br></body></html>',
    expectedLineAttribs: ['+9', '', '+c'],
    expectedText: ['something', '', '   something']
  },
  ignoreAnyTagsOutsideBody: {
    description: 'Never add non-breaking spaces for elements outside body',
    html: '<html><head><title>title</title><style></style></head><body>empty<br></body></html>',
    expectedLineAttribs: ['+5'],
    expectedText: ['empty']
  },
  linebreakPreceedsOL: {
    description: 'A break before an ordered list should not introduce a list item',
    html: '<html><body><br><ol><li>should be 1</li></ol></body></html>',
    //expectedHTML: '<!DOCTYPE HTML><html><body><br><ol start="1" class="number"><li>should be 1</ol><br></body></html>',
    expectedLineAttribs: ['', '*0*1*2*3+1+b'],
    //expectedText: '\n\t1. should be 1\n\n'
    expectedText: ['', '*should be 1']
  },
  paragraphPreceedsOL:{
    description: 'An empty paragraph before an ordered list should not introduce a list item',
    html: '<html><body><p></p><ol><li>should be 1</li></ol></body></html>',
    //expectedHTML: '<!DOCTYPE HTML><html><body><br><ol start="1" class="number"><li>should be 1</ol><br></body></html>',
    //expectedText: '\n\t1. should be 1\n\n'
    expectedLineAttribs: ['', '*0*1*2*3+1+b'],
    expectedText: ['', '*should be 1']
  },
  lineWithSpacesPreceedsOL:{
    disabled:true,
    description: 'A single line with a space right before an ordered list should not introduce a list item',
    html: '<html><body><br><br><br> <ol><li>should be 1</li></ol></body></html>',
    expectedLineAttribs: ['', '*0*1*2*3+1+b'],
    expectedText: ['', '', ' ', '*should be 1']
    //expectedHTML: '<!DOCTYPE HTML><html><body><br><br><br><ol start="1" class="number"><li>should be 1</ol><br></body></html>',
    //expectedText: '\n\n\n\t1. should be 1\n\n'
  },
  multipleParagraphsWithSpacesPreceedsOL: {
    description: 'Paragraphs with spaces right before an ordered list should not introduce a list item',
    html: '<html><body><p> </p><p> </p><p> </p><ol><li>should be 1</li></ol></body></html>',
    expectedLineAttribs: ['+1', '+1', '+1', '*0*1*2*3+1+b'],
    expectedText: [' ', ' ', ' ', '*should be 1']
    //expectedHTML: '<!DOCTYPE HTML><html><body><br><br><br><ol start="1" class="number"><li>should be 1</ol><br></body></html>',
    //expectedText: '\n\n\n\t1. should be 1\n\n'
  },
  multiLineParagraph:{
    description: "A paragraph with multiple lines should not loose spaces when lines are combined",
    html: `<html><body><p>
а б в г ґ д е є ж з и і ї й к л м н о
п р с т у ф х ц ч ш щ ю я ь</p>
</body></html>`,
    expectedLineAttribs: [ '+1t' ],
    expectedText: ["а б в г ґ д е є ж з и і ї й к л м н о п р с т у ф х ц ч ш щ ю я ь"]
  },
  multiLineParagraphWithPre:{
    description: "lines in preformatted text should be kept intact",
    html: `<html><body><p>
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
    html: `<html><body><p>
    1
<pre>preline
</pre></p></body></html>`,
    expectedLineAttribs: [ '+6', '+7' ],
    expectedText: ['    1 ', 'preline']
  },
  linesWithMoreThanOnceSpace: {
    description: 'Multiple spaces should be preserved',
    html: '<html><body>Text with  more   than    one space.<br></body></html>',
    expectedLineAttribs: [ '+10' ],
    expectedText: ['Text with  more   than    one space.']
  }
}


describe(__filename, function () {
  for (const test in tests) {
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
//        console.warn(result)
//        console.warn("the pool:",apool)
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
