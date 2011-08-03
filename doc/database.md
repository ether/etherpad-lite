# Database structure

## Used so far

### pad:$PADID
Saves all informations about pads

* **atext** - the latest attributed text
* **pool** - the attribute pool
* **head** - the number of the latest revision
* **chatHead** - the number of the latest chat entry

*planed:*

* **public** - flag that disables security for this pad
* **passwordHash** - string that contains a bcrypt hashed password for this pad

### pad:$PADID:revs:$REVNUM
Saves a revision $REVNUM of pad $PADID

* **meta**
  * **author** - the autorID of this revision
  * **timestamp** - the timestamp of when this revision was created
* **changeset** - the changeset of this revision

### pad:$PADID:chat:$CHATNUM
Saves a chatentry with num $CHATNUM of pad $PADID

* **text** - the text of this chat entry
* **userId** - the autorID of this chat entry
* **time** - the timestamp of this chat entry

### pad2readonly:$PADID
Translates a padID to a readonlyID
### readonly2pad:$READONLYID
Translates a readonlyID to a padID
### token2author:$TOKENID
Translates a token to an authorID
### globalAuthor:$AUTHORID
Information about an author

* **name** - the name of this author as shown in the pad
* **colorID** - the colorID of this author as shown in the pad

## Planed

### mapper2group:$MAPPER
Maps an external application identifier to an internal group 
### mapper2author:$MAPPER
Maps an external application identifier to an internal author 
### group:$GROUPID
a group of pads

* **pads** - object with pad names in it, values are null
### session:$SESSIONID
a session between an author and a group

* **groupID** - the groupID the session belongs too
* **authorID** - the authorID the session belongs too
* **validUntil** - the timestamp until this session is valid

### author2sessions:$AUTHORID
saves the sessions of an author

* **sessions** - object with sessionIDs in it, values are null

### group2sessions:$GROUPID

* **sessions** - object with sessionIDs in it, values are null
