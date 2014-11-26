/* Endpoints Still to interact with..
padUsersCount(padID)
setPublicStatus(padID, publicStatus)
getPublicStatus(padID)
setPassword(padID, password)
isPasswordProtected(padID)
listAuthorsOfPad(padID)
getLastEdited(padID)
listSessionsOfGroup(groupID)
getSessionInfo(sessionID)
deleteSession(sessionID)
createSession(groupID, authorID, validUntil)
listPadsOfAuthor(authorID)
createAuthorIfNotExistsFor(authorMapper [, name])
createAuthor([name])
createGroupPad(groupID, padName [, text])
listPads(groupID)
deleteGroup(groupID)
createGroupIfNotExistsFor(groupMapper)
createGroup()
*/


var endPoint = function(point){
  return '/api/'+apiVersion+'/'+point+'?apikey='+apiKey;
}

function makeid()
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 5; i++ ){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

