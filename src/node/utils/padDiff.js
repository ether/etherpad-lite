var Changeset = require("../../static/js/Changeset");
var async = require("async");
var exportHtml = require('./ExportHtml');
 
function PadDiff (pad, fromRev, toRev){      
  //check parameters
  if(!pad || !pad.id || !pad.atext || !pad.pool)
  {
    throw new Error('Invalid pad');
  }
 
  var range = pad.getValidRevisionRange(fromRev, toRev);
  if(!range) { throw new Error('Invalid revision range.' + 
      ' startRev: ' + fromRev +
      ' endRev: ' + toRev); }
  
  this._pad = pad;
  this._fromRev = range.startRev;
  this._toRev = range.endRev;
  this._html = null;
  this._authors = [];
}
 
PadDiff.prototype._isClearAuthorship = function(changeset){
  //unpack
  var unpacked = Changeset.unpack(changeset);
  
  //check if there is nothing in the charBank
  if(unpacked.charBank !== "")
    return false;
  
  //check if oldLength == newLength
  if(unpacked.oldLen !== unpacked.newLen)
    return false;
 
  //lets iterator over the operators
  var iterator = Changeset.opIterator(unpacked.ops);
  
  //get the first operator, this should be a clear operator
  var clearOperator = iterator.next();
  
  //check if there is only one operator
  if(iterator.hasNext() === true)
    return false;
    
  //check if this operator doesn't change text
  if(clearOperator.opcode !== "=")
    return false;
    
  //check that this operator applys to the complete text
  //if the text ends with a new line, its exactly one character less, else it has the same length
  if(clearOperator.chars !== unpacked.oldLen-1 && clearOperator.chars !== unpacked.oldLen)
    return false;
  
  var attributes = [];
  Changeset.eachAttribNumber(changeset, function(attrNum){
    attributes.push(attrNum);
  });
    
  //check that this changeset uses only one attribute
  if(attributes.length !== 1)
    return false;
    
  var appliedAttribute = this._pad.pool.getAttrib(attributes[0]);
  
  //check if the applied attribute is an anonymous author attribute
  if(appliedAttribute[0] !== "author" || appliedAttribute[1] !== "")
    return false;
    
  return true;
};
 
PadDiff.prototype._createClearAuthorship = function(rev, callback){
  var self = this;
  this._pad.getInternalRevisionAText(rev, function(err, atext){
   if(err){
     return callback(err);
   }
   
   //build clearAuthorship changeset
   var builder = Changeset.builder(atext.text.length);
   builder.keepText(atext.text, [['author','']], self._pad.pool);
   var changeset = builder.toString();
   
   callback(null, changeset);
  });
};
 
PadDiff.prototype._createClearStartAtext = function(rev, callback){
  var self = this;
  
  //get the atext of this revision
  this._pad.getInternalRevisionAText(rev, function(err, atext){
   if(err){
     return callback(err);
   }
   
   //create the clearAuthorship changeset
   self._createClearAuthorship(rev, function(err, changeset){
     if(err){
       return callback(err);
     }
   
     //apply the clearAuthorship changeset
     var newAText = Changeset.applyToAText(changeset, atext, self._pad.pool);
     
     callback(null, newAText);
   });
  });
};
 
PadDiff.prototype._getChangesetsInBulk = function(startRev, count, callback) {
  var self = this;
  
  //find out which revisions we need
  var revisions = [];
  for(var i=startRev;i<(startRev+count) && i<=this._pad.head;i++){
    revisions.push(i);
  }
  
  var changesets = [], authors = [];
  
  //get all needed revisions
  async.forEach(revisions, function(rev, callback){
    self._pad.getRevision(rev, function(err, revision){
      if(err){
        return callback(err);
      }
      
      var arrayNum = rev-startRev;
      
      changesets[arrayNum] = revision.changeset;
      authors[arrayNum] = revision.meta.author;
  
      callback();
    });
  }, function(err){
    callback(err, changesets, authors);
  });
};
 
