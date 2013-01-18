describe("chat-load-messages", function(){
  var padName;
 
  it("creates a pad", function(done) {
    padName = helper.newPad(done);
    this.timeout(60000);
  });

  it("adds a lot of messages", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    var chatButton = chrome$("#chaticon");
    chatButton.click();
    var chatInput = chrome$("#chatinput");
    var chatText = chrome$("#chattext");
    
    this.timeout(60000);
    
    var messages = 140;
    for(var i=1; i <= messages; i++) {
      var num = ''+i;
      if(num.length == 1)
        num = '00'+num;
      if(num.length == 2)
        num = '0'+num;
      chatInput.sendkeys('msg' + num);
      chatInput.sendkeys('{enter}');
    }
    helper.waitFor(function(){
      return chatText.children("p").length == messages;
    }, 60000).always(function(){
      expect(chatText.children("p").length).to.be(messages);
      helper.newPad(done, padName);
     });
  });
  
  it("checks initial message count", function(done) {
    var chatText;
    var expectedCount = 101;
    var chrome$ = helper.padChrome$;
    helper.waitFor(function(){
      var chatButton = chrome$("#chaticon");
      chatButton.click();
      chatText = chrome$("#chattext");
      return chatText.children("p").length == expectedCount;
    }).always(function(){
      expect(chatText.children("p").length).to.be(expectedCount);
      done();
    });
  });
  
  it("loads more messages", function(done) {
    var expectedCount = 122;
    var chrome$ = helper.padChrome$;
    var chatButton = chrome$("#chaticon");
    chatButton.click();
    var chatText = chrome$("#chattext");
    var loadMsgBtn = chrome$("#chatloadmessagesbutton");
      
    loadMsgBtn.click();
    helper.waitFor(function(){
      return chatText.children("p").length == expectedCount;
    }).always(function(){
      expect(chatText.children("p").length).to.be(expectedCount);
      done();
    });
  });
  
  it("checks for button vanishing", function(done) {
    var expectedDisplay = 'none';
    var chrome$ = helper.padChrome$;
    var chatButton = chrome$("#chaticon");
    chatButton.click();
    var chatText = chrome$("#chattext");
    var loadMsgBtn = chrome$("#chatloadmessagesbutton");
    var loadMsgBall = chrome$("#chatloadmessagesball");

    loadMsgBtn.click();
    helper.waitFor(function(){
      return loadMsgBtn.css('display')  == expectedDisplay &&
             loadMsgBall.css('display') == expectedDisplay;
    }).always(function(){
      expect(loadMsgBtn.css('display')).to.be(expectedDisplay);
      expect(loadMsgBall.css('display')).to.be(expectedDisplay);
      done();
    });
  });
});
