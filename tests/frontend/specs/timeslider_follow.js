describe("timeslider follow", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
  });

  it("content as it's added to timeslider", async function() {
    // send 3 revisions
    let revs = 3;
    let message = 'a\n\n\n\n\n\n\n\n\n\n';
    let newLines = message.split('\n').length
    for (let i=0;i<revs;i++){
      await helper.edit(message, newLines*i + 1);
    }

    await helper.gotoTimeslider(0);
    await helper.waitForPromise(function(){return helper.contentWindow().location.hash === '#0'})

    let originalTop = helper.contentWindow().$('#innerdocbody').offset();

    // set to follow contents as it arrives
    helper.contentWindow().$('#options-followContents').prop("checked", true);
    helper.contentWindow().$('#playpause_button_icon').click();

    let newTop;
    return helper.waitForPromise(function(){
      newTop = helper.contentWindow().$('#innerdocbody').offset();
      return newTop.top < originalTop.top;
    })
  });

  it("only to lines that exist in the current pad view #4389", async function(){
    let rev0text = helper.textLines()[0];
    let rev1text = "\xa0"; // timeslider will add &nbsp;
    let rev2text = 'Test line'

    helper.padInner$('body').empty();
    await helper.waitForPromise(function(){
      return helper.commits.length === 1; 
    })
    await helper.edit(rev2text)

    await helper.gotoTimeslider();

    helper.contentWindow().$('#leftstep').click();
    await helper.waitForPromise(function(){
      return helper.timesliderTextLines()[0] === rev1text;
    })

    helper.contentWindow().$('#leftstep').click();
    await helper.waitForPromise(function(){
      return helper.timesliderTextLines()[0] === rev0text;
    })

    helper.contentWindow().$('#rightstep').click();
    await helper.waitForPromise(function(){
      return helper.timesliderTextLines()[0] === rev1text;
    })

    helper.contentWindow().$('#rightstep').click();
    return helper.waitForPromise(function(){
      return helper.timesliderTextLines()[0] === rev2text;
    })
  })
});