PadDiff.prototype._addAuthors = function(authors) {
  var self = this;
  //add to array if not in the array
  authors.forEach(function(author){
    if(self._authors.indexOf(author) == -1){
      self._authors.push(author);
    }
  });
};
 
PadDiff.prototype._createDiffAtext = function(callback) {
  var self = this;
  var bulkSize = 100;
  
  //get the cleaned startAText
  self._createClearStartAtext(self._fromRev, function(err, atext){
    if(err) { return callback(err); }
    
    var superChangeset = null;
    
    var rev = self._fromRev + 1;
 
    //async while loop
    async.whilst(
      //loop condition
      function () { return rev <= self._toRev; },
      
      //loop body
      function (callback) {
        //get the bulk
        self._getChangesetsInBulk(rev,bulkSize,function(err, changesets, authors){
          var addedAuthors = [];
          
          //run trough all changesets
          for(var i=0;i<changesets.length && (rev+i)<=self._toRev;i++){
            var changeset = changesets[i];
            
            //skip clearAuthorship Changesets
            if(self._isClearAuthorship(changeset)){
              continue;
            }
            
            changeset = self._extendChangesetWithAuthor(changeset, authors[i], self._pad.pool);
            
            //add this author to the authorarray
            addedAuthors.push(authors[i]);
            
            //compose it with the superChangset            
            if(superChangeset === null){
              superChangeset = changeset;
            } else {           
              superChangeset = Changeset.composeWithDeletions(superChangeset, changeset, self._pad.pool);
            }
          }
          
          //add the authors to the PadDiff authorArray
          self._addAuthors(addedAuthors);
        
          //lets continue with the next bulk 
          rev += bulkSize;
          callback();
        });
      },
      
      //after the loop has ended
      function (err) {
        //if there are only clearAuthorship changesets, we don't get a superChangeset, so we can skip this step
        if(superChangeset){
          var deletionChangeset = self._createDeletionChangeset(superChangeset,atext,self._pad.pool);
        
          //apply the superChangeset, which includes all addings
          atext = Changeset.applyToAText(superChangeset,atext,self._pad.pool);
          //apply the deletionChangeset, which adds a deletions
          atext = Changeset.applyToAText(deletionChangeset,atext,self._pad.pool);
        }      
 
        callback(err, atext);
      }
    );
  });
};
 
PadDiff.prototype.getHtml = function(callback){
  //cache the html
  if(this._html != null){
    return callback(null, this._html);
  }
  
  var self = this;
  var atext, html, authorColors;
  
  async.series([
    //get the diff atext
    function(callback){
      self._createDiffAtext(function(err, _atext){
        if(err){
          return callback(err);
        }
        
        atext = _atext;
        callback();
      });
    },
    //get the authorColor table
    function(callback){
      self._pad.getAllAuthorColors(function(err, _authorColors){
        if(err){
          return callback(err);
        }
        
        authorColors = _authorColors;
        callback();
      });
    },
    //convert the atext to html
    function(callback){
      html = exportHtml.getHTMLFromAtext(self._pad, atext, authorColors);
      self._html = html;
      callback();
    }
  ], function(err){
    callback(err, html);
  });
};
 
PadDiff.prototype.getAuthors = function(callback){
  var self = this;
  
  //check if html was already produced, if not produce it, this generates the author array at the same time
  if(self._html == null){
    self.getHtml(function(err){
      if(err){
        return callback(err);
      }
      
      callback(null, self._authors);
    });
  } else {
    callback(null, self._authors);
  }
};
 
PadDiff.prototype._extendChangesetWithAuthor = function(changeset, author, apool) {  
  //unpack
  var unpacked = Changeset.unpack(changeset);  
  
  var iterator = Changeset.opIterator(unpacked.ops);
  var assem = Changeset.opAssembler();
  
  //create deleted attribs
  var authorAttrib = apool.putAttrib(["author", author || ""]);
  var deletedAttrib = apool.putAttrib(["removed", true]);
  var attribs = "*" + Changeset.numToString(authorAttrib) + "*" + Changeset.numToString(deletedAttrib);
  
  //iteratore over the operators of the changeset
  while(iterator.hasNext()){
    var operator = iterator.next();
    
    //this is a delete operator, extend it with the author
    if(operator.opcode === "-"){
      operator.attribs = attribs;
    } 
    //this is operator changes only attributes, let's mark which author did that
    else if(operator.opcode === "=" && operator.attribs){
      operator.attribs+="*"+Changeset.numToString(authorAttrib);
    }
    
    //append the new operator to our assembler
    assem.append(operator);
  }
  
  //return the modified changeset
  return Changeset.pack(unpacked.oldLen, unpacked.newLen, assem.toString(), unpacked.charBank);
};
 
