'use strict';

describe('indentation button', function () {
  // create a new pad before each test run
  beforeEach(async function () {
    await helper.aNewPad();
  });

  it('indent text with keypress', async function () {
    const inner$ = helper.padInner$;

    // get the first text element out of the inner iframe
    const $firstTextElement = inner$('div').first();

    // select this text element
    $firstTextElement.sendkeys('{selectall}');

    const e = new inner$.Event(helper.evtType);
    e.keyCode = 9; // tab :|
    inner$('#innerdocbody').trigger(e);

    await helper.waitForPromise(() => inner$('div').first().find('ul li').length === 1);
  });

  it('indent text with button', async function () {
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    const $indentButton = chrome$('.buttonicon-indent');
    $indentButton.click();

    await helper.waitForPromise(() => inner$('div').first().find('ul li').length === 1);
  });

  it('keeps the indent on enter for the new line', async function () {
    this.timeout(1200);
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    const $indentButton = chrome$('.buttonicon-indent');
    $indentButton.click();

    // type a bit, make a line break and type again
    const $firstTextElement = inner$('div span').first();
    $firstTextElement.sendkeys('line 1');
    $firstTextElement.sendkeys('{enter}');
    $firstTextElement.sendkeys('line 2');
    $firstTextElement.sendkeys('{enter}');

    await helper.waitFor(() => inner$('div span').first().text().indexOf('line 2') === -1);

    const $newSecondLine = inner$('div').first().next();
    const hasULElement = $newSecondLine.find('ul li').length === 1;

    expect(hasULElement).to.be(true);
    expect($newSecondLine.text()).to.be('line 2');
  });

  it('indents text with spaces on enter if previous line ends ' +
    "with ':', '[', '(', or '{'", async function () {
    this.timeout(1200);
    const inner$ = helper.padInner$;

    // type a bit, make a line break and type again
    const $firstTextElement = inner$('div').first();
    $firstTextElement.sendkeys("line with ':'{enter}");
    $firstTextElement.sendkeys("line with '['{enter}");
    $firstTextElement.sendkeys("line with '('{enter}");
    $firstTextElement.sendkeys("line with '{{}'{enter}");

    await helper.waitForPromise(() => {
      // wait for Etherpad to split four lines into separated divs
      const $fourthLine = inner$('div').first().next().next().next();
      return $fourthLine.text().indexOf("line with '{'") === 0;
    });

    // we validate bottom to top for easier implementation

    // curly braces
    const $lineWithCurlyBraces = inner$('div').first().next().next().next();
    $lineWithCurlyBraces.sendkeys('{{}');
    // cannot use sendkeys('{enter}') here, browser does not read the command properly
    pressEnter();
    const $lineAfterCurlyBraces = inner$('div').first().next().next().next().next();
    expect($lineAfterCurlyBraces.text()).to.match(/\s{4}/); // tab === 4 spaces

    // parenthesis
    const $lineWithParenthesis = inner$('div').first().next().next();
    $lineWithParenthesis.sendkeys('(');
    pressEnter();
    const $lineAfterParenthesis = inner$('div').first().next().next().next();
    expect($lineAfterParenthesis.text()).to.match(/\s{4}/);

    // bracket
    const $lineWithBracket = inner$('div').first().next();
    $lineWithBracket.sendkeys('[');
    pressEnter();
    const $lineAfterBracket = inner$('div').first().next().next();
    expect($lineAfterBracket.text()).to.match(/\s{4}/);

    // colon
    const $lineWithColon = inner$('div').first();
    $lineWithColon.sendkeys(':');
    pressEnter();
    const $lineAfterColon = inner$('div').first().next();
    expect($lineAfterColon.text()).to.match(/\s{4}/);
  });

  it('appends indentation to the indent of previous line if previous line ends ' +
    "with ':', '[', '(', or '{'", async function () {
    this.timeout(1200);
    const inner$ = helper.padInner$;

    // type a bit, make a line break and type again
    const $firstTextElement = inner$('div').first();
    $firstTextElement.sendkeys("  line with some indentation and ':'{enter}");
    $firstTextElement.sendkeys('line 2{enter}');

    await helper.waitForPromise(() => {
      // wait for Etherpad to split two lines into separated divs
      const $secondLine = inner$('div').first().next();
      return $secondLine.text().indexOf('line 2') === 0;
    });

    const $lineWithColon = inner$('div').first();
    $lineWithColon.sendkeys(':');
    pressEnter();
    const $lineAfterColon = inner$('div').first().next();
    // previous line indentation + regular tab (4 spaces)
    expect($lineAfterColon.text()).to.match(/\s{6}/);
  });

  it("issue #2772 shows '*' when multiple indented lines " +
      ' receive a style and are outdented', async function () {
    this.timeout(1200);
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // make sure pad has more than one line
    inner$('div').first().sendkeys('First{enter}Second{enter}');
    await helper.waitForPromise(() => inner$('div').first().text().trim() === 'First');

    // indent first 2 lines
    const $lines = inner$('div');
    const $firstLine = $lines.first();
    let $secondLine = $lines.slice(1, 2);
    helper.selectLines($firstLine, $secondLine);

    const $indentButton = chrome$('.buttonicon-indent');
    $indentButton.click();

    await helper.waitForPromise(() => inner$('div').first().find('ul li').length === 1);

    // apply bold
    const $boldButton = chrome$('.buttonicon-bold');
    $boldButton.click();

    await helper.waitForPromise(() => inner$('div').first().find('b').length === 1);

    // outdent first 2 lines
    const $outdentButton = chrome$('.buttonicon-outdent');
    $outdentButton.click();
    await helper.waitForPromise(() => inner$('div').first().find('ul li').length === 0);

    // check if '*' is displayed
    $secondLine = inner$('div').slice(1, 2);
    expect($secondLine.text().trim()).to.be('Second');
  });

  xit('makes text indented and outdented', async function () {
    // get the inner iframe
    const $inner = helper.$getPadInner();

    // get the first text element out of the inner iframe
    let firstTextElement = $inner.find('div').first();

    // select this text element
    helper.selectText(firstTextElement[0], $inner);

    // get the indentation button and click it
    const $indentButton = helper.$getPadChrome().find('.buttonicon-indent');
    $indentButton.click();

    let newFirstTextElement = $inner.find('div').first();

    // is there a list-indent class element now?
    let firstChild = newFirstTextElement.children(':first');
    let isUL = firstChild.is('ul');

    // expect it to be the beginning of a list
    expect(isUL).to.be(true);

    let secondChild = firstChild.children(':first');
    let isLI = secondChild.is('li');
    // expect it to be part of a list
    expect(isLI).to.be(true);

    // indent again
    $indentButton.click();

    newFirstTextElement = $inner.find('div').first();

    // is there a list-indent class element now?
    firstChild = newFirstTextElement.children(':first');
    const hasListIndent2 = firstChild.hasClass('list-indent2');

    // expect it to be part of a list
    expect(hasListIndent2).to.be(true);

    // make sure the text hasn't changed
    expect(newFirstTextElement.text()).to.eql(firstTextElement.text());


    // test outdent

    // get the unindentation button and click it twice
    const $outdentButton = helper.$getPadChrome().find('.buttonicon-outdent');
    $outdentButton.click();
    $outdentButton.click();

    newFirstTextElement = $inner.find('div').first();

    // is there a list-indent class element now?
    firstChild = newFirstTextElement.children(':first');
    isUL = firstChild.is('ul');

    // expect it not to be the beginning of a list
    expect(isUL).to.be(false);

    secondChild = firstChild.children(':first');
    isLI = secondChild.is('li');
    // expect it to not be part of a list
    expect(isLI).to.be(false);

    // make sure the text hasn't changed
    expect(newFirstTextElement.text()).to.eql(firstTextElement.text());


    // Next test tests multiple line indentation

    // select this text element
    helper.selectText(firstTextElement[0], $inner);

    // indent twice
    $indentButton.click();
    $indentButton.click();

    // get the first text element out of the inner iframe
    firstTextElement = $inner.find('div').first();

    // select this text element
    helper.selectText(firstTextElement[0], $inner);

    /* this test creates the below content, both should have double indentation
    line1
    line2
    */

    firstTextElement.sendkeys('{rightarrow}'); // simulate a keypress of enter
    firstTextElement.sendkeys('{enter}'); // simulate a keypress of enter
    firstTextElement.sendkeys('line 1'); // simulate writing the first line
    firstTextElement.sendkeys('{enter}'); // simulate a keypress of enter
    firstTextElement.sendkeys('line 2'); // simulate writing the second line

    // get the second text element out of the inner iframe
    await new Promise((resolve) => setTimeout(resolve, 1000)); // THIS IS REALLY BAD

    const secondTextElement = $('iframe').contents()
        .find('iframe').contents()
        .find('iframe').contents().find('body > div').get(1); // THIS IS UGLY

    // is there a list-indent class element now?
    firstChild = secondTextElement.children(':first');
    isUL = firstChild.is('ul');

    // expect it to be the beginning of a list
    expect(isUL).to.be(true);

    secondChild = secondChild.children(':first');
    isLI = secondChild.is('li');
    // expect it to be part of a list
    expect(isLI).to.be(true);

    // get the first text element out of the inner iframe
    const thirdTextElement = $('iframe').contents()
        .find('iframe').contents()
        .find('iframe').contents()
        .find('body > div').get(2); // THIS IS UGLY TOO

    // is there a list-indent class element now?
    firstChild = thirdTextElement.children(':first');
    isUL = firstChild.is('ul');

    // expect it to be the beginning of a list
    expect(isUL).to.be(true);

    secondChild = firstChild.children(':first');
    isLI = secondChild.is('li');

    // expect it to be part of a list
    expect(isLI).to.be(true);
  });
});

const pressEnter = () => {
  const inner$ = helper.padInner$;
  const e = new inner$.Event(helper.evtType);
  e.keyCode = 13; // enter :|
  inner$('#innerdocbody').trigger(e);
};
