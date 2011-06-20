/**
 * The pad object, defined with joose
 */

var Changeset = require("../Changeset");
var AttributePoolFactory = require("../AttributePoolFactory");
var db = require("../db").db;
var async = require("async");
var settings = require('../settings');

/**
 * Copied from the Etherpad source code. It converts Windows line breaks to Unix line breaks and convert Tabs to spaces
 * @param txt
 */
exports.cleanText = function (txt) {
  return txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\t/g, '        ').replace(/\xa0/g, ' ');
}

Class('Pad', {

	// these are the properties
	has : {
		
		atext : { 
			is : 'rw', // readwrite
			init : function() { return Changeset.makeAText("\n"); } // first value
		}, // atext
		
		pool : { 
			is: 'rw', 
			init : function() { return AttributePoolFactory.createAttributePool(); },
			getterName : 'apool' // legacy
		}, // pool
		
		head : { 
			is : 'rw', 
			init : -1, 
			getterName : 'getHeadRevisionNumber' 
		}, // head
		
		id : { is : 'r' }
	},

	methods : {
	
		BUILD : function (id) 
		{
        return {
            'id' : id,
        }
    },
		
		appendRevision : function(aChangeset, author) 
		{
		
			if(!author)
				author = '';

		  var newAText = Changeset.applyToAText(aChangeset, this.atext, this.pool);
		  Changeset.copyAText(newAText, this.atext);
		  
		  var newRev = ++this.head;
		  
		  var newRevData = {};
		  newRevData.changeset = aChangeset;
		  newRevData.meta = {};
		  newRevData.meta.author = author;
		  newRevData.meta.timestamp = new Date().getTime();
		  
		  //ex. getNumForAuthor
		  if(author != '')
		    this.pool.putAttrib(['author', author || '']);
		  
		  if(newRev % 100 == 0)
		  {
		    newRevData.meta.atext = this.atext;
		  }
		  
		  db.set("pad:"+this.id+":revs:"+newRev, newRevData);
		  db.set("pad:"+this.id, {atext: this.atext, pool: this.pool.toJsonable(), head: this.head});
		}, //appendRevision
		
		getRevisionChangeset : function(revNum, callback) 
		{
			db.getSub("pad:"+this.id+":revs:"+revNum, ["changeset"], callback);
		}, // getRevisionChangeset
		
		getRevisionAuthor : function(revNum, callback) 
		{			
			db.getSub("pad:"+this.id+":revs:"+revNum, ["meta", "author"], callback);
		}, // getRevisionAuthor
		
		getRevisionDate : function(revNum, callback) 
		{			
			db.getSub("pad:"+this.id+":revs:"+revNum, ["meta", "timestamp"], callback);
		}, // getRevisionAuthor
		
		getAllAuthors : function() 
		{
		  var authors = [];
  
		  for(key in this.pool.numToAttrib)
		  {
		    if(this.pool.numToAttrib[key][0] == "author" && this.pool.numToAttrib[key][1] != "")
		    {
		      authors.push(this.pool.numToAttrib[key][1]);
		    }
		  }
		  
		  return authors;
		},
		
		getInternalRevisionAText : function(targetRev, callback) 
		{
		  var _this = this;
		
		  var keyRev = this.getKeyRevisionNumber(targetRev);
		  var atext; 
		  var changesets = [];
		  
		  //find out which changesets are needed
		  var neededChangesets = [];
		  var curRev = keyRev;
		  while (curRev < targetRev) 
		  {
        curRev++;
        neededChangesets.push(curRev);
      }
		  
		  async.series([
		    //get all needed data out of the database
		    function(callback)
		    {
		      async.parallel([
		        //get the atext of the key revision
		        function (callback)
		        {
		          db.getSub("pad:"+_this.id+":revs:"+keyRev, ["meta", "atext"], function(err, _atext)
		          {
		            atext = Changeset.cloneAText(_atext);
		            callback(err);
		          });
		        },
		        //get all needed changesets
		        function (callback)
		        {
		          async.forEach(neededChangesets, function(item, callback)
		          {
		            _this.getRevisionChangeset(item, function(err, changeset)
		            {
		              changesets[item] = changeset;
		              callback(err);
		            });
		          }, callback);
		        }
		      ], callback);
		    },
		    //apply all changesets to the key changeset
		    function(callback)
		    {		    
          var apool = _this.apool();
          var curRev = keyRev;
          
          while (curRev < targetRev) 
          {
            curRev++;
            var cs = changesets[curRev];
            atext = Changeset.applyToAText(cs, atext, apool);
          }
          
          callback(null);
		    }  
		  ], function(err)
		  {
		    callback(err, atext);
		  });
		},
		
		getKeyRevisionNumber : function(revNum)
		{
		  return Math.floor(revNum / 100) * 100;
		},
		
		text : function()
		{
			return this.atext.text;
		},
		
		init : function (callback) 
		{		
		  var _this = this;
		
		  //try to load the pad	
    	db.get("pad:"+this.id, function(err, value)
    	{
    	  if(err)
    	  {
    	    callback(err, null);
    	    return;
    	  }  
    	  
    	  //if this pad exists, load it
    	  if(value != null)
    	  {
    	    _this.head = value.head;
    	    _this.atext = value.atext;
    	    _this.pool = _this.pool.fromJsonable(value.pool);
    	  }
    	  //this pad doesn't exist, so create it
    	  else
    	  {
    	    var firstChangeset = Changeset.makeSplice("\n", 0, 0, exports.cleanText(settings.defaultPadText));                      
    	
  		    _this.appendRevision(firstChangeset, '');
    	  }
    	  
    	  callback(null);
    	});
    } 
		
	}, // methods
});
