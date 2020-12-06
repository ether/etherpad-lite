'use strict';

describe('Admin > Settings', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newAdmin('settings', cb);
    this.timeout(30000);
  });

  it('Are Settings visible, populated, does save work and restart?', async function () {
    await helper.waitForPromise(() => helper.admin$('.settings').val().length);
    // expect(helper.admin$('.settings').val().length).to.be.above(1000);
    helper.admin$('#saveSettings').click(); // saves
    await helper.waitForPromise(() => helper.admin$('#response').is(':visible'));
    helper.admin$('#restartEtherpad').click(); // restarts
    console.log('Attempting restart');
    await timeout(5000);
    let getResponse = await $.get('/');
    console.log('gR', getResponse)
/*
    await helper.admin$.get(`/?time=${new Date().getTime()}`).
      console.log(a,b,c);
      // expect(true).to.be(true);
    }).fail(() => {
      throw new Error('Unable to reconnect to Etherpad after restart')
    }).always((a,b,c) => {
      console.log(a,b,c);
    });
    */
  });

  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
});
