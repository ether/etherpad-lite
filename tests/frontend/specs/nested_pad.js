var expectedUrl = "/p/demo/nested/pad/action";
var expectedString = "This is the Etherpad {padName} document";

var expectedSentence = function (padName) {
  return expectedString.replace("{padName}", padName);
}

var expectedUrlPadId = function (url){
  return url.replace("/p/", "").replace(/\//g, ":");
}

describe("Nested Pad funcnality", function(){
  
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb, expectedUrl);
    this.timeout(60000);
  });

  var padName = null;
  var getFnPadId = null;
  var clientVarsPadId = null;

  it("The staticRootAddress property must point to the URL origin.", function (done) {
    var urlPathName = helper.padChrome$.window.location.pathname;
    var staticRootAddress = helper.padChrome$.window.clientVars.staticRootAddress;

    urlPathName = urlPathName
      .split("/")
      .filter(x=> x.length)
      .map(path => "../")
      .join("");

      expect(staticRootAddress === urlPathName).to.be(true);
      done();
  })

  it("Get padId and PadName and then check the convention.", function (done) {
    var chrome$ = helper.padChrome$;
    var expectedPadId = expectedUrlPadId(expectedUrl);
    clientVarsPadId = chrome$.window.clientVars.padId;
    padName = chrome$.window.clientVars.padName;
  
    helper.waitFor(function(){
      return (clientVarsPadId === expectedPadId) && (expectedPadId.endsWith(padName));
    }).done(done);
  })

  it("clientVars and getpadId function id must be the same.", function (done) {
    getFnPadId = helper.padChrome$.window.pad.getPadId();
    helper.waitFor(function(){
      return (clientVarsPadId === getFnPadId) && (getFnPadId.endsWith(padName));
    }).done(done);
  })
  
  it("Write down Pad Name sentence for readOnly and timeslider test", function (done){
    var inner$ = helper.padInner$;
    var firstLine = inner$("div").first();
    var expectedFirstLine = expectedSentence(padName);
    firstLine.sendkeys('{selectall}'); // select all
    firstLine.sendkeys('{del}'); // clear the first line
    firstLine.sendkeys(expectedFirstLine);
    helper.waitFor(function(){
      return inner$("div").first().text() === expectedFirstLine;
    }, 2000).done(done);
  });

  it("Export txt and html first line must have expected string", function (done){
    var results = helper.requestAjaxExportPad(helper.padChrome$.window.location.href);
    var expectedFirstLine = expectedSentence(padName);
    expect(results[0][1].includes(expectedFirstLine)).to.be(true);
    expect(results[1][1].includes(expectedFirstLine)).to.be(true);
    done();
  });

});

describe("Nested Pad readOnly functionality", function(){

  it("Open share modal and get the readOnly pad address, then check if it's valid.", function (done) {
    var chrome$ = helper.padChrome$;
    //open share modal
    chrome$('#readonlyinput').click();
    chrome$('#readonlyinput:checkbox:not(:checked)').attr('checked', 'checked');
    var readOnlyAddress = chrome$("#linkinput").val();
    var readOnelyPadId = readOnlyAddress.split("/").pop();
    var clientVarsReadOnlyId = helper.padChrome$.window.clientVars.readOnlyId;

    expect(clientVarsReadOnlyId).to.equal(readOnelyPadId);
    
    this.timeout(30000);
    helper.waitFor(function(){
      $('#iframe-container iframe').attr('src', readOnlyAddress);
      return true;
    }, 12000).done(function(){
      setTimeout(function () { done(); }, 4000);
    });
  });

  it("padId and readOnlyId must be the same.", function (done) {
    var clientVarsReadOnlyId = helper.padChrome$.window.clientVars.readOnlyId;
    var clientVarsPadId = helper.padChrome$.window.clientVars.padId;
    expect(clientVarsReadOnlyId).to.equal(clientVarsPadId);
    done();
  });

  it("The readOnly contents of the pad must have the content of the previous pad.", function (done) {
    var inner$ = helper.padInner$;
    var padName = expectedUrl.split('/').pop();
    var firstLine = inner$("div").first();
    var expectedFirstLine = expectedSentence(padName);
    expect(firstLine.text()).to.equal(expectedFirstLine);
    done();
  });

});

describe("Nested Pad timeslider functionality", function(){
  var TimesliderPadName, TimesliderPadId;
  it("Navigate to readOnly timeslider", function (done) {
    this.timeout(30000);
    helper.waitFor(function(){
      $('#iframe-container iframe').attr('src', expectedUrl+'/timeslider');
      return true;
    }, 120000).done(function(){
      setTimeout(function () { done(); }, 4000);
    });
  });

  it("check padId, padName and the timeslider url address", function (done) {
    var chrome$ = helper.padChrome$;
    var iframPath = chrome$.window.location.pathname;
    TimesliderPadName = chrome$.window.clientVars.padName;
    TimesliderPadId = chrome$.window.clientVars.padId;
    var expectedTimesliderPadId = expectedUrlPadId(expectedUrl);

    var mathcPadId = TimesliderPadId === expectedTimesliderPadId;
    var urlEndWithTimeslider = iframPath.endsWith("timeslider");
    var timesliderPadNameExpect = TimesliderPadName === iframPath.split('/').slice(-2, -1).pop();

    expect(mathcPadId).to.be(true);
    expect(urlEndWithTimeslider).to.be(true);
    expect(timesliderPadNameExpect).to.be(true);

    done();
  })

  it("Check the first line to see if the pad name is written.", function (done) {
    var inner$ = helper.padInner$;
    var timesliderFirstLine = inner$("div").first().text();
    helper.waitFor(function(){
      return timesliderFirstLine === expectedSentence(TimesliderPadName);
    }, 2000).done(done);
  });

});
