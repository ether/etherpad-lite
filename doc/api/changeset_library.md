# Changeset Library

```
"Z:z>1|2=m=b*0|1+1$\n"
```

This is a Changeset. Its just a string and its very difficult to read in this form. But the Changeset Library gives us some tools to read it.

A changeset describes the diff between two revisions of the document. The Browser sends changesets to the server and the server sends them to the clients to update them. This Changesets gets also saved into the history of a pad. Which allows us to go back to every revision from the past.

## Changeset.unpack(changeset)

 * `changeset` {String}

This functions returns an object representaion of the changeset, similar to this:

```
{ oldLen: 35, newLen: 36, ops: '|2=m=b*0|1+1', charBank: '\n' }
```

 * `oldLen` {Number} the original length of the document.
 * `newLen` {Number} the length of the document after the changeset is applied.
 * `ops` {String} the actual changes, introduced by this changeset.
 * `charBank` {String} All characters that are added by this changeset.

## Changeset.opIterator(ops)

 * `ops` {String} The operators, returned by `Changeset.unpack()`

Returns an operator iterator. This iterator allows us to iterate over all operators that are in the changeset.

You can iterate with an opIterator using its `next()` and `hasNext()` methods. Next returns the `next()` operator object and `hasNext()` indicates, whether there are any operators left.

## The Operator object
There are 3 types of operators: `+`,`-` and `=`. These operators describe different changes to the document, beginning with the first character of the document. A `=` operator doesn't change the text, but it may add or remove text attributes. A `-` operator removes text. And a `+` Operator adds text and optionally adds some attributes to it.

 * `opcode` {String} the operator type
 * `chars` {Number} the length of the text changed by this operator.
 * `lines` {Number} the number of lines changed by this operator.
 * `attribs` {attribs} attributes set on this text.

### Example
```
{ opcode: '+',
  chars: 1,
  lines: 1,
  attribs: '*0' }
```

## APool

```
> var AttributePoolFactory = require("./utils/AttributePoolFactory");
> var apool = AttributePoolFactory.createAttributePool();
> console.log(apool)
{ numToAttrib: {},
  attribToNum: {},
  nextNum: 0,
  putAttrib: [Function],
  getAttrib: [Function],
  getAttribKey: [Function],
  getAttribValue: [Function],
  eachAttrib: [Function],
  toJsonable: [Function],
  fromJsonable: [Function] }
```

This creates an empty apool. A apool saves which attributes were used during the history of a pad. There is one apool for each pad. It only saves the attributes that were really used, it doesn't save unused attributes. Lets fill this apool with some values

```
> apool.fromJsonable({"numToAttrib":{"0":["author","a.kVnWeomPADAT2pn9"],"1":["bold","true"],"2":["italic","true"]},"nextNum":3});
> console.log(apool)
{ numToAttrib: 
   { '0': [ 'author', 'a.kVnWeomPADAT2pn9' ],
     '1': [ 'bold', 'true' ],
     '2': [ 'italic', 'true' ] },
  attribToNum: 
   { 'author,a.kVnWeomPADAT2pn9': 0,
     'bold,true': 1,
     'italic,true': 2 },
  nextNum: 3,
  putAttrib: [Function],
  getAttrib: [Function],
  getAttribKey: [Function],
  getAttribValue: [Function],
  eachAttrib: [Function],
  toJsonable: [Function],
  fromJsonable: [Function] }
```

We used the fromJsonable function to fill the empty apool with values. the fromJsonable and toJsonable functions are used to serialize and deserialize an apool. You can see that it stores the relation between numbers and attributes. So for example the attribute 1 is the attribute bold and vise versa. A attribute is always a key value pair. For stuff like bold and italic its just  'italic':'true'. For authors its author:$AUTHORID. So a character can be bold and italic. But it can't belong to multiple authors

```
> apool.getAttrib(1)
[ 'bold', 'true' ]
```

Simple example of how to get the key value pair for the attribute 1

## AText

```
> var atext = {"text":"bold text\nitalic text\nnormal text\n\n","attribs":"*0*1+9*0|1+1*0*1*2+b|1+1*0+b|2+2"};
> console.log(atext)
{ text: 'bold text\nitalic text\nnormal text\n\n',
  attribs: '*0*1+9*0|1+1*0*1*2+b|1+1*0+b|2+2' }
```

This is an atext. An atext has two parts: text and attribs. The text is just the text of the pad as a string. We will look closer at the attribs at the next steps

```
> var opiterator = Changeset.opIterator(atext.attribs)
> console.log(opiterator)
{ next: [Function: next],
  hasNext: [Function: hasNext],
  lastIndex: [Function: lastIndex] }
> opiterator.next()
{ opcode: '+',
  chars: 9,
  lines: 0,
  attribs: '*0*1' }
> opiterator.next()
{ opcode: '+',
  chars: 1,
  lines: 1,
  attribs: '*0' }
> opiterator.next()
{ opcode: '+',
  chars: 11,
  lines: 0,
  attribs: '*0*1*2' }
> opiterator.next()
{ opcode: '+',
  chars: 1,
  lines: 1,
  attribs: '' }
> opiterator.next()
{ opcode: '+',
  chars: 11,
  lines: 0,
  attribs: '*0' }
> opiterator.next()
{ opcode: '+',
  chars: 2,
  lines: 2,
  attribs: '' }
```

The attribs are again a bunch of operators like .ops in the changeset was. But these operators are only + operators. They describe which part of the text has which attributes

For more information see /doc/easysync/easysync-notes.txt in the source.
