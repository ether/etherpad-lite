/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

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

const padutils = require('./pad_utils').padutils;
const hooks = require('./pluginfw/hooks');

let myUserInfo = {};

let colorPickerOpen = false;
let colorPickerSetup = false;
let previousColorId = 0;


const paduserlist = (function () {
  const rowManager = (function () {
    // The row manager handles rendering rows of the user list and animating
    // their insertion, removal, and reordering.  It manipulates TD height
    // and TD opacity.

    function nextRowId() {
      return `usertr${nextRowId.counter++}`;
    }
    nextRowId.counter = 1;
    // objects are shared; fields are "domId","data","animationStep"
    const rowsFadingOut = []; // unordered set
    const rowsFadingIn = []; // unordered set
    const rowsPresent = []; // in order
    const ANIMATION_START = -12; // just starting to fade in
    const ANIMATION_END = 12; // just finishing fading out


    function getAnimationHeight(step, power) {
      let a = Math.abs(step / 12);
      if (power == 2) a *= a;
      else if (power == 3) a = a * a * a;
      else if (power == 4) a = a * a * a * a;
      else if (power >= 5) a = a * a * a * a * a;
      return Math.round(26 * (1 - a));
    }
    const OPACITY_STEPS = 6;

    const ANIMATION_STEP_TIME = 20;
    const LOWER_FRAMERATE_FACTOR = 2;
    const scheduleAnimation = padutils.makeAnimationScheduler(animateStep, ANIMATION_STEP_TIME, LOWER_FRAMERATE_FACTOR).scheduleAnimation;

    const NUMCOLS = 4;

    // we do lots of manipulation of table rows and stuff that JQuery makes ok, despite
    // IE's poor handling when manipulating the DOM directly.

    function getEmptyRowHtml(height) {
      return `<td colspan="${NUMCOLS}" style="border:0;height:${height}px"><!-- --></td>`;
    }

    function isNameEditable(data) {
      return (!data.name) && (data.status != 'Disconnected');
    }

    function replaceUserRowContents(tr, height, data) {
      const tds = getUserRowHtml(height, data).match(/<td.*?<\/td>/gi);
      if (isNameEditable(data) && tr.find('td.usertdname input:enabled').length > 0) {
        // preserve input field node
        for (let i = 0; i < tds.length; i++) {
          const oldTd = $(tr.find('td').get(i));
          if (!oldTd.hasClass('usertdname')) {
            oldTd.replaceWith(tds[i]);
          }
        }
      } else {
        tr.html(tds.join(''));
      }
      return tr;
    }

    function getUserRowHtml(height, data) {
      let nameHtml;
      if (data.name) {
        nameHtml = padutils.escapeHtml(data.name);
      } else {
        nameHtml = `<input data-l10n-id="pad.userlist.unnamed" type="text" class="editempty newinput" value="${_('pad.userlist.unnamed')}" ${isNameEditable(data) ? '' : 'disabled="disabled" '}/>`;
      }

      return ['<td style="height:', height, `px" class="usertdswatch"><div class="swatch" style="background:${padutils.escapeHtml(data.color)}">&nbsp;</div></td>`, '<td style="height:', height, 'px" class="usertdname">', nameHtml, '</td>', '<td style="height:', height, 'px" class="activity">', padutils.escapeHtml(data.activity), '</td>'].join('');
    }

    function getRowHtml(id, innerHtml, authorId) {
      return `<tr data-authorId="${authorId}" id="${id}">${innerHtml}</tr>`;
    }

    function rowNode(row) {
      return $(`#${row.domId}`);
    }

    function handleRowData(row) {
      if (row.data && row.data.status == 'Disconnected') {
        row.opacity = 0.5;
      } else {
        delete row.opacity;
      }
    }

    function handleRowNode(tr, data) {
      if (data.titleText) {
        const titleText = data.titleText;
        window.setTimeout(() => {
          /* tr.attr('title', titleText)*/
        }, 0);
      } else {
        tr.removeAttr('title');
      }
    }

    function handleOtherUserInputs() {
      // handle 'INPUT' elements for naming other unnamed users
      $('#otheruserstable input.newinput').each(function () {
        const input = $(this);
        const tr = input.closest('tr');
        if (tr.length > 0) {
          const index = tr.parent().children().index(tr);
          if (index >= 0) {
            const userId = rowsPresent[index].data.id;
            rowManagerMakeNameEditor($(this), userId);
          }
        }
      }).removeClass('newinput');
    }

    // animationPower is 0 to skip animation, 1 for linear, 2 for quadratic, etc.


    function insertRow(position, data, animationPower) {
      position = Math.max(0, Math.min(rowsPresent.length, position));
      animationPower = (animationPower === undefined ? 4 : animationPower);

      const domId = nextRowId();
      const row = {
        data,
        animationStep: ANIMATION_START,
        domId,
        animationPower,
      };
      const authorId = data.id;

      handleRowData(row);
      rowsPresent.splice(position, 0, row);
      let tr;
      if (animationPower == 0) {
        tr = $(getRowHtml(domId, getUserRowHtml(getAnimationHeight(0), data), authorId));
        row.animationStep = 0;
      } else {
        rowsFadingIn.push(row);
        tr = $(getRowHtml(domId, getEmptyRowHtml(getAnimationHeight(ANIMATION_START)), authorId));
      }
      handleRowNode(tr, data);
      $('table#otheruserstable').show();
      if (position == 0) {
        $('table#otheruserstable').prepend(tr);
      } else {
        rowNode(rowsPresent[position - 1]).after(tr);
      }

      if (animationPower != 0) {
        scheduleAnimation();
      }

      handleOtherUserInputs();

      return row;
    }

    function updateRow(position, data) {
      const row = rowsPresent[position];
      if (row) {
        row.data = data;
        handleRowData(row);
        if (row.animationStep == 0) {
          // not currently animating
          const tr = rowNode(row);
          replaceUserRowContents(tr, getAnimationHeight(0), row.data).find('td').css('opacity', (row.opacity === undefined ? 1 : row.opacity));
          handleRowNode(tr, data);
          handleOtherUserInputs();
        }
      }
    }

    function removeRow(position, animationPower) {
      animationPower = (animationPower === undefined ? 4 : animationPower);
      const row = rowsPresent[position];
      if (row) {
        rowsPresent.splice(position, 1); // remove
        if (animationPower == 0) {
          rowNode(row).remove();
        } else {
          row.animationStep = -row.animationStep; // use symmetry
          row.animationPower = animationPower;
          rowsFadingOut.push(row);
          scheduleAnimation();
        }
      }
      if (rowsPresent.length === 0) {
        $('table#otheruserstable').hide();
      }
    }

    // newPosition is position after the row has been removed


    function moveRow(oldPosition, newPosition, animationPower) {
      animationPower = (animationPower === undefined ? 1 : animationPower); // linear is best
      const row = rowsPresent[oldPosition];
      if (row && oldPosition != newPosition) {
        const rowData = row.data;
        removeRow(oldPosition, animationPower);
        insertRow(newPosition, rowData, animationPower);
      }
    }

    function animateStep() {
      // animation must be symmetrical
      for (var i = rowsFadingIn.length - 1; i >= 0; i--) { // backwards to allow removal
        var row = rowsFadingIn[i];
        var step = ++row.animationStep;
        var animHeight = getAnimationHeight(step, row.animationPower);
        var node = rowNode(row);
        var baseOpacity = (row.opacity === undefined ? 1 : row.opacity);
        if (step <= -OPACITY_STEPS) {
          node.find('td').height(animHeight);
        } else if (step == -OPACITY_STEPS + 1) {
          node.html(getUserRowHtml(animHeight, row.data)).find('td').css('opacity', baseOpacity * 1 / OPACITY_STEPS);
          handleRowNode(node, row.data);
        } else if (step < 0) {
          node.find('td').css('opacity', baseOpacity * (OPACITY_STEPS - (-step)) / OPACITY_STEPS).height(animHeight);
        } else if (step == 0) {
          // set HTML in case modified during animation
          node.html(getUserRowHtml(animHeight, row.data)).find('td').css('opacity', baseOpacity * 1).height(animHeight);
          handleRowNode(node, row.data);
          rowsFadingIn.splice(i, 1); // remove from set
        }
      }
      for (var i = rowsFadingOut.length - 1; i >= 0; i--) { // backwards to allow removal
        var row = rowsFadingOut[i];
        var step = ++row.animationStep;
        var node = rowNode(row);
        var animHeight = getAnimationHeight(step, row.animationPower);
        var baseOpacity = (row.opacity === undefined ? 1 : row.opacity);
        if (step < OPACITY_STEPS) {
          node.find('td').css('opacity', baseOpacity * (OPACITY_STEPS - step) / OPACITY_STEPS).height(animHeight);
        } else if (step == OPACITY_STEPS) {
          node.html(getEmptyRowHtml(animHeight));
        } else if (step <= ANIMATION_END) {
          node.find('td').height(animHeight);
        } else {
          rowsFadingOut.splice(i, 1); // remove from set
          node.remove();
        }
      }

      handleOtherUserInputs();

      return (rowsFadingIn.length > 0) || (rowsFadingOut.length > 0); // is more to do
    }

    const self = {
      insertRow,
      removeRow,
      moveRow,
      updateRow,
    };
    return self;
  }()); // //////// rowManager
  const otherUsersInfo = [];
  const otherUsersData = [];

  function rowManagerMakeNameEditor(jnode, userId) {
    setUpEditable(jnode, () => {
      const existingIndex = findExistingIndex(userId);
      if (existingIndex >= 0) {
        return otherUsersInfo[existingIndex].name || '';
      } else {
        return '';
      }
    }, (newName) => {
      if (!newName) {
        jnode.addClass('editempty');
        jnode.val(_('pad.userlist.unnamed'));
      } else {
        jnode.attr('disabled', 'disabled');
        pad.suggestUserName(userId, newName);
      }
    });
  }

  function findExistingIndex(userId) {
    let existingIndex = -1;
    for (let i = 0; i < otherUsersInfo.length; i++) {
      if (otherUsersInfo[i].userId == userId) {
        existingIndex = i;
        break;
      }
    }
    return existingIndex;
  }

  function setUpEditable(jqueryNode, valueGetter, valueSetter) {
    jqueryNode.bind('focus', (evt) => {
      const oldValue = valueGetter();
      if (jqueryNode.val() !== oldValue) {
        jqueryNode.val(oldValue);
      }
      jqueryNode.addClass('editactive').removeClass('editempty');
    });
    jqueryNode.bind('blur', (evt) => {
      const newValue = jqueryNode.removeClass('editactive').val();
      valueSetter(newValue);
    });
    padutils.bindEnterAndEscape(jqueryNode, () => {
      jqueryNode.blur();
    }, () => {
      jqueryNode.val(valueGetter()).blur();
    });
    jqueryNode.removeAttr('disabled').addClass('editable');
  }

  const knocksToIgnore = {};
  let guestPromptFlashState = 0;
  const guestPromptFlash = padutils.makeAnimationScheduler(

      () => {
        const prompts = $('#guestprompts .guestprompt');
        if (prompts.length == 0) {
          return false; // no more to do
        }

        guestPromptFlashState = 1 - guestPromptFlashState;
        if (guestPromptFlashState) {
          prompts.css('background', '#ffa');
        } else {
          prompts.css('background', '#ffe');
        }

        return true;
      }, 1000);

  var pad = undefined;
  var self = {
    init(myInitialUserInfo, _pad) {
      pad = _pad;

      self.setMyUserInfo(myInitialUserInfo);

      if ($('#online_count').length === 0) $('#editbar [data-key=showusers] > a').append('<span id="online_count">1</span>');

      $('#otheruserstable tr').remove();

      if (pad.getUserIsGuest()) {
        $('#myusernameedit').addClass('myusernameedithoverable');
        setUpEditable($('#myusernameedit'), () => myUserInfo.name || '', (newValue) => {
          myUserInfo.name = newValue;
          pad.notifyChangeName(newValue);
          // wrap with setTimeout to do later because we get
          // a double "blur" fire in IE...
          window.setTimeout(() => {
            self.renderMyUserInfo();
          }, 0);
        });
      }

      // color picker
      $('#myswatchbox').click(showColorPicker);
      $('#mycolorpicker .pickerswatchouter').click(function () {
        $('#mycolorpicker .pickerswatchouter').removeClass('picked');
        $(this).addClass('picked');
      });
      $('#mycolorpickersave').click(() => {
        closeColorPicker(true);
      });
      $('#mycolorpickercancel').click(() => {
        closeColorPicker(false);
      });
      //
    },
    usersOnline() {
      // Returns an object of users who are currently online on this pad
      const userList = [].concat(otherUsersInfo); // Make a copy of the otherUsersInfo, otherwise every call to users modifies the referenced array
      // Now we need to add ourselves..
      userList.push(myUserInfo);
      return userList;
    },
    users() {
      // Returns an object of users who have been on this pad
      const userList = self.usersOnline();

      // Now we add historical authors
      const historical = clientVars.collab_client_vars.historicalAuthorData;
      for (const key in historical) {
        var userId = historical[key].userId;
        // Check we don't already have this author in our array
        var exists = false;

        userList.forEach((user) => {
          if (user.userId === userId) exists = true;
        });

        if (exists === false) {
          userList.push(historical[key]);
        }
      }
      return userList;
    },
    setMyUserInfo(info) {
      // translate the colorId
      if (typeof info.colorId === 'number') {
        info.colorId = clientVars.colorPalette[info.colorId];
      }

      myUserInfo = $.extend(
          {}, info);

      self.renderMyUserInfo();
    },
    userJoinOrUpdate(info) {
      if ((!info.userId) || (info.userId == myUserInfo.userId)) {
        // not sure how this would happen
        return;
      }

      hooks.callAll('userJoinOrUpdate', {
        userInfo: info,
      });

      const userData = {};
      userData.color = typeof info.colorId === 'number' ? clientVars.colorPalette[info.colorId] : info.colorId;
      userData.name = info.name;
      userData.status = '';
      userData.activity = '';
      userData.id = info.userId;
      // Firefox ignores \n in title text; Safari does a linebreak
      userData.titleText = [info.userAgent || '', info.ip || ''].join(' \n');

      const existingIndex = findExistingIndex(info.userId);

      let numUsersBesides = otherUsersInfo.length;
      if (existingIndex >= 0) {
        numUsersBesides--;
      }
      const newIndex = padutils.binarySearch(numUsersBesides, (n) => {
        if (existingIndex >= 0 && n >= existingIndex) {
          // pretend existingIndex isn't there
          n++;
        }
        const infoN = otherUsersInfo[n];
        const nameN = (infoN.name || '').toLowerCase();
        const nameThis = (info.name || '').toLowerCase();
        const idN = infoN.userId;
        const idThis = info.userId;
        return (nameN > nameThis) || (nameN == nameThis && idN > idThis);
      });

      if (existingIndex >= 0) {
        // update
        if (existingIndex == newIndex) {
          otherUsersInfo[existingIndex] = info;
          otherUsersData[existingIndex] = userData;
          rowManager.updateRow(existingIndex, userData);
        } else {
          otherUsersInfo.splice(existingIndex, 1);
          otherUsersData.splice(existingIndex, 1);
          otherUsersInfo.splice(newIndex, 0, info);
          otherUsersData.splice(newIndex, 0, userData);
          rowManager.updateRow(existingIndex, userData);
          rowManager.moveRow(existingIndex, newIndex);
        }
      } else {
        otherUsersInfo.splice(newIndex, 0, info);
        otherUsersData.splice(newIndex, 0, userData);
        rowManager.insertRow(newIndex, userData);
      }

      self.updateNumberOfOnlineUsers();
    },
    updateNumberOfOnlineUsers() {
      let online = 1; // you are always online!
      for (let i = 0; i < otherUsersData.length; i++) {
        if (otherUsersData[i].status == '') {
          online++;
        }
      }

      $('#online_count').text(online);

      return online;
    },
    userLeave(info) {
      const existingIndex = findExistingIndex(info.userId);
      if (existingIndex >= 0) {
        const userData = otherUsersData[existingIndex];
        userData.status = 'Disconnected';
        rowManager.updateRow(existingIndex, userData);
        if (userData.leaveTimer) {
          window.clearTimeout(userData.leaveTimer);
        }
        // set up a timer that will only fire if no leaves,
        // joins, or updates happen for this user in the
        // next N seconds, to remove the user from the list.
        const thisUserId = info.userId;
        var thisLeaveTimer = window.setTimeout(() => {
          const newExistingIndex = findExistingIndex(thisUserId);
          if (newExistingIndex >= 0) {
            const newUserData = otherUsersData[newExistingIndex];
            if (newUserData.status == 'Disconnected' && newUserData.leaveTimer == thisLeaveTimer) {
              otherUsersInfo.splice(newExistingIndex, 1);
              otherUsersData.splice(newExistingIndex, 1);
              rowManager.removeRow(newExistingIndex);
              hooks.callAll('userLeave', {
                userInfo: info,
              });
            }
          }
        }, 8000); // how long to wait
        userData.leaveTimer = thisLeaveTimer;
      }

      self.updateNumberOfOnlineUsers();
    },
    showGuestPrompt(userId, displayName) {
      if (knocksToIgnore[userId]) {
        return;
      }

      const encodedUserId = padutils.encodeUserId(userId);

      const actionName = `hide-guest-prompt-${encodedUserId}`;
      padutils.cancelActions(actionName);

      let box = $(`#guestprompt-${encodedUserId}`);
      if (box.length == 0) {
        // make guest prompt box
        box = $(`<div id="${padutils.escapeHtml(`guestprompt-${encodedUserId}`)}" class="guestprompt"><div class="choices"><a href="${padutils.escapeHtml(`javascript:void(require(${JSON.stringify(module.id)}).paduserlist.answerGuestPrompt(${JSON.stringify(encodedUserId)},false))`)}">${_('pad.userlist.deny')}</a> <a href="${padutils.escapeHtml(`javascript:void(require(${JSON.stringify(module.id)}).paduserlist.answerGuestPrompt(${JSON.stringify(encodedUserId)},true))`)}">${_('pad.userlist.approve')}</a></div><div class="guestname"><strong>${_('pad.userlist.guest')}:</strong> ${padutils.escapeHtml(displayName)}</div></div>`);
        $('#guestprompts').append(box);
      } else {
        // update display name
        box.find('.guestname').html(`<strong>${_('pad.userlist.guest')}:</strong> ${padutils.escapeHtml(displayName)}`);
      }
      const hideLater = padutils.getCancellableAction(actionName, () => {
        self.removeGuestPrompt(userId);
      });
      window.setTimeout(hideLater, 15000); // time-out with no knock
      guestPromptFlash.scheduleAnimation();
    },
    removeGuestPrompt(userId) {
      const box = $(`#guestprompt-${padutils.encodeUserId(userId)}`);
      // remove ID now so a new knock by same user gets new, unfaded box
      box.removeAttr('id').fadeOut('fast', () => {
        box.remove();
      });

      knocksToIgnore[userId] = true;
      window.setTimeout(() => {
        delete knocksToIgnore[userId];
      }, 5000);
    },
    answerGuestPrompt(encodedUserId, approve) {
      const guestId = padutils.decodeUserId(encodedUserId);

      const msg = {
        type: 'guestanswer',
        authId: pad.getUserId(),
        guestId,
        answer: (approve ? 'approved' : 'denied'),
      };
      pad.sendClientMessage(msg);

      self.removeGuestPrompt(guestId);
    },
    renderMyUserInfo() {
      if (myUserInfo.name) {
        $('#myusernameedit').removeClass('editempty').val(myUserInfo.name);
      } else {
        $('#myusernameedit').attr('placeholder', html10n.get('pad.userlist.entername'));
      }
      if (colorPickerOpen) {
        $('#myswatchbox').addClass('myswatchboxunhoverable').removeClass('myswatchboxhoverable');
      } else {
        $('#myswatchbox').addClass('myswatchboxhoverable').removeClass('myswatchboxunhoverable');
      }

      $('#myswatch').css({'background-color': myUserInfo.colorId});

      if (browser.msie && parseInt(browser.version) <= 8) {
        $('li[data-key=showusers] > a').css({'box-shadow': `inset 0 0 30px ${myUserInfo.colorId}`, 'background-color': myUserInfo.colorId});
      } else {
        $('li[data-key=showusers] > a').css({'box-shadow': `inset 0 0 30px ${myUserInfo.colorId}`});
      }
    },
  };
  return self;
}());

