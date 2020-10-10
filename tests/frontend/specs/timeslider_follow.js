describe("timeslider", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(6000);
  });

  it("follow content as it's added to timeslider", function(done) { // passes
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;

    // make some changes to produce 100 revisions
    var timePerRev = 900
      , revs = 10;
    this.timeout(revs*timePerRev+10000);
    for(var i=0; i < revs; i++) {
      setTimeout(function() {
        // enter 'a' in the first text element
        inner$("div").last().sendkeys('a\n');
        inner$("div").last().sendkeys('{enter}');
        inner$("div").last().sendkeys('{enter}');
        inner$("div").last().sendkeys('{enter}');
        inner$("div").last().sendkeys('{enter}');
      }, timePerRev*i);
    }

    setTimeout(function() {
      // go to timeslider
      $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider#0');

      setTimeout(function() {
        var timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
        var $sliderBar = timeslider$('#ui-slider-bar');

        var latestContents = timeslider$('#innerdocbody').text();

        // set to follow contents as it arrives
        timeslider$('#options-followContents').prop("checked", true);

        var originalTop = timeslider$('#innerdocbody').offset();
        timeslider$('#playpause_button_icon').click();

        setTimeout(function() {
          //make sure the text has changed
          var newTop = timeslider$('#innerdocbody').offset();
          expect( originalTop ).not.to.eql( newTop );
          done();
        }, 1000);

      }, 2000);
    }, revs*timePerRev);
  });

  it("follows only to lines that exist in the current pad view", function(done){
    let inner$ = helper.padInner$;
    let chrome$ = helper.padChrome$;
    // use substring() here because empty lines are collapsed (they don't contain &nbsp;)
    // that's why the text differs from the timeslider text of rev 0 below
    let rev0text = inner$('#innerdocbody').text().substring(0,10);
    let rev1text = "\xa0"; // timeslider will add &nbsp;
    let rev2text = 'Test line'
    inner$('body').empty()
    helper.waitFor(function(){
      return inner$('div').length == 1;
    }).done(function(){
      inner$('div').append("<p>"+rev2text+"</p>");
      helper.waitFor(function(){
        return inner$('div').length == 2;
      }).done(function(){
        $('#iframe-container iframe').attr('src', $('#iframe-container iframe').attr('src')+'/timeslider#0');
        let timeslider$;
        let $sliderBar;
        helper.waitFor(function(){
          timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
          if (typeof timeslider$ === 'function'){
            return timeslider$('#innerdocbody').text().substring(0,10) == rev0text;
          }
          return false;
        }, 5000).done(function(){
          timeslider$('#rightstep').click();
          helper.waitFor(function(){
            return timeslider$('#innerdocbody').text() == rev1text;
          }).done(function(){
            timeslider$('#rightstep').click();
            helper.waitFor(function(){
              return timeslider$('#innerdocbody').text() == "\xa0"+rev2text;
            }).done(function(){
              timeslider$('#leftstep').click();
              helper.waitFor(function(){
                return timeslider$('#innerdocbody').text() == rev1text;
              }).done(function(){
                timeslider$('#leftstep').click();
                helper.waitFor(function(){
                  return timeslider$('#innerdocbody').text().substring(0,10) == rev0text;
                }).done(function(){
                  done();
                })
              })
            })
          })
        })
      })
    })
  })
});