//this method is 80% like Changeset.inverse. I just changed so instead of reverting, it adds deletions and attribute changes to to the atext.
PadDiff.prototype._createDeletionChangeset = function(cs, startAText, apool) {
  var lines = Changeset.splitTextLines(startAText.text);
  var alines = Changeset.splitAttributionLines(startAText.attribs, startAText.text);
  
  // lines and alines are what the exports is meant to apply to.
  // They may be arrays or objects with .get(i) and .length methods.
  // They include final newlines on lines.
 
  function lines_get(idx) {
    if (lines.get) {
      return lines.get(idx);
    } else {
      return lines[idx];
    }
  }
 
  function lines_length() {
    if ((typeof lines.length) == "number") {
      return lines.length;
    } else {
      return lines.length();
    }
  }
 
  function alines_get(idx) {
    if (alines.get) {
      return alines.get(idx);
    } else {
      return alines[idx];
    }
  }
 
  function alines_length() {
    if ((typeof alines.length) == "number") {
      return alines.length;
    } else {
      return alines.length();
    }
  }
 
  var curLine = 0;
  var curChar = 0;
  var curLineOpIter = null;
  var curLineOpIterLine;
  var curLineNextOp = Changeset.newOp('+');
 
  var unpacked = Changeset.unpack(cs);
  var csIter = Changeset.opIterator(unpacked.ops);
  var builder = Changeset.builder(unpacked.newLen);
 
  function consumeAttribRuns(numChars, func /*(len, attribs, endsLine)*/ ) {
 
    if ((!curLineOpIter) || (curLineOpIterLine != curLine)) {
      // create curLineOpIter and advance it to curChar
      curLineOpIter = Changeset.opIterator(alines_get(curLine));
      curLineOpIterLine = curLine;
      var indexIntoLine = 0;
      var done = false;
      while (!done) {
        curLineOpIter.next(curLineNextOp);
        if (indexIntoLine + curLineNextOp.chars >= curChar) {
          curLineNextOp.chars -= (curChar - indexIntoLine);
          done = true;
        } else {
          indexIntoLine += curLineNextOp.chars;
        }
      }
    }
 
    while (numChars > 0) {
      if ((!curLineNextOp.chars) && (!curLineOpIter.hasNext())) {
        curLine++;
        curChar = 0;
        curLineOpIterLine = curLine;
        curLineNextOp.chars = 0;
        curLineOpIter = Changeset.opIterator(alines_get(curLine));
      }
      if (!curLineNextOp.chars) {
        curLineOpIter.next(curLineNextOp);
      }
      var charsToUse = Math.min(numChars, curLineNextOp.chars);
      func(charsToUse, curLineNextOp.attribs, charsToUse == curLineNextOp.chars && curLineNextOp.lines > 0);
      numChars -= charsToUse;
      curLineNextOp.chars -= charsToUse;
      curChar += charsToUse;
    }
 
    if ((!curLineNextOp.chars) && (!curLineOpIter.hasNext())) {
      curLine++;
      curChar = 0;
    }
  }
 
  function skip(N, L) {
    if (L) {
      curLine += L;
      curChar = 0;
    } else {
      if (curLineOpIter && curLineOpIterLine == curLine) {
        consumeAttribRuns(N, function () {});
      } else {
        curChar += N;
      }
    }
  }
 
  function nextText(numChars) {
    var len = 0;
    var assem = Changeset.stringAssembler();
    var firstString = lines_get(curLine).substring(curChar);
    len += firstString.length;
    assem.append(firstString);
 
    var lineNum = curLine + 1;
    while (len < numChars) {
      var nextString = lines_get(lineNum);
      len += nextString.length;
      assem.append(nextString);
      lineNum++;
    }
 
    return assem.toString().substring(0, numChars);
  }
 
  function cachedStrFunc(func) {
    var cache = {};
    return function (s) {
      if (!cache[s]) {
        cache[s] = func(s);
      }
      return cache[s];
    };
  }
 
  var attribKeys = [];
  var attribValues = [];
 
  //iterate over all operators of this changeset
  while (csIter.hasNext()) {
    var csOp = csIter.next();
 
    if (csOp.opcode == '=') {      
      var textBank = nextText(csOp.chars);
 
      // decide if this equal operator is an attribution change or not. We can see this by checkinf if attribs is set.
      // If the text this operator applies to is only a star, than this is a false positive and should be ignored
      if (csOp.attribs && textBank != "*") {
        var deletedAttrib = apool.putAttrib(["removed", true]);
        var authorAttrib = apool.putAttrib(["author", ""]);
 
        attribKeys.length = 0;
        attribValues.length = 0;
        Changeset.eachAttribNumber(csOp.attribs, function (n) {
          attribKeys.push(apool.getAttribKey(n));
          attribValues.push(apool.getAttribValue(n));
 
          if(apool.getAttribKey(n) === "author"){
            authorAttrib = n;
          }
        });
 
        var undoBackToAttribs = cachedStrFunc(function (attribs) {
          var backAttribs = [];
          for (var i = 0; i < attribKeys.length; i++) {
            var appliedKey = attribKeys[i];
            var appliedValue = attribValues[i];
            var oldValue = Changeset.attribsAttributeValue(attribs, appliedKey, apool);
            if (appliedValue != oldValue) {
              backAttribs.push([appliedKey, oldValue]);
            }
          }
          return Changeset.makeAttribsString('=', backAttribs, apool);
        });
 
        var oldAttribsAddition = "*" + Changeset.numToString(deletedAttrib) + "*" + Changeset.numToString(authorAttrib);
 
        var textLeftToProcess = textBank;
 
        while(textLeftToProcess.length > 0){
          //process till the next line break or process only one line break
          var lengthToProcess = textLeftToProcess.indexOf("\n");
          var lineBreak = false;
          switch(lengthToProcess){
            case -1: 
              lengthToProcess=textLeftToProcess.length;
              break;
            case 0:
              lineBreak = true;
              lengthToProcess=1;
              break;
          }
 
          //get the text we want to procceed in this step
          var processText = textLeftToProcess.substr(0, lengthToProcess);
          textLeftToProcess = textLeftToProcess.substr(lengthToProcess);
 
          if(lineBreak){
            builder.keep(1, 1); //just skip linebreaks, don't do a insert + keep for a linebreak
 
            //consume the attributes of this linebreak
            consumeAttribRuns(1, function(){});
          } else {
            //add the old text via an insert, but add a deletion attribute + the author attribute of the author who deleted it
            var textBankIndex = 0;
            consumeAttribRuns(lengthToProcess, function (len, attribs, endsLine) {
              //get the old attributes back
              var attribs = (undoBackToAttribs(attribs) || "") + oldAttribsAddition;
 
              builder.insert(processText.substr(textBankIndex, len), attribs);
              textBankIndex += len;
            });
 
            builder.keep(lengthToProcess, 0);
          }
        }
      } else {
        skip(csOp.chars, csOp.lines);
        builder.keep(csOp.chars, csOp.lines);
      }
    } else if (csOp.opcode == '+') {
      builder.keep(csOp.chars, csOp.lines);
    } else if (csOp.opcode == '-') {
      var textBank = nextText(csOp.chars);
      var textBankIndex = 0;
      
      consumeAttribRuns(csOp.chars, function (len, attribs, endsLine) {
        builder.insert(textBank.substr(textBankIndex, len), attribs + csOp.attribs);
        textBankIndex += len;
      });
    }
  }
 
  return Changeset.checkRep(builder.toString());
};
 
//export the constructor
module.exports = PadDiff;
