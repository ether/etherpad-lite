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
      this.timeout(5000);

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
      var startTime = new Date().getTime();

      helper.waitFor(function(){
        return false;	
      }, 1500).fail(function(){
      	var duration = new Date().getTime() - startTime;
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
});