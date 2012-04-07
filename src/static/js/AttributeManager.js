var Changeset = require('./Changeset');
var ChangesetUtils = require('./ChangesetUtils');
var _ = require('./underscore');

var AttributeManager = function(rep, applyChangesetCallback)
{
  this.rep = rep;
  this.applyChangesetCallback = applyChangesetCallback;
  this.author = '';
};

AttributeManager.prototype = _(AttributeManager.prototype).extend({
  
  applyChangeset: function(changeset){
    var cs = changeset.toString();
    if (!Changeset.isIdentity(cs))
    {
      this.applyChangesetCallback(cs);
    }
  },
  
  lineHasMarker: function(lineNum){
    // get "list" attribute of first char of line
    return this.getAttributeOnLine(lineNum, 'list');
  },
  
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
     
     // TODO
     
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