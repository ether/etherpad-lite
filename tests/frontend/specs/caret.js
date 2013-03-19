describe("As the caret is moved is the UI properly updated?", function(){
  var padName;
  var numberOfRows = 50;

  it("creates a pad", function(done) {
    padName = helper.newPad(done);
    this.timeout(60000);
  });

  /* Tests to do
  * Keystroke up (38), down (40), left (37), right (39) with and without special keys IE control / shift
  * Page up (33) / down (34) with and without special keys
  * Page up on the first line shouldn't move the viewport
  * Down down on the last line shouldn't move the viewport
  * Down arrow on any other line except the last lines shouldn't move the viewport
  * Do all of the above tests after a copy/paste event
  */

  /* Challenges
  * How do we keep the authors focus on a line if the lines above the author are modified?  We should only redraw the user to a location if they are typing and make sure shift and arrow keys aren't redrawing the UI else highlight - copy/paste would get broken
  * How can we simulate an edit event in the test framework?
  */

  // THIS DOESNT WORK AS IT DOESNT MOVE THE CURSOR!
  it("down arrow", function(done){
    var inner$ = helper.padInner$;
    var $newFirstTextElement = inner$("div").first();
    $newFirstTextElement.focus();
    keyEvent(inner$, 37, false, false); // arrow down
    keyEvent(inner$, 37, false, false); // arrow down

    done();
  });
/*
  it("Creates N lines", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$;
    var $newFirstTextElement = inner$("div").first();

    prepareDocument(numberOfRows, $newFirstTextElement); // N lines into the first div as a target
    helper.waitFor(function(){ // Wait for the DOM to register the new items
      return inner$("div").first().text().length == 6;
    }).done(function(){ // Once the DOM has registered the items
      done();
    });
  });

  it("Moves caret up a line", function(done){
    var inner$ = helper.padInner$;
    var $newFirstTextElement = inner$("div").first();
    var originalCaretPosition = caretPosition(inner$);
    var originalPos = originalCaretPosition.y;
    var newCaretPos;
    keyEvent(inner$, 38, false, false); // arrow up

    helper.waitFor(function(){ // Wait for the DOM to register the new items
      var newCaretPosition = caretPosition(inner$);
      newCaretPos = newCaretPosition.y;
      return (newCaretPos < originalPos);
    }).done(function(){
      expect(newCaretPos).to.be.lessThan(originalPos);
      done();
    });
  });

  it("Moves caret down a line", function(done){
    var inner$ = helper.padInner$;
    var $newFirstTextElement = inner$("div").first();
    var originalCaretPosition = caretPosition(inner$);
    var originalPos = originalCaretPosition.y;
    var newCaretPos;
    keyEvent(inner$, 40, false, false); // arrow down

    helper.waitFor(function(){ // Wait for the DOM to register the new items
      var newCaretPosition = caretPosition(inner$);
      newCaretPos = newCaretPosition.y;
      return (newCaretPos > originalPos);
    }).done(function(){
      expect(newCaretPos).to.be.moreThan(originalPos);
      done();
    });
  });

  it("Moves caret to top of doc", function(done){
    var inner$ = helper.padInner$;
    var $newFirstTextElement = inner$("div").first();
    var originalCaretPosition = caretPosition(inner$);
    var originalPos = originalCaretPosition.y;
    var newCaretPos;

    var i = 0;
    while(i < numberOfRows){ // press pageup key N times
      keyEvent(inner$, 33, false, false);
      i++;
    }

    helper.waitFor(function(){ // Wait for the DOM to register the new items
      var newCaretPosition = caretPosition(inner$);
      newCaretPos = newCaretPosition.y;
      return (newCaretPos < originalPos);
    }).done(function(){
      expect(newCaretPos).to.be.lessThan(originalPos);
      done();
    });
  });

  it("Moves caret right a position", function(done){
    var inner$ = helper.padInner$;
    var $newFirstTextElement = inner$("div").first();
    var originalCaretPosition = caretPosition(inner$);
    var originalPos = originalCaretPosition.x;
    var newCaretPos;
    keyEvent(inner$, 39, false, false); // arrow right

    helper.waitFor(function(){ // Wait for the DOM to register the new items
      var newCaretPosition = caretPosition(inner$);
      newCaretPos = newCaretPosition.x;
      return (newCaretPos > originalPos);
    }).done(function(){
      expect(newCaretPos).to.be.moreThan(originalPos);
      done();
    });
  });

  it("Moves caret left a position", function(done){
    var inner$ = helper.padInner$;
    var $newFirstTextElement = inner$("div").first();
    var originalCaretPosition = caretPosition(inner$);
    var originalPos = originalCaretPosition.x;
    var newCaretPos;
    keyEvent(inner$, 33, false, false); // arrow left

    helper.waitFor(function(){ // Wait for the DOM to register the new items
      var newCaretPosition = caretPosition(inner$);
      newCaretPos = newCaretPosition.x;
      return (newCaretPos < originalPos);
    }).done(function(){
      expect(newCaretPos).to.be.lessThan(originalPos);
      done();
    });
  });

  it("Moves caret to the next line using right arrow", function(done){
    var inner$ = helper.padInner$;
    var $newFirstTextElement = inner$("div").first();
    var originalCaretPosition = caretPosition(inner$);
    var originalPos = originalCaretPosition.y;
    var newCaretPos;
    keyEvent(inner$, 39, false, false); // arrow right
    keyEvent(inner$, 39, false, false); // arrow right
    keyEvent(inner$, 39, false, false); // arrow right
    keyEvent(inner$, 39, false, false); // arrow right
    keyEvent(inner$, 39, false, false); // arrow right
    keyEvent(inner$, 39, false, false); // arrow right
    keyEvent(inner$, 39, false, false); // arrow right

    helper.waitFor(function(){ // Wait for the DOM to register the new items
      var newCaretPosition = caretPosition(inner$);
      newCaretPos = newCaretPosition.y;
      return (newCaretPos > originalPos);
    }).done(function(){
      expect(newCaretPos).to.be.moreThan(originalPos);
      done();
    });
  });

  it("Moves caret to the previous line using left arrow", function(done){
    var inner$ = helper.padInner$;
    var $newFirstTextElement = inner$("div").first();
    var originalCaretPosition = caretPosition(inner$);
    var originalPos = originalCaretPosition.y;
    var newCaretPos;
    keyEvent(inner$, 33, false, false); // arrow left

    helper.waitFor(function(){ // Wait for the DOM to register the new items
      var newCaretPosition = caretPosition(inner$);
      newCaretPos = newCaretPosition.y;
      return (newCaretPos < originalPos);
    }).done(function(){
      expect(newCaretPos).to.be.lessThan(originalPos);
      done();
    });
  });



/*
  it("Creates N rows, changes height of rows, updates UI by caret key events", function(done){
    var inner$ = helper.padInner$;
    var chrome$ = helper.padChrome$; 
    var numberOfRows = 50;
    
    //ace creates a new dom element when you press a keystroke, so just get the first text element again
    var $newFirstTextElement = inner$("div").first();
    var originalDivHeight = inner$("div").first().css("height");
    prepareDocument(numberOfRows, $newFirstTextElement); // N lines into the first div as a target

    helper.waitFor(function(){ // Wait for the DOM to register the new items
      return inner$("div").first().text().length == 6;
    }).done(function(){ // Once the DOM has registered the items
      inner$("div").each(function(index){ // Randomize the item heights (replicates images / headings etc)
        var random = Math.floor(Math.random() * (50)) + 20;
        $(this).css("height", random+"px"); 
      });

      console.log(caretPosition(inner$));
      var newDivHeight = inner$("div").first().css("height");
      var heightHasChanged = originalDivHeight != newDivHeight; // has the new div height changed from the original div height
      expect(heightHasChanged).to.be(true); // expect the first line to be blank
    });

    // Is this Element now visible to the pad user?
    helper.waitFor(function(){ // Wait for the DOM to register the new items
      return isScrolledIntoView(inner$("div:nth-child("+numberOfRows+")"), inner$); // Wait for the DOM to scroll into place
    }).done(function(){ // Once the DOM has registered the items
      inner$("div").each(function(index){ // Randomize the item heights (replicates images / headings etc)
        var random = Math.floor(Math.random() * (80 - 20 + 1)) + 20;
        $(this).css("height", random+"px");
      });

      var newDivHeight = inner$("div").first().css("height");
      var heightHasChanged = originalDivHeight != newDivHeight; // has the new div height changed from the original div height
      expect(heightHasChanged).to.be(true); // expect the first line to be blank
    });
    var i = 0;
    while(i < numberOfRows){ // press down arrow
console.log("dwn");
      keyEvent(inner$, 40, false, false);
      i++;
    }

    // Does scrolling back up the pad with the up arrow show the correct contents?
    helper.waitFor(function(){ // Wait for the new position to be in place
      try{
        return isScrolledIntoView(inner$("div:nth-child("+numberOfRows+")"), inner$); // Wait for the DOM to scroll into place
      }catch(e){
        return false;
      }
    }).done(function(){ // Once the DOM has registered the items

      var i = 0;
      while(i < numberOfRows){ // press down arrow
        keyEvent(inner$, 33, false, false); // doesn't work
        i++;
      }
  
      // Does scrolling back up the pad with the up arrow show the correct contents?
      helper.waitFor(function(){ // Wait for the new position to be in place
        try{
          return isScrolledIntoView(inner$("div:nth-child(0)"), inner$); // Wait for the DOM to scroll into place
        }catch(e){
          return false;
        }
      }).done(function(){ // Once the DOM has registered the items



      });
   });


     var i = 0;
      while(i < numberOfRows){ // press down arrow
        keyEvent(inner$, 33, false, false); // doesn't work
        i++;
      }


    // Does scrolling back up the pad with the up arrow show the correct contents?
    helper.waitFor(function(){ // Wait for the new position to be in place
      return isScrolledIntoView(inner$("div:nth-child(1)"), inner$); // Wait for the DOM to scroll into place
    }).done(function(){ // Once the DOM has registered the items
      expect(true).to.be(true); 
      done();
    });
*/

});

