describe("embed links", function(){
  var objectify = function (str)
  {
    var hash = {};
    var parts = str.split('&');
    for(var i = 0; i < parts.length; i++)
    {
      var keyValue = parts[i].split('=');
      hash[keyValue[0]] = keyValue[1];
    }
    return hash;
  }

  var checkiFrameCode = function(embedCode, readonly){
    //turn the code into an html element
    var $embediFrame = $(embedCode);

    //read and check the frame attributes
    var width = $embediFrame.attr("width");
    var height = $embediFrame.attr("height");
    var name = $embediFrame.attr("name");
    expect(width).to.be('600');
    expect(height).to.be('400');
    expect(name).to.be(readonly ? "embed_readonly" : "embed_readwrite");

    //parse the url
    var src = $embediFrame.attr("src");
    var questionMark = src.indexOf("?");
    var url = src.substr(0,questionMark);
    var paramsStr = src.substr(questionMark+1);
    var params = objectify(paramsStr);

    var expectedParams = {
      showControls:     'true'
    , showChat:         'true'
    , showLineNumbers:  'true'
    , useMonospaceFont: 'false'
    }

    //check the url
    if(readonly){
      expect(url.indexOf("r.") > 0).to.be(true);
    } else {
      expect(url).to.be(helper.padChrome$.window.location.href);
    }

    //check if all parts of the url are like expected
    expect(params).to.eql(expectedParams);
  }

  describe("read and write", function(){
    //create a new pad before each test run
    beforeEach(function(cb){
      helper.newPad(cb);
      this.timeout(60000);
    });

    describe("the share link", function(){
      it("is the actual pad url", function(done){
        var chrome$ = helper.padChrome$;

        //open share dropdown
        chrome$(".buttonicon-embed").click();

        //get the link of the share field + the actual pad url and compare them
        var shareLink = chrome$("#linkinput").val();
        var padURL = chrome$.window.location.href;
        expect(shareLink).to.be(padURL);

        done();
      });
    });

    describe("the embed as iframe code", function(){
      it("is an iframe with the the correct url parameters and correct size", function(done){
        var chrome$ = helper.padChrome$;

        //open share dropdown
        chrome$(".buttonicon-embed").click();

        //get the link of the share field + the actual pad url and compare them
        var embedCode = chrome$("#embedinput").val();

        checkiFrameCode(embedCode, false)

        done();
      });
    });
  });

  describe("when read only option is set", function(){
    beforeEach(function(cb){
      helper.newPad(cb);
      this.timeout(60000);
    });

    describe("the share link", function(){
      it("shows a read only url", function(done){
        var chrome$ = helper.padChrome$;

        //open share dropdown
        chrome$(".buttonicon-embed").click();
        chrome$('#readonlyinput').click();
        chrome$('#readonlyinput:checkbox:not(:checked)').attr('checked', 'checked');

        //get the link of the share field + the actual pad url and compare them
        var shareLink = chrome$("#linkinput").val();
        var containsReadOnlyLink = shareLink.indexOf("r.") > 0
        expect(containsReadOnlyLink).to.be(true);

        done();
      });
    });

    describe("the embed as iframe code", function(){
      it("is an iframe with the the correct url parameters and correct size", function(done){
        var chrome$ = helper.padChrome$;

        //open share dropdown
        chrome$(".buttonicon-embed").click();
        //check read only checkbox, a bit hacky
        chrome$('#readonlyinput').click();
        chrome$('#readonlyinput:checkbox:not(:checked)').attr('checked', 'checked');


        //get the link of the share field + the actual pad url and compare them
        var embedCode = chrome$("#embedinput").val();

        checkiFrameCode(embedCode, true);

        done();
      });
    });

  });
});
