'use strict';

describe('timeslider', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  it('loads adds a hundred revisions', function (done) { // passes
    this.timeout(100000);
    const inner$ = helper.padInner$;
    const chrome$ = helper.padChrome$;

    // make some changes to produce 100 revisions
    const timePerRev = 900;
    const revs = 99;
    this.timeout(revs * timePerRev + 10000);
    for (let i = 0; i < revs; i++) {
      setTimeout(() => {
        // enter 'a' in the first text element
        inner$('div').first().sendkeys('a');
      }, timePerRev * i);
    }
    chrome$('.buttonicon-savedRevision').click();

    setTimeout(() => {
      // go to timeslider
      $('#iframe-container iframe').attr('src',
          `${$('#iframe-container iframe').attr('src')}/timeslider`);

      setTimeout(() => {
        const timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        const $sliderBar = timeslider$('#ui-slider-bar');

        const latestContents = timeslider$('#innerdocbody').text();

        // Click somewhere on the timeslider
        let e = new jQuery.Event('mousedown');
        // sets y co-ordinate of the pad slider modal.
        const base = (timeslider$('#ui-slider-bar').offset().top - 24);
        e.clientX = e.pageX = 150;
        e.clientY = e.pageY = base + 5;
        $sliderBar.trigger(e);

        e = new jQuery.Event('mousedown');
        e.clientX = e.pageX = 150;
        e.clientY = e.pageY = base;
        $sliderBar.trigger(e);

        e = new jQuery.Event('mousedown');
        e.clientX = e.pageX = 150;
        e.clientY = e.pageY = base - 5;
        $sliderBar.trigger(e);

        $sliderBar.trigger('mouseup');

        setTimeout(() => {
          // make sure the text has changed
          expect(timeslider$('#innerdocbody').text()).not.to.eql(latestContents);
          const starIsVisible = timeslider$('.star').is(':visible');
          expect(starIsVisible).to.eql(true);
          done();
        }, 1000);
      }, 6000);
    }, revs * timePerRev);
  });


  // Disabled as jquery trigger no longer works properly
  xit('changes the url when clicking on the timeslider', function (done) {
    const inner$ = helper.padInner$;

    // make some changes to produce 7 revisions
    const timePerRev = 1000;
    const revs = 20;
    this.timeout(revs * timePerRev + 10000);
    for (let i = 0; i < revs; i++) {
      setTimeout(() => {
        // enter 'a' in the first text element
        inner$('div').first().sendkeys('a');
      }, timePerRev * i);
    }

    setTimeout(() => {
      // go to timeslider
      $('#iframe-container iframe').attr('src',
          `${$('#iframe-container iframe').attr('src')}/timeslider`);

      setTimeout(() => {
        const timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        const $sliderBar = timeslider$('#ui-slider-bar');

        const oldUrl = $('#iframe-container iframe')[0].contentWindow.location.hash;

        // Click somewhere on the timeslider
        const e = new jQuery.Event('mousedown');
        e.clientX = e.pageX = 150;
        e.clientY = e.pageY = 60;
        $sliderBar.trigger(e);

        helper.waitFor(
            () => $('#iframe-container iframe')[0].contentWindow.location.hash !== oldUrl, 6000)
            .always(() => {
              expect(
                  $('#iframe-container iframe')[0].contentWindow.location.hash
              ).not.to.eql(oldUrl);
              done();
            });
      }, 6000);
    }, revs * timePerRev);
  });
  it('jumps to a revision given in the url', function (done) {
    const inner$ = helper.padInner$;
    this.timeout(40000);

    // wait for the text to be loaded
    helper.waitFor(() => inner$('body').text().length !== 0, 10000).always(() => {
      const newLines = inner$('body div').length;
      const oldLength = inner$('body').text().length + newLines / 2;
      expect(oldLength).to.not.eql(0);
      inner$('div').first().sendkeys('a');
      let timeslider$;

      // wait for our additional revision to be added
      helper.waitFor(() => {
        // newLines takes the new lines into account which are strippen when using
        // inner$('body').text(), one <div> is used for one line in ACE.
        const lenOkay = inner$('body').text().length + newLines / 2 !== oldLength;
        // this waits for the color to be added to our <span>, which means that the revision
        // was accepted by the server.
        const colorOkay = inner$('span').first().attr('class').indexOf('author-') === 0;
        return lenOkay && colorOkay;
      }, 10000).always(() => {
        // go to timeslider with a specific revision set
        $('#iframe-container iframe').attr('src',
            `${$('#iframe-container iframe').attr('src')}/timeslider#0`);

        // wait for the timeslider to be loaded
        helper.waitFor(() => {
          try {
            timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
          } catch (e) {
            // Empty catch block <3
          }
          if (timeslider$) {
            return timeslider$('#innerdocbody').text().length === oldLength;
          }
        }, 10000).always(() => {
          expect(timeslider$('#innerdocbody').text().length).to.eql(oldLength);
          done();
        });
      });
    });
  });

  it('checks the export url', function (done) {
    const inner$ = helper.padInner$;
    this.timeout(11000);
    inner$('div').first().sendkeys('a');

    setTimeout(() => {
      // go to timeslider
      $('#iframe-container iframe').attr('src',
          `${$('#iframe-container iframe').attr('src')}/timeslider#0`);
      let timeslider$;
      let exportLink;

      helper.waitFor(() => {
        try {
          timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        } catch (e) {
          // Empty catch block <3
        }
        if (!timeslider$) return false;
        exportLink = timeslider$('#exportplaina').attr('href');
        if (!exportLink) return false;
        return exportLink.substr(exportLink.length - 12) === '0/export/txt';
      }, 6000).always(() => {
        expect(exportLink.substr(exportLink.length - 12)).to.eql('0/export/txt');
        done();
      });
    }, 2500);
  });
});
