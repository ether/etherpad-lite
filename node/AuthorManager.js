/**
 * 2011 Peter 'Pita' Martischka
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * The AuthorManager controlls all information about the Pad authors
 */

/**
 * Saves all Authors as a assoative Array. The Key is the author id.
 * Authors can have the following attributes:
 * -name The Name of the Author as shown on the Pad
 * -colorId The Id of Usercolor. A number between 0 and 31
 * -timestamp The timestamp on which the user was last seen
 */ 
var globalAuthors = {};

/**
 * A easy key value pair. The Key is the token, the value is the authorid 
 */
var token2author = {};

/**
 * Returns the Author Id for a token. If the token is unkown, 
 * it creates a author for the token
 * @param token The token 
 */
exports.getAuthor4Token = function (token)
{
  var author;
  
  if(token2author[token] == null)
  {
    author = "g." + _randomString(16);
    
    while(globalAuthors[author] != null)
    {
      author = "g." + _randomString(16);
    }
    
    token2author[token]=author;
  
    globalAuthors[author] = {};
    globalAuthors[author].colorId = Math.floor(Math.random()*32);
    globalAuthors[author].name = null;
  }
  else
  {
    author = token2author[token];
  }
  
  globalAuthors[author].timestamp = new Date().getTime();
  
  return author;
}

/**
 * Returns the color Id of the author
 */
exports.getAuthorColorId = function (author)
{
  throwExceptionIfAuthorNotExist(author);
  
  return globalAuthors[author].colorId;
}

/**
 * Sets the color Id of the author
 */
exports.setAuthorColorId = function (author, colorId)
{
  throwExceptionIfAuthorNotExist(author);
  
  globalAuthors[author].colorId = colorId;
}

/**
 * Returns the name of the author
 */
exports.getAuthorName = function (author)
{
  throwExceptionIfAuthorNotExist(author);
  
  return globalAuthors[author].name;
}

/**
 * Sets the name of the author
 */
exports.setAuthorName = function (author, name)
{
  throwExceptionIfAuthorNotExist(author);
  
  globalAuthors[author].name = name;
}

/**
 * A internal function that checks if the Author exist and throws a exception if not
 */
function throwExceptionIfAuthorNotExist(author)
{
  if(globalAuthors[author] == null)
  {
    throw "Author '" + author + "' is unkown!";
  }
}

/**
 * Generates a random String with the given length. Is needed to generate the Author Ids
 */
function _randomString(len) {
  // use only numbers and lowercase letters
  var pieces = [];
  for(var i=0;i<len;i++) {
    pieces.push(Math.floor(Math.random()*36).toString(36).slice(-1));
  }
  return pieces.join('');
}
