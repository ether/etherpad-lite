var Changeset = require('./Changeset');
var ChangesetUtils = require('./ChangesetUtils');
var _ = require('./underscore');

var lineMarkerAttribute = 'lmkr';

// If one of these attributes are set to the first character of a 
// line it is considered as a line attribute marker i.e. attributes
// set on this marker are applied to the whole line. 
// The list attribute is only maintained for compatibility reasons
var lineAttributes = [lineMarkerAttribute,'list'];

/*
  The Attribute manager builds changesets based on a document 
  representation for setting and removing range or line-based attributes.
  
  @param rep the document representation to be used
  @param applyChangesetCallback this callback will be called 
    once a changeset has been built.
    
    
  A document representation contains 
  - an array `alines` containing 1 attributes string for each line 
  - an Attribute pool `apool`
  - a SkipList `lines` containing the text lines of the document.
*/

var AttributeManager = function(rep, applyChangesetCallback)
{
  this.rep = rep;
  this.applyChangesetCallback = applyChangesetCallback;
  this.author = '';
  
  // If the first char in a line has one of the following attributes
  // it will be considered as a line marker
};

AttributeManager.lineAttributes = lineAttributes;

AttributeManager.prototype = _(AttributeManager.prototype).extend({
  
  applyChangeset: function(changeset){
    if(!this.applyChangesetCallback) return changeset;
    
    var cs = changeset.toString();
    if (!Changeset.isIdentity(cs))
    {
      this.applyChangesetCallback(cs);
    }
    
    return changeset;
  },
  
  /*
    Sets attributes on a range
    @param start [row, col] tuple pointing to the start of the range
    @param end [row, col] tuple pointing to the end of the range
    @param attribute: an array of attributes
  */
  setAttributesOnRange: function(start, end, attribs)
  {
    var builder = Changeset.builder(this.rep.lines.totalWidth());
    ChangesetUtils.buildKeepToStartOfRange(this.rep, builder, start);
    ChangesetUtils.buildKeepRange(this.rep, builder, start, end, attribs, this.rep.apool);
    return this.applyChangeset(builder);
  },

  /* 
    Returns if the line already has a line marker
    @param lineNum: the number of the line
  */
  lineHasMarker: function(lineNum){
    var that = this;
    
    return _.find(lineAttributes, function(attribute){
      return that.getAttributeOnLine(lineNum, attribute) != ''; 
    }) !== undefined;
  },
  
  /*
    Gets a specified attribute on a line
    @param lineNum: the number of the line to set the attribute for
    @param attributeKey: the name of the attribute to get, e.g. list  
  */
  getAttributeOnLine: function(lineNum, attributeName){
    // get  `attributeName` attribute of first char of line
    var aline = this.rep.alines[lineNum];
    if (aline)
    {
      var opIter = Changeset.opIterator(aline);
      if (opIter.hasNext())
      {
        return Changeset.opAttributeValue(opIter.next(), attributeName, this.rep.apool) || '';
      }
    }
    return '';
  },
  
  /*
    Gets all attributes on a line
    @param lineNum: the number of the line to get the attribute for 
  */
  getAttributesOnLine: function(lineNum){
    // get attributes of first char of line
    var aline = this.rep.alines[lineNum];
    var attributes = []
    if (aline)
    {
      var opIter = Changeset.opIterator(aline)
        , op
      if (opIter.hasNext())
      {
        op = opIter.next()
        if(!op.attribs) return []
        
        Changeset.eachAttribNumber(op.attribs, function(n) {
          attributes.push([this.rep.apool.getAttribKey(n), this.rep.apool.getAttribValue(n)])
        }.bind(this))
        return attributes;
      }
    }
    return [];
  },
  
  /*
    Gets all attributes at a position containing line number and column
    @param lineNumber starting with zero
    @param column starting with zero
    returns a list of attributes in the format 
    [ ["key","value"], ["key","value"], ...  ]
  */
  getAttributesOnPosition: function(lineNumber, column){
    // get all attributes of the line
    var aline = this.rep.alines[lineNumber];
    
    if (!aline) {
        return [];
    }
    // iterate through all operations of a line
    var opIter = Changeset.opIterator(aline);
    
    // we need to sum up how much characters each operations take until the wanted position
    var currentPointer = 0;
    var attributes = [];    
    var currentOperation;
    
    while (opIter.hasNext()) {
      currentOperation = opIter.next();
      currentPointer = currentPointer + currentOperation.chars;      
      
      if (currentPointer > column) {
        // we got the operation of the wanted position, now collect all its attributes
        Changeset.eachAttribNumber(currentOperation.attribs, function (n) {
          attributes.push([
            this.rep.apool.getAttribKey(n),
            this.rep.apool.getAttribValue(n)
          ]);
        }.bind(this));
        
        // skip the loop
        return attributes;
      }
    }
    return attributes;
    
  },
  
  /*
    Gets all attributes at caret position 
    if the user selected a range, the start of the selection is taken
    returns a list of attributes in the format 
    [ ["key","value"], ["key","value"], ...  ]
  */
  getAttributesOnCaret: function(){
    return this.getAttributesOnPosition(this.rep.selStart[0], this.rep.selStart[1]);
  },
  
  /*
    Sets a specified attribute on a line
    @param lineNum: the number of the line to set the attribute for
    @param attributeKey: the name of the attribute to set, e.g. list
    @param attributeValue: an optional parameter to pass to the attribute (e.g. indention level)
  
  */
  setAttributeOnLine: function(lineNum, attributeName, attributeValue){
    var loc = [0,0];
    var builder = Changeset.builder(this.rep.lines.totalWidth());
    var hasMarker = this.lineHasMarker(lineNum);
    
    ChangesetUtils.buildKeepRange(this.rep, builder, loc, (loc = [lineNum, 0]));

    if(hasMarker){
      ChangesetUtils.buildKeepRange(this.rep, builder, loc, (loc = [lineNum, 1]), [
        [attributeName, attributeValue]
      ], this.rep.apool);
    }else{      
        // add a line marker
        builder.insert('*', [
          ['author', this.author],
          ['insertorder', 'first'],
          [lineMarkerAttribute, '1'],
          [attributeName, attributeValue]
        ], this.rep.apool);
    }
    
    return this.applyChangeset(builder);
  },
  
 /**
   * Removes a specified attribute on a line
   *  @param lineNum the number of the affected line
   *  @param attributeName the name of the attribute to remove, e.g. list
   *  @param attributeValue if given only attributes with equal value will be removed
   */
 removeAttributeOnLine: function(lineNum, attributeName, attributeValue){
   var builder = Changeset.builder(this.rep.lines.totalWidth());
   var hasMarker = this.lineHasMarker(lineNum);
   var found = false;

   var attribs = _(this.getAttributesOnLine(lineNum)).map(function (attrib) {
     if (attrib[0] === attributeName && (!attributeValue || attrib[0] === attributeValue)){
       found = true;
       return [attributeName, ''];
     }
     return attrib;
   });

   if (!found) {
     return;
   }

   ChangesetUtils.buildKeepToStartOfRange(this.rep, builder, [lineNum, 0]);

   var countAttribsWithMarker = _.chain(attribs).filter(function(a){return !!a[1];})
     .map(function(a){return a[0];}).difference(['author', 'lmkr', 'insertorder', 'start']).size().value();

   //if we have marker and any of attributes don't need to have marker. we need delete it
   if(hasMarker && !countAttribsWithMarker){
     ChangesetUtils.buildRemoveRange(this.rep, builder, [lineNum, 0], [lineNum, 1]);
   }else{
     ChangesetUtils.buildKeepRange(this.rep, builder, [lineNum, 0], [lineNum, 1], attribs, this.rep.apool);
   }

   return this.applyChangeset(builder);
 },
  
   /*
     Toggles a line attribute for the specified line number
     If a line attribute with the specified name exists with any value it will be removed
     Otherwise it will be set to the given value
     @param lineNum: the number of the line to toggle the attribute for
     @param attributeKey: the name of the attribute to toggle, e.g. list
     @param attributeValue: the value to pass to the attribute (e.g. indention level)
  */
  toggleAttributeOnLine: function(lineNum, attributeName, attributeValue) {
    return this.getAttributeOnLine(lineNum, attributeName) ?
      this.removeAttributeOnLine(lineNum, attributeName) :
      this.setAttributeOnLine(lineNum, attributeName, attributeValue);
    
  }
});

module.exports = AttributeManager;
