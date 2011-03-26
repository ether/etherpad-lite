/**
 * Copyright 2009 Google Inc.
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


var padchat = (function(){

  var numToAuthorMap = [''];
  var authorColorArray = [null];
  var authorToNumMap = {};
  var chatLinesByDay = []; // {day:'2009-06-17', lines: [...]}
  var oldestHistoricalLine = 0;

  var loadingMoreHistory = false;
  var HISTORY_LINES_TO_LOAD_AT_A_TIME = 50;

  function authorToNum(author, dontAddIfAbsent) {
    if ((typeof authorToNumMap[author]) == "number") {
      return authorToNumMap[author];
    }
    else if (dontAddIfAbsent) {
      return -1;
    }
    else {
      var n = numToAuthorMap.length;
      numToAuthorMap.push(author);
      authorToNumMap[author] = n;
      return n;
    }
  }
  function getDateNumCSSDayString(dateNum) {
    var d = new Date(+dateNum);
    var year = String(d.getFullYear());
    var month = ("0"+String(d.getMonth()+1)).slice(-2);
    var day = ("0"+String(d.getDate())).slice(-2);
    return year+"-"+month+"-"+day;
  }
  function getDateNumHumanDayString(dateNum) {
    var d = new Date(+dateNum);
    var monthName = (["January", "February", "March",
                      "April", "May", "June", "July", "August", "September",
                      "October", "November", "December"])[d.getMonth()];
    var dayOfMonth = d.getDate();
    var year = d.getFullYear();
    return monthName+" "+dayOfMonth+", "+year;
  }
  function ensureChatDay(time) {
    var day = getDateNumCSSDayString(time);
    var dayIndex = padutils.binarySearch(chatLinesByDay.length, function(n) {
      return chatLinesByDay[n].day >= day;
    });
    if (dayIndex >= chatLinesByDay.length ||
        chatLinesByDay[dayIndex].day != day) {
      // add new day to chat display!

      chatLinesByDay.splice(dayIndex, 0, {day: day, lines: []});
      var dayHtml = '<div class="chatday" id="chatday'+day+'">'+
        '<h2 class="dayheader">'+getDateNumHumanDayString(time)+
        '</h2></div>';
      var dayDivs = $("#chatlines .chatday");
      if (dayIndex == dayDivs.length) {
        $("#chatlines").append(dayHtml);
      }
      else {
        dayDivs.eq(dayIndex).before(dayHtml);
      }
    }

    return dayIndex;
  }
  function addChatLine(userId, time, name, lineText, addBefore) {
    var dayIndex = ensureChatDay(time);
    var dayDiv = $("#chatday"+getDateNumCSSDayString(time));
    var d = new Date(+time);
    var hourmin = d.getHours()+":"+("0"+d.getMinutes()).slice(-2);
    var nameHtml;
    if (name) {
      nameHtml = padutils.escapeHtml(name);
    }
    else {
      nameHtml = "<i>unnamed</i>";
    }
    var chatlineClass = "chatline";
    if (userId) {
      var authorNum = authorToNum(userId);
      chatlineClass += " chatauthor"+authorNum;
    }
    var textHtml = padutils.escapeHtmlWithClickableLinks(lineText, '_blank');
    var lineNode = $('<div class="'+chatlineClass+'">'+
                     '<span class="chatlinetime">'+hourmin+' </span>'+
                     '<span class="chatlinename">'+nameHtml+': </span>'+
                     '<span class="chatlinetext">'+textHtml+'</span></div>');
    var linesArray = chatLinesByDay[dayIndex].lines;
    var lineObj = {userId:userId, time:time, name:name, lineText:lineText};
    if (addBefore) {
      dayDiv.find("h2").after(lineNode);
      linesArray.splice(0, 0, lineObj);
    }
    else {
      dayDiv.append(lineNode);
      linesArray.push(lineObj);
    }
    if (userId) {
      var color = getAuthorCSSColor(userId);
      if (color) {
        lineNode.css('background', color);
      }
    }

    return {lineNode:lineNode};
  }
  function receiveChatHistoryBlock(block) {
    for(var a in block.historicalAuthorData) {
      var data = block.historicalAuthorData[a];
      var n = authorToNum(a);
      if (! authorColorArray[n]) {
        // no data about this author, use historical info
        authorColorArray[n] = { colorId: data.colorId, faded: true };
      }
    }

    oldestHistoricalLine = block.start;

    var lines = block.lines;
    for(var i=lines.length-1; i>=0; i--) {
      var line = lines[i];
      addChatLine(line.userId, line.time, line.name, line.lineText, true);
    }

    if (oldestHistoricalLine > 0) {
      $("a#chatloadmore").css('display', 'block');
    }
    else {
      $("a#chatloadmore").css('display', 'none');
    }
  }
  function fadeColor(colorCSS) {
    var color = colorutils.css2triple(colorCSS);
    color = colorutils.blend(color, [1,1,1], 0.5);
    return colorutils.triple2css(color);
  }
  function getAuthorCSSColor(author) {
    var n = authorToNum(author, true);
    if (n < 0) {
      return '';
    }
    else {
      var cdata = authorColorArray[n];
      if (! cdata) {
        return '';
      }
      else {
        var c = pad.getColorPalette()[cdata.colorId];
        if (cdata.faded) {
          c = fadeColor(c);
        }
        return c;
      }
    }
  }
  function changeAuthorColorData(author, cdata) {
    var n = authorToNum(author);
    authorColorArray[n] = cdata;
    var cssColor = getAuthorCSSColor(author);
    if (cssColor) {
      $("#chatlines .chatauthor"+n).css('background',cssColor);
    }
  }

  function sendChat() {
    var lineText = $("#chatentrybox").val();
    if (lineText) {
      $("#chatentrybox").val('').focus();
      var msg = {
        type: 'chat',
        userId: pad.getUserId(),
        lineText: lineText,
        senderName: pad.getUserName(),
        authId: pad.getUserId()
      };
      pad.sendClientMessage(msg);
      self.receiveChat(msg);
      self.scrollToBottom();
    }
  }

  var self = {
    init: function(chatHistoryBlock, initialUserInfo) {
      ensureChatDay(+new Date); // so that current date shows up right away

      $("a#chatloadmore").click(self.loadMoreHistory);

      self.handleUserJoinOrUpdate(initialUserInfo);
      receiveChatHistoryBlock(chatHistoryBlock);

      padutils.bindEnterAndEscape($("#chatentrybox"), function(evt) {
        // return/enter
        sendChat();
      }, null);

      self.scrollToBottom();
    },
    receiveChat: function(msg) {
      var box = $("#chatlines").get(0);
      var wasAtBottom = (box.scrollTop -
                         (box.scrollHeight - $(box).height()) >= -5);
      addChatLine(msg.userId, +new Date, msg.senderName, msg.lineText, false);
      if (wasAtBottom) {
        window.setTimeout(function() {
          self.scrollToBottom();
        }, 0);
      }
    },
    handleUserJoinOrUpdate: function(userInfo) {
      changeAuthorColorData(userInfo.userId,
                            { colorId: userInfo.colorId, faded: false });
    },
    handleUserLeave: function(userInfo) {
      changeAuthorColorData(userInfo.userId,
                            { colorId: userInfo.colorId, faded: true });
    },
    scrollToBottom: function() {
      var box = $("#chatlines").get(0);
      box.scrollTop = box.scrollHeight;
    },
    scrollToTop: function() {
      var box = $("#chatlines").get(0);
      box.scrollTop = 0;
    },
    loadMoreHistory: function() {
      if (loadingMoreHistory) {
        return;
      }

      var end = oldestHistoricalLine;
      var start = Math.max(0, end - HISTORY_LINES_TO_LOAD_AT_A_TIME);
      var padId = pad.getPadId();

      loadingMoreHistory = true;
      $("#padchat #chatloadmore").css('display', 'none');
      $("#padchat #chatloadingmore").css('display', 'block');

      $.ajax({
        type: 'get',
        url: '/ep/pad/chathistory',
        data: { padId: padId, start: start, end: end },
        success: success,
        error: error
      });

      function success(text) {
        notLoading();

        var result = JSON.parse(text);

        // try to keep scrolled to the same place...
        var scrollBox = $("#chatlines").get(0);
        var scrollDeterminer = function() { return 0; };
        var topLine = $("#chatlines .chatday:first .chatline:first").children().eq(0);
        if (topLine.length > 0) {
          var posTop = topLine.position().top;
          var scrollTop = scrollBox.scrollTop;
          scrollDeterminer = function() {
            var newPosTop = topLine.position().top;
            return newPosTop + (scrollTop - posTop);
          };
        }
        receiveChatHistoryBlock(result);

        scrollBox.scrollTop = Math.max(0, Math.min(scrollBox.scrollHeight, scrollDeterminer()));
      }
      function error() {
        notLoading();
      }
      function notLoading() {
        loadingMoreHistory = false;
        $("#padchat #chatloadmore").css('display', 'block');
        $("#padchat #chatloadingmore").css('display', 'none');
      }
    }
  };
  return self;
}());