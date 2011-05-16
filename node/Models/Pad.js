var Changeset = require("../Changeset");
var AttributePoolFactory = require("../AttributePoolFactory");

exports.startText = "Welcome to Etherpad Lite.  This pad text is synchronized as you type, so that everyone viewing this page sees the same text.";

/**
 * Copied from the Etherpad source code, don't know what its good for
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
		
		rev : { 
			is : 'rw', 
			init : [] 
		}, // rev
		
		head : { 
			is : 'rw', 
			init : -1, 
			getterName : 'getHeadRevisionNumber' 
		}, // head
		
		authors : { 
			is : 'rw', 
			init : []
		},
		
		id : { is : 'rw' }
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
		  this.rev[newRev] = {};
		  this.rev[newRev].changeset = aChangeset;
		  this.rev[newRev].meta = {};
		  this.rev[newRev].meta.author = author;
		  this.rev[newRev].meta.timestamp = new Date().getTime();
		  
		  //ex. getNumForAuthor
		  if(author != '')
		    this.pool.putAttrib(['author', author || '']);
		  
		  if(newRev % 100 == 0)
		  {
		    this.rev[newRev].meta.atext = this.atext;
		  }
		  
		}, //appendRevision
		
		getRevisionChangeset : function(revNum) 
		{
			
			if(revNum < this.rev.length) 
			{
				return this.rev[revNum].changeset;
			} else {
				throw 'this revision does not exist! : ' + revNum;
				return null;
			}
			
		}, // getRevisionChangeset
		
		getRevisionAuthor : function(revNum) 
		{
			if(revNum < this.rev.length) 
			{
			  return this.rev[revNum].meta.author;
			} else {
				throw 'this revision author does not exist! : ' + revNum;
				return null;
			}
			
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
		
		text : function()
		{
			return this.atext.text;
		}
		
	}, // methods
	
	
	after : {
	
		initialize : function (props) 
		{			
    	this.id = props.id;
    	
    	var firstChangeset = Changeset.makeSplice("\n", 0, 0, exports.cleanText(exports.startText));                      
    	
  		this.appendRevision(firstChangeset, '');
    } 
	
	}
});
