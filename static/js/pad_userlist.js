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


var paduserlist = (function() {

  var rowManager = (function() {
    // The row manager handles rendering rows of the user list and animating
    // their insertion, removal, and reordering.  It manipulates TD height
    // and TD opacity.

    function nextRowId() {
      return "usertr"+(nextRowId.counter++);
    }
    nextRowId.counter = 1;
    // objects are shared; fields are "domId","data","animationStep"
    var rowsFadingOut = []; // unordered set
    var rowsFadingIn = []; // unordered set
    var rowsPresent = []; // in order

    var ANIMATION_START = -12; // just starting to fade in
    var ANIMATION_END = 12; // just finishing fading out
    function getAnimationHeight(step, power) {
      var a = Math.abs(step/12);
      if (power == 2) a = a*a;
      else if (power == 3) a = a*a*a;
      else if (power == 4) a = a*a*a*a;
      else if (power >= 5) a = a*a*a*a*a;
      return Math.round(26*(1-a));
    }
    var OPACITY_STEPS = 6;

    var ANIMATION_STEP_TIME = 20;
    var LOWER_FRAMERATE_FACTOR = 2;
    var scheduleAnimation = padutils.makeAnimationScheduler(animateStep, ANIMATION_STEP_TIME,
                                                            LOWER_FRAMERATE_FACTOR).scheduleAnimation;

    var NUMCOLS = 4;

    // we do lots of manipulation of table rows and stuff that JQuery makes ok, despite
    // IE's poor handling when manipulating the DOM directly.

    function getEmptyRowHtml(height) {
      return '<td colspan="'+NUMCOLS+'" style="border:0;height:'+height+'px"><!-- --></td>';
    }
    function isNameEditable(data) {
      return (! data.name) && (data.status != 'Disconnected');
    }
    function replaceUserRowContents(tr, height, data) {
      var tds = getUserRowHtml(height, data).match(/<td.*?<\/td>/gi);
      if (isNameEditable(data) && tr.find("td.usertdname input:enabled").length > 0) {
        // preserve input field node
        for(var i=0; i<tds.length; i++) {
          var oldTd = $(tr.find("td").get(i));
          if (! oldTd.hasClass('usertdname')) {
            oldTd.replaceWith(tds[i]);
          }
        }
      }
      else {
        tr.html(tds.join(''));
      }
      return tr;
    }
    function getUserRowHtml(height, data) {
      var nameHtml;
      var isGuest = (data.id.charAt(0) != 'p');
      if (data.name) {
        nameHtml = padutils.escapeHtml(data.name);
        if (isGuest && pad.getIsProPad()) {
          nameHtml += ' (Guest)';
        }
      }
      else {
        nameHtml = '<input type="text" class="editempty newinput" value="unnamed" '+
          (isNameEditable(data) ? '' : 'disabled="disabled" ')+
          '/>';
      }

      return ['<td style="height:',height,'px" class="usertdswatch"><div class="swatch" style="background:'+data.color+'">&nbsp;</div></td>',
              '<td style="height:',height,'px" class="usertdname">',nameHtml,'</td>',
              '<td style="height:',height,'px" class="usertdstatus">',padutils.escapeHtml(data.status),'</td>',
              '<td style="height:',height,'px" class="activity">',padutils.escapeHtml(data.activity),'</td>'].join('');
    }
    function getRowHtml(id, innerHtml) {
      return '<tr id="'+id+'">'+innerHtml+'</tr>';
    }
    function rowNode(row) {
      return $("#"+row.domId);
    }
    function handleRowData(row) {
      if (row.data && row.data.status == 'Disconnected') {
        row.opacity = 0.5;
      }
      else {
        delete row.opacity;
      }
    }
    function handleRowNode(tr, data) {
      if (data.titleText) {
        var titleText = data.titleText;
        window.setTimeout(function() { tr.attr('title', titleText )}, 0);
      }
      else {
        tr.removeAttr('title');
      }
    }
    function handleOtherUserInputs() {
      // handle 'INPUT' elements for naming other unnamed users
      $("#otheruserstable input.newinput").each(function() {
        var input = $(this);
        var tr = input.closest("tr");
        if (tr.length > 0) {
          var index = tr.parent().children().index(tr);
          if (index >= 0) {
            var userId = rowsPresent[index].data.id;
            rowManagerMakeNameEditor($(this), userId);
          }
        }
      }).removeClass('newinput');
    }

    // animationPower is 0 to skip animation, 1 for linear, 2 for quadratic, etc.
    function insertRow(position, data, animationPower) {
      position = Math.max(0, Math.min(rowsPresent.length, position));
      animationPower = (animationPower === undefined ? 4 : animationPower);

      var domId = nextRowId();
      var row = {data: data, animationStep: ANIMATION_START, domId: domId,
                 animationPower: animationPower};
      handleRowData(row);
      rowsPresent.splice(position, 0, row);
      var tr;
      if (animationPower == 0) {
        tr = $(getRowHtml(domId, getUserRowHtml(getAnimationHeight(0), data)));
        row.animationStep = 0;
      }
      else {
        rowsFadingIn.push(row);
        tr = $(getRowHtml(domId, getEmptyRowHtml(getAnimationHeight(ANIMATION_START))));
      }
      handleRowNode(tr, data);
      if (position == 0) {
        $("table#otheruserstable").prepend(tr);
      }
      else {
        rowNode(rowsPresent[position-1]).after(tr);
      }

      if (animationPower != 0) {
        scheduleAnimation();
      }

      handleOtherUserInputs();

      return row;
    }

    function updateRow(position, data) {
      var row = rowsPresent[position];
      if (row) {
        row.data = data;
        handleRowData(row);
        if (row.animationStep == 0) {
          // not currently animating
          var tr = rowNode(row);
          replaceUserRowContents(tr, getAnimationHeight(0), row.data).find(
            "td").css('opacity', (row.opacity === undefined ? 1 : row.opacity));
          handleRowNode(tr, data);
          handleOtherUserInputs();
        }
      }
    }

    function removeRow(position, animationPower) {
      animationPower = (animationPower === undefined ? 4 : animationPower);
      var row = rowsPresent[position];
      if (row) {
        rowsPresent.splice(position, 1); // remove
        if (animationPower == 0) {
          rowNode(row).remove();
        }
        else {
          row.animationStep = - row.animationStep; // use symmetry
          row.animationPower = animationPower;
          rowsFadingOut.push(row);
          scheduleAnimation();
        }
      }
    }

    // newPosition is position after the row has been removed
    function moveRow(oldPosition, newPosition, animationPower) {
      animationPower = (animationPower === undefined ? 1 : animationPower); // linear is best
      var row = rowsPresent[oldPosition];
      if (row && oldPosition != newPosition) {
        var rowData = row.data;
        removeRow(oldPosition, animationPower);
        insertRow(newPosition, rowData, animationPower);
      }
    }

    function animateStep() {
      // animation must be symmetrical
      for(var i=rowsFadingIn.length-1;i>=0;i--) { // backwards to allow removal
        var row = rowsFadingIn[i];
        var step = ++row.animationStep;
        var animHeight = getAnimationHeight(step, row.animationPower);
        var node = rowNode(row);
        var baseOpacity = (row.opacity === undefined ? 1 : row.opacity);
        if (step <= -OPACITY_STEPS) {
          node.find("td").height(animHeight);
        }
        else if (step == -OPACITY_STEPS+1) {
          node.html(getUserRowHtml(animHeight, row.data)).find("td").css(
            'opacity', baseOpacity*1/OPACITY_STEPS);
          handleRowNode(node, row.data);
        }
        else if (step < 0) {
          node.find("td").css('opacity', baseOpacity*(OPACITY_STEPS-(-step))/OPACITY_STEPS).height(animHeight);
        }
        else if (step == 0) {
          // set HTML in case modified during animation
          node.html(getUserRowHtml(animHeight, row.data)).find("td").css(
            'opacity', baseOpacity*1).height(animHeight);
          handleRowNode(node, row.data);
          rowsFadingIn.splice(i, 1); // remove from set
        }
      }
      for(var i=rowsFadingOut.length-1;i>=0;i--) { // backwards to allow removal
        var row = rowsFadingOut[i];
        var step = ++row.animationStep;
        var node = rowNode(row);
        var animHeight = getAnimationHeight(step, row.animationPower);
        var baseOpacity = (row.opacity === undefined ? 1 : row.opacity);
        if (step < OPACITY_STEPS) {
          node.find("td").css('opacity', baseOpacity*(OPACITY_STEPS - step)/OPACITY_STEPS).height(animHeight);
        }
        else if (step == OPACITY_STEPS) {
          node.html(getEmptyRowHtml(animHeight));
        }
        else if (step <= ANIMATION_END) {
          node.find("td").height(animHeight);
        }
        else {
          rowsFadingOut.splice(i, 1); // remove from set
          node.remove();
        }
      }

      handleOtherUserInputs();

      return (rowsFadingIn.length > 0) || (rowsFadingOut.length > 0); // is more to do
    }

    var self = {
      insertRow: insertRow,
      removeRow: removeRow,
      moveRow: moveRow,
      updateRow: updateRow
    };
    return self;
  }()); ////////// rowManager

  var myUserInfo = {};
  var otherUsersInfo = [];
  var otherUsersData = [];
  var colorPickerOpen = false;

  function rowManagerMakeNameEditor(jnode, userId) {
    setUpEditable(jnode, function() {
      var existingIndex = findExistingIndex(userId);
      if (existingIndex >= 0) {
        return otherUsersInfo[existingIndex].name || '';
      }
      else {
        return '';
      }
    }, function(newName) {
      if (! newName) {
        jnode.addClass("editempty");
        jnode.val("unnamed");
      }
      else {
        jnode.attr('disabled', 'disabled');
        pad.suggestUserName(userId, newName);
      }
    });
  }

  function renderMyUserInfo() {
    if (myUserInfo.name) {
      $("#myusernameedit").removeClass("editempty").val(
        myUserInfo.name);
    }
    else {
      $("#myusernameedit").addClass("editempty").val(
        "< enter your name >");
    }
    if (colorPickerOpen) {
      $("#myswatchbox").addClass('myswatchboxunhoverable').removeClass(
        'myswatchboxhoverable');
    }
    else {
      $("#myswatchbox").addClass('myswatchboxhoverable').removeClass(
        'myswatchboxunhoverable');
    }
    $("#myswatch").css('background', pad.getColorPalette()[myUserInfo.colorId]);
  }

  function findExistingIndex(userId) {
    var existingIndex = -1;
    for(var i=0;i<otherUsersInfo.length;i++) {
      if (otherUsersInfo[i].userId == userId) {
        existingIndex = i;
        break;
      }
    }
    return existingIndex;
  }

  function setUpEditable(jqueryNode, valueGetter, valueSetter) {
    jqueryNode.bind('focus', function(evt) {
      var oldValue = valueGetter();
      if (jqueryNode.val() !== oldValue) {
        jqueryNode.val(oldValue);
      }
      jqueryNode.addClass("editactive").removeClass("editempty");
    });
    jqueryNode.bind('blur', function(evt) {
      var newValue = jqueryNode.removeClass("editactive").val();
      valueSetter(newValue);
    });
    padutils.bindEnterAndEscape(jqueryNode, function onEnter() {
      jqueryNode.blur();
    }, function onEscape() {
      jqueryNode.val(valueGetter()).blur();
    });
    jqueryNode.removeAttr('disabled').addClass('editable');
  }

  function showColorPicker() {
    if (! colorPickerOpen) {
      var palette = pad.getColorPalette();
      for(var i=0;i<palette.length;i++) {
        $("#mycolorpicker .n"+(i+1)+" .pickerswatch").css(
          'background', palette[i]);
      }
      $("#mycolorpicker").css('display', 'block');
      colorPickerOpen = true;
      renderMyUserInfo();
    }
    // this part happens even if color picker is already open
    $("#mycolorpicker .pickerswatchouter").removeClass('picked');
    $("#mycolorpicker .pickerswatchouter:eq("+(myUserInfo.colorId||0)+")").
      addClass('picked');
  }
  function getColorPickerSwatchIndex(jnode) {
    return Number(jnode.get(0).className.match(/\bn([0-9]+)\b/)[1])-1;
  }
  function closeColorPicker(accept) {
    if (accept) {
      var newColorId = getColorPickerSwatchIndex($("#mycolorpicker .picked"));
      if (newColorId >= 0) { // fails on NaN
        myUserInfo.colorId = newColorId;
        pad.notifyChangeColor(newColorId);
      }
    }
    colorPickerOpen = false;
    $("#mycolorpicker").css('display', 'none');
    renderMyUserInfo();
  }

  function updateInviteNotice() {
    if (otherUsersInfo.length == 0) {
      $("#otheruserstable").hide();
      $("#nootherusers").show();
    }
    else {
      $("#nootherusers").hide();
      $("#otheruserstable").show();
    }
  }

  var knocksToIgnore = {};
  var guestPromptFlashState = 0;
  var guestPromptFlash = padutils.makeAnimationScheduler(
    function () {
      var prompts = $("#guestprompts .guestprompt");
      if (prompts.length == 0) {
        return false; // no more to do
      }

      guestPromptFlashState = 1 - guestPromptFlashState;
      if (guestPromptFlashState) {
        prompts.css('background', '#ffa');
      }
      else {
        prompts.css('background', '#ffe');
      }

      return true;
    }, 1000);

  var self = {
    init: function(myInitialUserInfo) {
      self.setMyUserInfo(myInitialUserInfo);

      $("#otheruserstable tr").remove();

      if (pad.getUserIsGuest()) {
        $("#myusernameedit").addClass('myusernameedithoverable');
        setUpEditable($("#myusernameedit"),
                      function() {
                        return myUserInfo.name || '';
                      },
                      function(newValue) {
                        myUserInfo.name = newValue;
                        pad.notifyChangeName(newValue);
                        // wrap with setTimeout to do later because we get
                        // a double "blur" fire in IE...
                        window.setTimeout(function() {
                          renderMyUserInfo();
                        }, 0);
                      });
      }

      // color picker
      $("#myswatchbox").click(showColorPicker);
      $("#mycolorpicker .pickerswatchouter").click(function() {
        $("#mycolorpicker .pickerswatchouter").removeClass('picked');
        $(this).addClass('picked');
      });
      $("#mycolorpickersave").click(function() {
        closeColorPicker(true);
      });
      $("#mycolorpickercancel").click(function() {
        closeColorPicker(false);
      });
      //

    },
    setMyUserInfo: function(info) {
      myUserInfo = $.extend({}, info);

      renderMyUserInfo();
    },
    userJoinOrUpdate: function(info) {
      if ((! info.userId) || (info.userId == myUserInfo.userId)) {
        // not sure how this would happen
        return;
      }

      var userData = {};
      userData.color = pad.getColorPalette()[info.colorId];
      userData.name = info.name;
      userData.status = '';
      userData.activity = '';
      userData.id = info.userId;
      // Firefox ignores \n in title text; Safari does a linebreak
      userData.titleText = [info.userAgent||'', info.ip||''].join(' \n');

      var existingIndex = findExistingIndex(info.userId);

      var numUsersBesides = otherUsersInfo.length;
      if (existingIndex >= 0) {
        numUsersBesides--;
      }
      var newIndex = padutils.binarySearch(numUsersBesides, function(n) {
        if (existingIndex >= 0 && n >= existingIndex) {
          // pretend existingIndex isn't there
          n++;
        }
        var infoN = otherUsersInfo[n];
        var nameN = (infoN.name||'').toLowerCase();
        var nameThis = (info.name||'').toLowerCase();
        var idN = infoN.userId;
        var idThis = info.userId;
        return (nameN > nameThis) || (nameN == nameThis &&
                                      idN > idThis);
      });

      if (existingIndex >= 0) {
        // update
        if (existingIndex == newIndex) {
          otherUsersInfo[existingIndex] = info;
          otherUsersData[existingIndex] = userData;
          rowManager.updateRow(existingIndex, userData);
        }
        else {
          otherUsersInfo.splice(existingIndex, 1);
          otherUsersData.splice(existingIndex, 1);
          otherUsersInfo.splice(newIndex, 0, info);
          otherUsersData.splice(newIndex, 0, userData);
          rowManager.updateRow(existingIndex, userData);
          rowManager.moveRow(existingIndex, newIndex);
        }
      }
      else {
        otherUsersInfo.splice(newIndex, 0, info);
        otherUsersData.splice(newIndex, 0, userData);
        rowManager.insertRow(newIndex, userData);
      }

      updateInviteNotice();
    },
    userLeave: function(info) {
      var existingIndex = findExistingIndex(info.userId);
      if (existingIndex >= 0) {
        var userData = otherUsersData[existingIndex];
        userData.status = 'Disconnected';
        rowManager.updateRow(existingIndex, userData);
        if (userData.leaveTimer) {
          window.clearTimeout(userData.leaveTimer);
        }
        // set up a timer that will only fire if no leaves,
        // joins, or updates happen for this user in the
        // next N seconds, to remove the user from the list.
        var thisUserId = info.userId;
        var thisLeaveTimer = window.setTimeout(function() {
          var newExistingIndex = findExistingIndex(thisUserId);
          if (newExistingIndex >= 0) {
            var newUserData = otherUsersData[newExistingIndex];
            if (newUserData.status == 'Disconnected' &&
                newUserData.leaveTimer == thisLeaveTimer) {
              otherUsersInfo.splice(newExistingIndex, 1);
              otherUsersData.splice(newExistingIndex, 1);
              rowManager.removeRow(newExistingIndex);
              updateInviteNotice();
            }
          }
        }, 8000); // how long to wait
        userData.leaveTimer = thisLeaveTimer;
      }
      updateInviteNotice();
    },
    showGuestPrompt: function(userId, displayName) {
      if (knocksToIgnore[userId]) {
        return;
      }

      var encodedUserId = padutils.encodeUserId(userId);

      var actionName = 'hide-guest-prompt-'+encodedUserId;
      padutils.cancelActions(actionName);

      var box = $("#guestprompt-"+encodedUserId);
      if (box.length == 0) {
        // make guest prompt box
        box = $('<div id="guestprompt-'+encodedUserId+'" class="guestprompt"><div class="choices"><a href="javascript:void(paduserlist.answerGuestPrompt(\''+encodedUserId+'\',false))">Deny</a> <a href="javascript:void(paduserlist.answerGuestPrompt(\''+encodedUserId+'\',true))">Approve</a></div><div class="guestname"><strong>Guest:</strong> '+padutils.escapeHtml(displayName)+'</div></div>');
        $("#guestprompts").append(box);
      }
      else {
        // update display name
        box.find(".guestname").html('<strong>Guest:</strong> '+padutils.escapeHtml(displayName));
      }
      var hideLater = padutils.getCancellableAction(actionName, function() {
        self.removeGuestPrompt(userId);
      });
      window.setTimeout(hideLater, 15000); // time-out with no knock

      guestPromptFlash.scheduleAnimation();
    },
    removeGuestPrompt: function(userId) {
      var box = $("#guestprompt-"+padutils.encodeUserId(userId));
      // remove ID now so a new knock by same user gets new, unfaded box
      box.removeAttr('id').fadeOut("fast", function() {
        box.remove();
      });

      knocksToIgnore[userId] = true;
      window.setTimeout(function() {
        delete knocksToIgnore[userId];
      }, 5000);
    },
    answerGuestPrompt: function(encodedUserId, approve) {
      var guestId = padutils.decodeUserId(encodedUserId);

      var msg = {
        type: 'guestanswer',
        authId: pad.getUserId(),
        guestId: guestId,
        answer: (approve ? "approved" : "denied")
      };
      pad.sendClientMessage(msg);

      self.removeGuestPrompt(guestId);
    }
  };
  return self;
}());

