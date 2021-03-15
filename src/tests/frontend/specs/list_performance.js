'use strict';

describe('list performance', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('ensure lists are fast to indent/outdent', async function () {
    const numberOfListItems = 200;
    const allowableDuration = 100; // 100 ms to complete op

    // Clear
    helper.padInner$('#innerdocbody').text('');
    await helper.waitFor(() => helper.padInner$('#innerdocbody').text() === '');

    let i = 0;
    while (i < numberOfListItems) {
      await helper.waitForPromise(() => helper.padInner$(`div:eq(${i})`).length === 1);
      helper.padInner$(`div:eq(${i})`).sendkeys(`${i}`);
      helper.padInner$(`div:eq(${i})`).sendkeys('{enter}');
      helper.padInner$('#innerdocbody').contents(`div:eq(${i})`).sendkeys('{selectall}');
      helper.padChrome$('.buttonicon-insertorderedlist').click();
      if (i >= 1) helper.padChrome$('.buttonicon-indent').click();
      i++;
      helper.padOuter$('#outerdocbody').scrollTop(helper.padOuter$('#outerdocbody').height());
    }

    let listType = 3;
    // try to indent the last item of the list
    // it might be sensible to turn this into a function to remove duplicate code.
    helper.padInner$('#innerdocbody')
        .contents(`div:eq(${numberOfListItems - 1})`).sendkeys('{selectall}');
    let before = new Date();
    helper.padChrome$('.buttonicon-indent').click();
    await helper.waitFor(
        () => helper.padInner$('#innerdocbody').contents(`div:eq(${numberOfListItems - 1})`)
            .find(`.list-number${listType}`).length === 1, 20);
    let duration = new Date() - before;
    if (duration > allowableDuration) throw new Error(`slow to modify ${listType}: ${duration}`);

    listType++;
    before = new Date();
    helper.padChrome$('.buttonicon-indent').click();
    await helper.waitFor(
        () => helper.padInner$('#innerdocbody').contents(`div:eq(${numberOfListItems - 1})`)
            .find(`.list-number${listType}`).length === 1, 20);
    duration = new Date() - before;
    if (duration > allowableDuration) throw new Error(`slow to modify ${listType}: ${duration}`);

    listType++;
    before = new Date();
    helper.padChrome$('.buttonicon-indent').click();
    await helper.waitFor(
        () => helper.padInner$('#innerdocbody').contents(`div:eq(${numberOfListItems - 1})`)
            .find(`.list-number${listType}`).length === 1, 20);
    duration = new Date() - before;
    if (duration > allowableDuration) throw new Error(`slow to modify ${listType}: ${duration}`);

    listType--;
    before = new Date();
    helper.padChrome$('.buttonicon-outdent').click();
    await helper.waitFor(
        () => helper.padInner$('#innerdocbody').contents(`div:eq(${numberOfListItems - 1})`)
            .find(`.list-number${listType}`).length === 1, 20);
    duration = new Date() - before;
    if (duration > allowableDuration) throw new Error(`slow to modify ${listType}: ${duration}`);

    listType--;
    before = new Date();
    helper.padChrome$('.buttonicon-outdent').click();
    await helper.waitFor(
        () => helper.padInner$('#innerdocbody').contents(`div:eq(${numberOfListItems - 1})`)
            .find(`.list-number${listType}`).length === 1, 20);
    duration = new Date() - before;
    if (duration > allowableDuration) throw new Error(`slow to modify ${listType}: ${duration}`);

    listType--;
    before = new Date();
    helper.padChrome$('.buttonicon-outdent').click();
    await helper.waitFor(
        () => helper.padInner$('#innerdocbody').contents(`div:eq(${numberOfListItems - 1})`)
            .find(`.list-number${listType}`).length === 1, 20);
    duration = new Date() - before;
    if (duration > allowableDuration) throw new Error(`slow to modify ${listType}: ${duration}`);

    before = new Date();
    helper.padChrome$('.buttonicon-outdent').click();
    helper.padChrome$('.buttonicon-outdent').click();
    await helper.waitFor(
        () => helper.padInner$('#innerdocbody').contents(`div:eq(${numberOfListItems - 1})`)
            .find('li').length === 0, 20);
    duration = new Date() - before;
    if (duration > allowableDuration) throw new Error(`slow to modify delist: ${duration}`);

  });
});