function getColorPickerSwatchIndex(jnode) {
  //  return Number(jnode.get(0).className.match(/\bn([0-9]+)\b/)[1])-1;
  return $('#colorpickerswatches li').index(jnode);
}

function closeColorPicker(accept) {
  if (accept) {
    var newColor = $('#mycolorpickerpreview').css('background-color');
    const parts = newColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    // parts now should be ["rgb(0, 70, 255", "0", "70", "255"]
    if (parts) {
      delete (parts[0]);
      for (let i = 1; i <= 3; ++i) {
        parts[i] = parseInt(parts[i]).toString(16);
        if (parts[i].length == 1) parts[i] = `0${parts[i]}`;
      }
      var newColor = `#${parts.join('')}`; // "0070ff"
    }
    myUserInfo.colorId = newColor;
    pad.notifyChangeColor(newColor);
    paduserlist.renderMyUserInfo();
  } else {
    // pad.notifyChangeColor(previousColorId);
    // paduserlist.renderMyUserInfo();
  }

  colorPickerOpen = false;
  $('#mycolorpicker').removeClass('popup-show');
}

function showColorPicker() {
  previousColorId = myUserInfo.colorId;
  $.farbtastic('#colorpicker').setColor(myUserInfo.colorId);

  if (!colorPickerOpen) {
    const palette = pad.getColorPalette();

    if (!colorPickerSetup) {
      const colorsList = $('#colorpickerswatches');
      for (let i = 0; i < palette.length; i++) {
        const li = $('<li>', {
          style: `background: ${palette[i]};`,
        });

        li.appendTo(colorsList);

        li.bind('click', (event) => {
          $('#colorpickerswatches li').removeClass('picked');
          $(event.target).addClass('picked');

          const newColorId = getColorPickerSwatchIndex($('#colorpickerswatches .picked'));
          pad.notifyChangeColor(newColorId);
        });
      }

      colorPickerSetup = true;
    }

    $('#mycolorpicker').addClass('popup-show');
    colorPickerOpen = true;

    $('#colorpickerswatches li').removeClass('picked');
    $($('#colorpickerswatches li')[myUserInfo.colorId]).addClass('picked'); // seems weird
  }
}

exports.paduserlist = paduserlist;
