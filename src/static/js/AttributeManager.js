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
  
  /*
     Removes a specified attribute on a line
     @param lineNum: the number of the affected line
     @param attributeKey: the name of the attribute to remove, e.g. list

   */
   removeAttributeOnLine: function(lineNum, attributeName, attributeValue){
     
     var loc = [0,0];
     var builder = Changeset.builder(this.rep.lines.totalWidth());
     var hasMarker = this.lineHasMarker(lineNum);
     
     if(hasMarker){
       ChangesetUtils.buildKeepRange(this.rep, builder, loc, (loc = [lineNum, 0]));
       ChangesetUtils.buildRemoveRange(this.rep, builder, loc, (loc = [lineNum, 1]));
     }
     
     return this.applyChangeset(builder);
   },
  
   /*
     Sets a specified attribute on a line
     @param lineNum: the number of the line to set the attribute for
     @param attributeKey: the name of the attribute to set, e.g. list
     @param attributeValue: an optional parameter to pass to the attribute (e.g. indention level)
  */
  toggleAttributeOnLine: function(lineNum, attributeName, attributeValue) {
    return this.getAttributeOnLine(attributeName) ?
      this.removeAttributeOnLine(lineNum, attributeName) :
      this.setAttributeOnLine(lineNum, attributeName, attributeValue);
    
  }
});

module.exports = AttributeManager;