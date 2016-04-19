# editorInfo

## editorInfo.ace_replaceRange(start, end, text)
This function replaces a range (from `start` to `end`) with `text`.

## editorInfo.ace_getRep()
Returns the `rep` object.

## editorInfo.ace_getAuthor()
## editorInfo.ace_inCallStack()
## editorInfo.ace_inCallStackIfNecessary(?)
## editorInfo.ace_focus(?)
## editorInfo.ace_importText(?)
## editorInfo.ace_importAText(?)
## editorInfo.ace_exportText(?)
## editorInfo.ace_editorChangedSize(?)
## editorInfo.ace_setOnKeyPress(?)
## editorInfo.ace_setOnKeyDown(?)
## editorInfo.ace_setNotifyDirty(?)
## editorInfo.ace_dispose(?)
## editorInfo.ace_getFormattedCode(?)
## editorInfo.ace_setEditable(bool)
## editorInfo.ace_execCommand(?)
## editorInfo.ace_callWithAce(fn, callStack, normalize)
## editorInfo.ace_setProperty(key, value)
## editorInfo.ace_setBaseText(txt)
## editorInfo.ace_setBaseAttributedText(atxt, apoolJsonObj)
## editorInfo.ace_applyChangesToBase(c, optAuthor, apoolJsonObj)
## editorInfo.ace_prepareUserChangeset()
## editorInfo.ace_applyPreparedChangesetToBase()
## editorInfo.ace_setUserChangeNotificationCallback(f)
## editorInfo.ace_setAuthorInfo(author, info)
## editorInfo.ace_setAuthorSelectionRange(author, start, end)
## editorInfo.ace_getUnhandledErrors()
## editorInfo.ace_getDebugProperty(prop)
## editorInfo.ace_fastIncorp(?)
## editorInfo.ace_isCaret(?)
## editorInfo.ace_getLineAndCharForPoint(?)
## editorInfo.ace_performDocumentApplyAttributesToCharRange(?)
## editorInfo.ace_setAttributeOnSelection(attribute, enabled)
Sets an attribute on current range.
Example: `call.editorInfo.ace_setAttributeOnSelection("turkey::balls", true); // turkey is the attribute here, balls is the value
Notes: to remove the attribute pass enabled as false
## editorInfo.ace_toggleAttributeOnSelection(?)
## editorInfo.ace_getAttributeOnSelection(attribute, prevChar)
Returns a boolean if an attribute exists on a selected range.
prevChar value should be true if you want to get the previous Character attribute instead of the current selection for example
if the caret is at position 0,1 (after first character) it's probable you want the attributes on the character at 0,0
The attribute should be the string name of the attribute applied to the selection IE subscript
Example usage: Apply the activeButton Class to a button if an attribute is on a highlighted/selected caret position or range.
Example `var isItThere = documentAttributeManager.getAttributeOnSelection("turkey::balls", true);`

See the ep_subscript plugin for an example of this function in action.
Notes: Does not work on first or last character of a line.  Suffers from a race condition if called with aceEditEvent.
## editorInfo.ace_performSelectionChange(?)
## editorInfo.ace_doIndentOutdent(?)
## editorInfo.ace_doUndoRedo(?)
## editorInfo.ace_doInsertUnorderedList(?)
## editorInfo.ace_doInsertOrderedList(?)
## editorInfo.ace_performDocumentApplyAttributesToRange()

## editorInfo.ace_getAuthorInfos()
Returns an info object about the author. Object key = author_id and info includes author's bg color value.
Use to define your own authorship.
## editorInfo.ace_performDocumentReplaceRange(start, end, newText)
This function replaces a range (from [x1,y1] to [x2,y2]) with `newText`.
## editorInfo.ace_performDocumentReplaceCharRange(startChar, endChar, newText)
This function replaces a range (from y1 to y2) with `newText`.
## editorInfo.ace_renumberList(lineNum)
If you delete a line, calling this method will fix the line numbering.
## editorInfo.ace_doReturnKey()
Forces a return key at the current carret position.
## editorInfo.ace_isBlockElement(element)
Returns true if your passed elment is registered as a block element
## editorInfo.ace_getLineListType(lineNum)
Returns the line's html list type.
## editorInfo.ace_caretLine()
Returns X position of the caret.
## editorInfo.ace_caretColumn()
Returns Y position of the caret.
## editorInfo.ace_caretDocChar()
Returns the Y offset starting from [x=0,y=0]
## editorInfo.ace_isWordChar(?)
