# utils/Cha
`require("./utils/Changeset");`

## Functions

- - -
### _slicerZipperFunc (attOp, csOp, opOut, pool)

* **attOp** *No description*
* **csOp** *No description*
* **opOut** *No description*
* **pool** *No description*

- - -
### appendATextToAssembler (atext, assem)

* **atext** *No description*
* **assem** *No description*

- - -
### applyToAText (cs, atext, pool)

* **cs** *No description*
* **atext** *No description*
* **pool** *No description*

- - -
### applyToAttribution (cs, astr, pool)

* **cs** *No description*
* **astr** *No description*
* **pool** *No description*

- - -
### applyToText (cs, str)

* **cs** *No description*
* **str** *No description*

- - -
### applyZip (in1, idx1, in2, idx2, func)

* **in1** *No description*
* **idx1** *No description*
* **in2** *No description*
* **idx2** *No description*
* **func** *No description*

- - -
### attribsAttributeValue (attribs, key, pool)

* **attribs** *No description*
* **key** *No description*
* **pool** *No description*

- - -
### attributeTester (attribPair, pool)

* **attribPair** *No description*
* **pool** *No description*

- - -
### builder (oldLen)

* **oldLen** *No description*

- - -
### characterRangeFollow (cs, startChar, endChar, insertionsAfter)

* **cs** *No description*
* **startChar** *No description*
* **endChar** *No description*
* **insertionsAfter** *No description*

- - -
### checkRep (cs)

* **cs** *No description*

- - -
### clearOp (op)

* **op** *No description*

- - -
### cloneAText (atext)

* **atext** *No description*

- - -
### cloneOp (op)

* **op** *No description*

- - -
### compose (cs1, cs2, pool)

* **cs1** *No description*
* **cs2** *No description*
* **pool** *No description*

- - -
### composeAttributes (att1, att2, resultIsMutation, pool)

* **att1** *No description*
* **att2** *No description*
* **resultIsMutation** *No description*
* **pool** *No description*

- - -
### copyAText (atext1, atext2)

* **atext1** *No description*
* **atext2** *No description*

- - -
### copyOp (op1, op2)

* **op1** *No description*
* **op2** *No description*

- - -
### eachAttribNumber (cs, func)

* **cs** *No description*
* **func** *No description*

- - -
### filterAttribNumbers (cs, filter)

* **cs** *No description*
* **filter** *No description*

- - -
### follow (cs1, cs2, reverseInsertOrder, pool)

* **cs1** *No description*
* **cs2** *No description*
* **reverseInsertOrder** *No description*
* **pool** *No description*

- - -
### followAttributes (att1, att2, pool)

* **att1** *No description*
* **att2** *No description*
* **pool** *No description*

- - -
### identity (N)

* **N** *No description*

- - -
### inverse (cs, lines, alines, pool)

* **cs** *No description*
* **lines** *No description*
* **alines** *No description*
* **pool** *No description*

- - -
### isIdentity (cs)

* **cs** *No description*

- - -
### joinAttributionLines (theAlines)

* **theAlines** *No description*

- - -
### makeAText (text, attribs)

* **text** *No description*
* **attribs** *No description*

- - -
### makeAttribsString (opcode, attribs, pool)

* **opcode** *No description*
* **attribs** *No description*
* **pool** *No description*

- - -
### makeAttribution (text)

* **text** *No description*

- - -
### makeSplice (oldFullText, spliceStart, numRemoved, newText, optNewTextAPairs, pool)

* **oldFullText** *No description*
* **spliceStart** *No description*
* **numRemoved** *No description*
* **newText** *No description*
* **optNewTextAPairs** *No description*
* **pool** *No description*

- - -
### mapAttribNumbers (cs, func)

* **cs** *No description*
* **func** *No description*

- - -
### mergingOpAssembler ()


- - -
### moveOpsToNewPool (cs, oldPool, newPool)

* **cs** *No description*
* **oldPool** *No description*
* **newPool** *No description*

- - -
### mutateAttributionLines (cs, lines, pool)

* **cs** *No description*
* **lines** *No description*
* **pool** *No description*

- - -
### mutateTextLines (cs, lines)

* **cs** *No description*
* **lines** *No description*

- - -
### newLen (cs)

* **cs** *No description*

- - -
### newOp (optOpcode)

* **optOpcode** *No description*

- - -
### numToString (num)

* **num** *No description*

- - -
### oldLen (cs)

* **cs** *No description*

- - -
### oneInsertedLineAtATimeOpIterator (opsStr, optStartIndex, charBank)

* **opsStr** *No description*
* **optStartIndex** *No description*
* **charBank** *No description*

- - -
### opAssembler ()


- - -
### opAttributeValue (op, key, pool)

* **op** *No description*
* **key** *No description*
* **pool** *No description*

- - -
### opIterator (opsStr, optStartIndex)

* **opsStr** *No description*
* **optStartIndex** *No description*

- - -
### opString (op)

* **op** *No description*

- - -
### pack (oldLen, newLen, opsStr, bank)

* **oldLen** *No description*
* **newLen** *No description*
* **opsStr** *No description*
* **bank** *No description*

- - -
### parseNum (str)

* **str** *No description*

- - -
### prepareForWire (cs, pool)

* **cs** *No description*
* **pool** *No description*

- - -
### smartOpAssembler ()


- - -
### splitAttributionLines (attrOps, text)

* **attrOps** *No description*
* **text** *No description*

- - -
### splitTextLines (text)

* **text** *No description*

- - -
### stringAssembler ()


- - -
### stringIterator (str)

* **str** *No description*

- - -
### stringOp (str)

* **str** *No description*

- - -
### subattribution (astr, start, optEnd)

* **astr** *No description*
* **start** *No description*
* **optEnd** *No description*

- - -
### textLinesMutator (lines)

* **lines** *No description*

- - -
### toBaseTen (cs)

* **cs** *No description*

- - -
### toSplices (cs)

* **cs** *No description*

- - -
### unpack (cs)

* **cs** *No description*

##Variables

- - -
### assert 


- - -
### error 