function prepareDocument(n, target){ // generates a random document with random content on n lines
  var i = 0;
  while(i < n){ // for each line
    target.sendkeys(makeStr()); // generate a random string and send that to the editor
    target.sendkeys('{enter}'); // generator an enter keypress
    i++; // rinse n times
  }
}

function keyEvent(target, charCode, ctrl, shift){ // sends a charCode to the window
  if(target.browser.mozilla){ // if it's a mozilla browser
    var evtType = "keypress";
  }else{
    var evtType = "keydown";
  }
  var e = target.Event(evtType);
  console.log(e);
  if(ctrl){
    e.ctrlKey = true; // Control key
  }
  if(shift){
    e.shiftKey = true; // Shift Key
  }
  e.which = charCode; 
  e.keyCode = charCode;
  target("#innerdocbody").trigger(e);
}


function makeStr(){ // from http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 5; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

function isScrolledIntoView(elem, $){ // from http://stackoverflow.com/questions/487073/check-if-element-is-visible-after-scrolling
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top; // how far the element is from the top of it's container
    var elemBottom = elemTop + $(elem).height(); // how far plus the height of the elem..  IE is it all in?
    elemBottom = elemBottom - 16; // don't ask, sorry but this is needed..
    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}

function caretPosition($){
  var doc = $.window.document;
  var pos = doc.getSelection();
  pos.y = pos.anchorNode.parentElement.offsetTop;
  pos.x = pos.anchorNode.parentElement.offsetLeft;
  console.log(pos);
  return pos;
}
