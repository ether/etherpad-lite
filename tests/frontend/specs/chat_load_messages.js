describe("chat-load-messages", function(){
  it("creates a pad", function(done) {
    helper.newPad(done);
  });

  it("adds a lot of messages", function(done) {
    var inner$ = helper.padInner$; 
    var chrome$ = helper.padChrome$; 
    var chatButton = chrome$("#chaticon");
    chatButton.click();
    var chatInput = chrome$("#chatinput");
    var chatText = chrome$("#chattext");
    
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
    }).always(function(){
      expect(chatText.children("p").length).to.be(messages);
      $('#iframe-container iframe')[0].contentWindow.location.reload();
      done();
     });
  });
  
  it("checks initial message count", function(done) {
    var chatText;
    var expectedCount = 101;
    helper.waitFor(function(){
      // wait for the frame to load
      var chrome$ = $('#iframe-container iframe')[0].contentWindow.$;
      if(!chrome$) // page not fully loaded
        return false;
    
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
    var chrome$ = $('#iframe-container iframe')[0].contentWindow.$;
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
    var chrome$ = $('#iframe-container iframe')[0].contentWindow.$;
    var chatButton = chrome$("#chaticon");
    chatButton.click();
    var chatText = chrome$("#chattext");
    var loadMsgBtn = chrome$("#chatloadmessagesbutton");

    loadMsgBtn.click();
    helper.waitFor(function(){
      return loadMsgBtn.css('display') == expectedDisplay;
    }).always(function(){
      expect(loadMsgBtn.css('display')).to.be(expectedDisplay);
      done();
    });
  });
});
