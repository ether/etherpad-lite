'use strict';

describe('Messages in the COLLABROOM', function () {
  const newTextOfUser1 = 'text created by user 1';
  const newTextOfUser2 = 'text created by user 2';

  before(function (done) {
    helper.newPad(() => {
      helper.multipleUsers.openSamePadOnWithAnotherUser(done);
    });
    this.timeout(60000);
  });

  context('when user 1 is with slow or bad network conditions', function () {
    before(function (done) {
      helper.multipleUsers.startActingLikeThisUser();
      simulateSlowOrBadNetworkConditions();
      done();
    });

    context('and user 1 is in international composition', function () {
      before(function (done) {
        replaceLineText(1, newTextOfUser1, () => {
          simulateInternationalCompositionStartEvent();
          done();
        });
      });

      context('and user 2 edits the text', function () {
        before(function (done) {
          this.timeout(4000);
          helper.multipleUsers.startActingLikeOtherUser();
          replaceLineText(2, newTextOfUser2, () => {
            helper.multipleUsers.startActingLikeThisUser();
            done();
          });
        });

        context('and user 1 ends the international composition', function () {
          before(function (done) {
            simulateInternationalCompositionEndEvent();
            done();
          });

          context('and both users add more editions', function () {
            before(function (done) {
              this.timeout(10000);

              helper.multipleUsers.startActingLikeOtherUser();
              replaceLineText(4, newTextOfUser2, () => {
                helper.multipleUsers.startActingLikeThisUser();
                replaceLineText(3, newTextOfUser1, done);
              });
            });

            it('user 1 has all editions of user 2', function (done) {
              this.timeout(5000);
              helper.multipleUsers.startActingLikeThisUser();
              helper.waitFor(() => {
                const inner$ = helper.padInner$;
                const expectedLines = [2, 4];
                return expectedLines.every((line) => (
                  inner$('div').eq(line).text() === newTextOfUser2)
                );
              }, 4000).done(done);
            });

            it('user 2 has all editions of user 1', function (done) {
              this.timeout(5000);
              helper.multipleUsers.startActingLikeOtherUser();
              helper.waitFor(() => {
                const inner$ = helper.padInner$;
                const expectedLines = [1, 3];
                return expectedLines.every((line) => (
                  inner$('div').eq(line).text() === newTextOfUser1)
                );
              }, 4000).done(done);
            });
          });
        });
      });
    });
  });

  const triggerEvent = (eventName) => {
    const event = new helper.padInner$.Event(eventName);
    helper.padInner$('#innerdocbody').trigger(event);
  };

  const simulateInternationalCompositionStartEvent = () => {
    triggerEvent('compositionstart');
  };

  const simulateInternationalCompositionEndEvent = () => {
    triggerEvent('compositionend');
  };

  const simulateSlowOrBadNetworkConditions = () => {
    // to simulate slow or bad network conditions (packet loss), we delay the
    // sending of messages through the socket.
    const originalFunction = helper.padChrome$.window.pad.socket.json.send;
    const mockedFunction = function (...args) {
      const context = this;
      setTimeout(() => {
        originalFunction.apply(context, args);
      }, 4000);
    };
    mockedFunction.bind(helper.padChrome$.window.pad.socket);
    helper.padChrome$.window.pad.socket.json.send = mockedFunction;
  };

  const replaceLineText = (lineNumber, newText, done) => {
    const inner$ = helper.padInner$;

    // get the line element
    const $line = inner$('div').eq(lineNumber);

    // simulate key presses to delete content
    $line.sendkeys('{selectall}'); // select all
    $line.sendkeys('{del}'); // clear the first line
    $line.sendkeys(newText); // insert the string

    helper.waitFor(() => (
      inner$('div').eq(lineNumber).text() === newText
    ), 2000).done(() => {
      // give some time to receive NEW_CHANGES message
      setTimeout(done, 2000);
    });
  };
});
