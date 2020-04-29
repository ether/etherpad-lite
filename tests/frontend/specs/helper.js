describe("the test helper", function(){
  describe("the newPad method", function(){
    xit("doesn't leak memory if you creates iframes over and over again", function(done){
      this.timeout(100000);

      var times = 10;

      var loadPad = function(){
        helper.newPad(function(){
          times--;
          if(times > 0){
            loadPad();
          } else {
            done();
          }
        })
      }

      loadPad();
    });

    it("gives me 3 jquery instances of chrome, outer and inner", function(done){
      this.timeout(10000);

      helper.newPad(function(){
        //check if the jquery selectors have the desired elements
        expect(helper.padChrome$("#editbar").length).to.be(1);
        expect(helper.padOuter$("#outerdocbody").length).to.be(1);
        expect(helper.padInner$("#innerdocbody").length).to.be(1);

        //check if the document object was set correctly
        expect(helper.padChrome$.window.document).to.be(helper.padChrome$.document);
        expect(helper.padOuter$.window.document).to.be(helper.padOuter$.document);
        expect(helper.padInner$.window.document).to.be(helper.padInner$.document);

        done();
      });
    });
  });

  describe("the waitFor method", function(){
    it("takes a timeout and waits long enough", function(done){
      this.timeout(2000);
      var startTime = Date.now();

      helper.waitFor(function(){
        return false;
      }, 1500).fail(function(){
        var duration = Date.now() - startTime;
        expect(duration).to.be.greaterThan(1400);
        done();
      });
    });

    it("takes an interval and checks on every interval", function(done){
      this.timeout(4000);
      var checks = 0;

      helper.waitFor(function(){
        checks++;
        return false;
      }, 2000, 100).fail(function(){
        expect(checks).to.be.greaterThan(10);
        expect(checks).to.be.lessThan(30);
        done();
      });
    });

    describe("returns a deferred object", function(){
      it("it calls done after success", function(done){
        helper.waitFor(function(){
          return true;
        }).done(function(){
          done();
        });
      });

      it("calls fail after failure", function(done){
        helper.waitFor(function(){
          return false;
        },0).fail(function(){
          done();
        });
      });

      xit("throws if you don't listen for fails", function(done){
        var onerror = window.onerror;
        window.onerror = function(){
          window.onerror = onerror;
          done();
        }

        helper.waitFor(function(){
          return false;
        },100);
      });
    });
  });

  describe("the selectLines method", function(){
    // function to support tests, use a single way to represent whitespaces
    var cleanText = function(text){
      return text
      // IE replaces line breaks with a whitespace, so we need to unify its behavior
      // for other browsers, to have all tests running for all browsers
      .replace(/\n/gi, "")
      .replace(/\s/gi, " ");
    }

    before(function(done){
      helper.newPad(function() {
        // create some lines to be used on the tests
        var $firstLine = helper.padInner$("div").first();
        $firstLine.sendkeys("{selectall}some{enter}short{enter}lines{enter}to test{enter}{enter}");

        // wait for lines to be split
        helper.waitFor(function(){
          var $fourthLine = helper.padInner$("div").eq(3);
          return $fourthLine.text() === "to test";
        }).done(done);
      });

      this.timeout(60000);
    });

    it("changes editor selection to be between startOffset of $startLine and endOffset of $endLine", function(done){
      var inner$ = helper.padInner$;

      var startOffset = 2;
      var endOffset   = 4;

      var $lines     = inner$("div");
      var $startLine = $lines.eq(1);
      var $endLine   = $lines.eq(3);

      helper.selectLines($startLine, $endLine, startOffset, endOffset);

      var selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(selection.toString().replace(/(\r\n|\n|\r)/gm,""))).to.be("ort lines to t");

      done();
    });

    it("ends selection at beginning of $endLine when it is an empty line", function(done){
      var inner$ = helper.padInner$;

      var startOffset = 2;
      var endOffset   = 1;

      var $lines     = inner$("div");
      var $startLine = $lines.eq(1);
      var $endLine   = $lines.eq(4);

      helper.selectLines($startLine, $endLine, startOffset, endOffset);

      var selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(selection.toString().replace(/(\r\n|\n|\r)/gm,""))).to.be("ort lines to test");

      done();
    });

    it("ends selection at beginning of $endLine when its offset is zero", function(done){
      var inner$ = helper.padInner$;

      var startOffset = 2;
      var endOffset   = 0;

      var $lines     = inner$("div");
      var $startLine = $lines.eq(1);
      var $endLine   = $lines.eq(3);

      helper.selectLines($startLine, $endLine, startOffset, endOffset);

      var selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(selection.toString().replace(/(\r\n|\n|\r)/gm,""))).to.be("ort lines ");

      done();
    });

    it("selects full line when offset is longer than line content", function(done){
      var inner$ = helper.padInner$;

      var startOffset = 2;
      var endOffset   = 50;

      var $lines     = inner$("div");
      var $startLine = $lines.eq(1);
      var $endLine   = $lines.eq(3);

      helper.selectLines($startLine, $endLine, startOffset, endOffset);

      var selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(selection.toString().replace(/(\r\n|\n|\r)/gm,""))).to.be("ort lines to test");

      done();
    });

    it("selects all text between beginning of $startLine and end of $endLine when no offset is provided", function(done){
      var inner$ = helper.padInner$;

      var $lines     = inner$("div");
      var $startLine = $lines.eq(1);
      var $endLine   = $lines.eq(3);

      helper.selectLines($startLine, $endLine);

      var selection = inner$.document.getSelection();

      /*
       * replace() is required here because Firefox keeps the line breaks.
       *
       * I'm not sure this is ideal behavior of getSelection() where the text
       * is not consistent between browsers but that's the situation so that's
       * how I'm covering it in this test.
       */
      expect(cleanText(selection.toString().replace(/(\r\n|\n|\r)/gm,""))).to.be("short lines to test");

      done();
    });
  });
});
