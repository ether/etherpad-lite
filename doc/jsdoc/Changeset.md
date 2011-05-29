#Changeset
`require("./Changeset");`

Copyright 2009 Google Inc., 2011 Peter 'Pita' Martischka
* Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
*      http://www.apache.org/licenses/LICENSE-2.0
* Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS-IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

##Functions

###_slicerZipperFunc (attOp, csOp, opOut, pool)

* **attOp** 
* **csOp** 
* **opOut** 
* **pool** 

###appendATextToAssembler (atext, assem)

* **atext** 
* **assem** 

###applyToAText (cs, atext, pool)

* **cs** 
* **atext** 
* **pool** 

###applyToAttribution (cs, astr, pool)

* **cs** 
* **astr** 
* **pool** 

###applyToText (cs, str)

* **cs** 
* **str** 

###applyZip (in1, idx1, in2, idx2, func)

* **in1** 
* **idx1** 
* **in2** 
* **idx2** 
* **func** 

###attribsAttributeValue (attribs, key, pool)

* **attribs** 
* **key** 
* **pool** 

###attributeTester (attribPair, pool)

* **attribPair** 
* **pool** 

###builder (oldLen)

* **oldLen** 

###characterRangeFollow (cs, startChar, endChar, insertionsAfter)

* **cs** 
* **startChar** 
* **endChar** 
* **insertionsAfter** 

###checkRep (cs)

* **cs** 

###clearOp (op)

* **op** 

###cloneAText (atext)

* **atext** 

###cloneOp (op)

* **op** 

###compose (cs1, cs2, pool)

* **cs1** 
* **cs2** 
* **pool** 

###composeAttributes (att1, att2, resultIsMutation, pool)

* **att1** 
* **att2** 
* **resultIsMutation** 
* **pool** 

###copyAText (atext1, atext2)

* **atext1** 
* **atext2** 

###copyOp (op1, op2)

* **op1** 
* **op2** 

###eachAttribNumber (cs, func)

* **cs** 
* **func** 

###filterAttribNumbers (cs, filter)

* **cs** 
* **filter** 

###follow (cs1, cs2, reverseInsertOrder, pool)

* **cs1** 
* **cs2** 
* **reverseInsertOrder** 
* **pool** 

###followAttributes (att1, att2, pool)

* **att1** 
* **att2** 
* **pool** 

###identity (N)

* **N** 

###inverse (cs, lines, alines, pool)

* **cs** 
* **lines** 
* **alines** 
* **pool** 

###isIdentity (cs)

* **cs** 

###joinAttributionLines (theAlines)

* **theAlines** 

###makeAText (text, attribs)

* **text** 
* **attribs** 

###makeAttribsString (opcode, attribs, pool)

* **opcode** 
* **attribs** 
* **pool** 

###makeAttribution (text)

* **text** 

###makeSplice (oldFullText, spliceStart, numRemoved, newText, optNewTextAPairs, pool)

* **oldFullText** 
* **spliceStart** 
* **numRemoved** 
* **newText** 
* **optNewTextAPairs** 
* **pool** 

###mapAttribNumbers (cs, func)

* **cs** 
* **func** 

###mergingOpAssembler ()

* **** 

###moveOpsToNewPool (cs, oldPool, newPool)

* **cs** 
* **oldPool** 
* **newPool** 

###mutateAttributionLines (cs, lines, pool)
Copyright 2009 Google Inc., 2011 Peter 'Pita' Martischka
* Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
*      http://www.apache.org/licenses/LICENSE-2.0
* Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS-IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

* **cs** 
* **lines** 
* **pool** 

###mutateTextLines (cs, lines)

* **cs** 
* **lines** 

###newLen (cs)

* **cs** 

###newOp (optOpcode)

* **optOpcode** 

###numToString (num)

* **num** 

###oldLen (cs)

* **cs** 

###oneInsertedLineAtATimeOpIterator (opsStr, optStartIndex, charBank)

* **opsStr** 
* **optStartIndex** 
* **charBank** 

###opAssembler ()

* **** 

###opAttributeValue (op, key, pool)

* **op** 
* **key** 
* **pool** 

###opIterator (opsStr, optStartIndex)

* **opsStr** 
* **optStartIndex** 

###opString (op)

* **op** 

###pack (oldLen, newLen, opsStr, bank)

* **oldLen** 
* **newLen** 
* **opsStr** 
* **bank** 

###parseNum (str)

* **str** 

###prepareForWire (cs, pool)

* **cs** 
* **pool** 

###smartOpAssembler ()

* **** 

###splitAttributionLines (attrOps, text)

* **attrOps** 
* **text** 

###splitTextLines (text)

* **text** 

###stringAssembler ()

* **** 

###stringIterator (str)

* **str** 

###stringOp (str)

* **str** 

###subattribution (astr, start, optEnd)

* **astr** 
* **start** 
* **optEnd** 

###textLinesMutator (lines)

* **lines** 

###toBaseTen (cs)

* **cs** 

###toSplices (cs)

* **cs** 

###unpack (cs)

* **cs** 

##Variables

###assert 


###error 


