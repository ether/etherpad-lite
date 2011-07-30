# db/AuthorMana
`require("./db/AuthorManager");`

The AuthorManager controlls all information about the Pad authors

## Functions

- - -
### getAuthor (author, callback)
Internal function that creates the database entry for an author

* **author** *(String)* The id of the author
* **callback** *(Function)* callback(err, authorObj)

- - -
### getAuthor4Token (token, callback)
Returns the Author Id for a token. If the token is unkown, 
it creates a author for the token

* **token** *(String)* The token
* **callback** *(Function)* callback (err, author) 
The callback function that is called when the result is here

- - -
### getAuthorColorId (author, callback)
Returns the color Id of the author

* **author** *(String)* The id of the author
* **callback** *(Function)* callback(err, colorId)

- - -
### getAuthorName (author, callback)
Returns the name of the author

* **author** *(String)* The id of the author
* **callback** *(Function)* callback(err, name)

- - -
### setAuthorColorId (author, colorId, callback)
Sets the color Id of the author

* **author** *(String)* The id of the author
* **colorId** *No description*
* **callback** *(Function)* (optional)

- - -
### setAuthorName (author, name, callback)
Sets the name of the author

* **author** *(String)* The id of the author
* **name** *No description*
* **callback** *(Function)* (optional)

