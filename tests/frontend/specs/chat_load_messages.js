describe("chat-load-messages", function(){
  it("create pad", function(done) {
    helper.newPad(done);
  });

  it("add a lot of messages", function(done) {
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
    setTimeout(function() {
      expect(chatText.children("p").length).to.be(messages);
      $('#iframe-container iframe')[0].contentWindow.location.reload();
      done();
     }, 500);
  });
  
  it("check initial message count", function(done) {
    setTimeout(function() {
      var chrome$ = $('#iframe-container iframe')[0].contentWindow.$;
      var chatButton = chrome$("#chaticon");
      chatButton.click();
      var chatText = chrome$("#chattext");
      
      expect(chatText.children("p").length).to.be(101);
      done();
    }, 500);
  });
  
  it("load more messages", function(done) {
    var chrome$ = $('#iframe-container iframe')[0].contentWindow.$;
    var chatButton = chrome$("#chaticon");
    chatButton.click();
    var chatText = chrome$("#chattext");
    var loadMsgBtn = chrome$("#chatloadmessagesbutton");
      
    loadMsgBtn.click();
    setTimeout(function() {
      expect(chatText.children("p").length).to.be(122);
      done();
    }, 500);
  });
  
  it("btn vanishes", function(done) {
    var chrome$ = $('#iframe-container iframe')[0].contentWindow.$;
    var chatButton = chrome$("#chaticon");
    chatButton.click();
    var chatText = chrome$("#chattext");
    var loadMsgBtn = chrome$("#chatloadmessagesbutton");

    loadMsgBtn.click();
    setTimeout(function() {
      expect(loadMsgBtn.css('display')).to.be('none');
      done();
    }, 200);
  });
});
