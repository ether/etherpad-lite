'use strict';

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

import {padUtils as padutils} from "./pad_utils";

const hooks = require('./pluginfw/hooks');
import html10n from './vendors/html10n';
import {UserInfo} from "./types/SocketIOMessage";
import {Pad} from "./pad";

let colorPickerOpen = false;
let colorPickerSetup = false;

type RowData = {
  name: string
  status: string
  color: string
  activity: string
  id: string
}

type Row = {
  data?: RowData
  animationPower?: number,
  animationStep?: number,
  opacity?: number
  domId?: string
}

type UserData = {
  color? : number
  name? : string
  status? : string
  activity? : string
  id? : string
  leaveTimer?: number
} & RowData

class RowManager {
  // The row manager handles rendering rows of the user list and animating
  // their insertion, removal, and reordering.  It manipulates TD height
  // and TD opacity.
  nextRowIdCounter = 1;
  nextRowId = () => `usertr${this.nextRowIdCounter++}`;
  // objects are shared; fields are "domId","data","animationStep"
  rowsFadingOut: Row[] = []; // unordered set
  rowsFadingIn: Row[] = []; // unordered set
  OPACITY_STEPS = 6;
  ANIMATION_STEP_TIME = 20;
  LOWER_FRAMERATE_FACTOR = 2;
  scheduleAnimation: () => void
  rowsPresent: Row[] = []; // in order
  ANIMATION_START = -12; // just starting to fade in
  ANIMATION_END = 12; // just finishing fading out
  NUMCOLS = 4;
  private padUserList: PadUserList;

  constructor(p: PadUserList) {
    let {scheduleAnimation} = padutils.makeAnimationScheduler(this.animateStep, this.ANIMATION_STEP_TIME, this.LOWER_FRAMERATE_FACTOR);
    this.scheduleAnimation = scheduleAnimation
    this.padUserList = p
  }


  animateStep = () => {
    // animation must be symmetrical
    for (let i = this.rowsFadingIn.length - 1; i >= 0; i--) { // backwards to allow removal
      const row = this.rowsFadingIn[i];
      const step = ++row.animationStep!;
      const animHeight = this.getAnimationHeight(step, row.animationPower);
      const node = this.rowNode(row);
      const baseOpacity = (row.opacity === undefined ? 1 : row.opacity);
      if (step <= -this.OPACITY_STEPS) {
        node.find('td').height(animHeight);
      } else if (step === -this.OPACITY_STEPS + 1) {
        node.empty().append(this.createUserRowTds(animHeight, row.data!))
          .find('td').css('opacity', baseOpacity * 1 / this.OPACITY_STEPS);
      } else if (step < 0) {
        node.find('td').css('opacity', baseOpacity * (this.OPACITY_STEPS - (-step)) / this.OPACITY_STEPS)
          .height(animHeight);
      } else if (step === 0) {
        // set HTML in case modified during animation
        node.empty().append(this.createUserRowTds(animHeight, row.data!))
          .find('td').css('opacity', baseOpacity * 1).height(animHeight);
        this.rowsFadingIn.splice(i, 1); // remove from set
      }
    }
    for (let i = this.rowsFadingOut.length - 1; i >= 0; i--) { // backwards to allow removal
      const row = this.rowsFadingOut[i];
      const step = ++row.animationStep!;
      const node = this.rowNode(row);
      const animHeight = this.getAnimationHeight(step, row.animationPower);
      const baseOpacity = (row.opacity === undefined ? 1 : row.opacity);
      if (step < this.OPACITY_STEPS) {
        node.find('td').css('opacity', baseOpacity * (this.OPACITY_STEPS - step) / this.OPACITY_STEPS)
          .height(animHeight);
      } else if (step === this.OPACITY_STEPS) {
        node.empty().append(this.createEmptyRowTds(animHeight));
      } else if (step <= this.ANIMATION_END) {
        node.find('td').height(animHeight);
      } else {
        this.rowsFadingOut.splice(i, 1); // remove from set
        node.remove();
      }
    }

    this.handleOtherUserInputs();

    return (this.rowsFadingIn.length > 0) || (this.rowsFadingOut.length > 0); // is more to do
  }

  getAnimationHeight = (step: number, power?: number) => {
    let a = Math.abs(step / 12);
    if (power === 2) a **= 2;
    else if (power === 3) a **= 3;
    else if (power === 4) a **= 4;
    else if (power! >= 5) a **= 5;
    return Math.round(26 * (1 - a));
  }

  // we do lots of manipulation of table rows and stuff that JQuery makes ok, despite
  // IE's poor handling when manipulating the DOM directly.

  createEmptyRowTds = (height: number) => $('<td>')
    .attr('colspan', this.NUMCOLS)
    .css('border', 0)
    .css('height', `${height}px`);
  isNameEditable = (data: RowData) => (!data.name) && (data.status !== 'Disconnected');
  replaceUserRowContents = (tr: JQuery<HTMLElement>, height: number, data: RowData) => {
    const tds = this.createUserRowTds(height, data);
    if (this.isNameEditable(data) && tr.find('td.usertdname input:enabled').length > 0) {
      // preserve input field node
      tds.each((i, td) => {
        // @ts-ignore
        const oldTd = $(tr.find('td').get(i)) as JQuery<HTMLElement>;
        if (!oldTd.hasClass('usertdname')) {
          oldTd.replaceWith(td);
        } else {
          // Prevent leak. I'm not 100% confident that this is necessary, but it shouldn't hurt.
          $(td).remove();
        }
      });
    } else {
      tr.empty().append(tds);
    }
    return tr;
  }

  createUserRowTds = (height: number, data: RowData) => {
    let name;
    if (data.name) {
      name = document.createTextNode(data.name);
    } else {
      name = $('<input>')
        .attr('data-l10n-id', 'pad.userlist.unnamed')
        .attr('type', 'text')
        .addClass('editempty')
        .addClass('newinput')
        .attr('value', html10n.get('pad.userlist.unnamed'));
      if (this.isNameEditable(data)) name.attr('disabled', 'disabled');
    }
    return $()
      .add($('<td>')
        .css('height', `${height}px`)
        .addClass('usertdswatch')
        .append($('<div>')
          .addClass('swatch')
          .css('background', padutils.escapeHtml(data.color))
          .html('&nbsp;')))
      .add($('<td>')
        .css('height', `${height}px`)
        .addClass('usertdname')
        .append(name))
      .add($('<td>')
        .css('height', `${height}px`)
        .addClass('activity')
        .text(data.activity));
  }

  createRow = (id: string, contents: JQuery<HTMLElement>, authorId: string) => $('<tr>')
    .attr('data-authorId', authorId)
    .attr('id', id)
    .append(contents);
  rowNode = (row: Row) => $(`#${row.domId}`);

  handleRowData = (row: Row) => {
    if (row.data && row.data.status === 'Disconnected') {
      row.opacity = 0.5;
    } else {
      delete row.opacity;
    }
  }

  handleOtherUserInputs = () => {
    // handle 'INPUT' elements for naming other unnamed users
    $('#otheruserstable input.newinput').each(() => {
      const input = $(this);
      // @ts-ignore
      const tr = input.closest('tr') as JQuery<HTMLElement>
      if (tr.length > 0) {
        const index = tr.parent().children().index(tr);
        if (index >= 0) {
          const userId = this.rowsPresent[index].data!.id;
          // @ts-ignore
          this.padUserList.rowManagerMakeNameEditor($(this) as JQuery<HTMLElement>, userId);
        }
      }
    }).removeClass('newinput');
  }

  insertRow = (position: number, data: RowData, animationPower?: number) => {
    position = Math.max(0, Math.min(this.rowsPresent.length, position));
    animationPower = (animationPower === undefined ? 4 : animationPower);

    const domId = this.nextRowId();
    const row = {
      data,
      animationStep: this.ANIMATION_START,
      domId,
      animationPower,
    };
    const authorId = data.id;

    this.handleRowData(row);
    this.rowsPresent.splice(position, 0, row);
    let tr;
    if (animationPower === 0) {
      tr = this.createRow(domId, this.createUserRowTds(this.getAnimationHeight(0), data), authorId);
      row.animationStep = 0;
    } else {
      this.rowsFadingIn.push(row);
      tr = this.createRow(domId, this.createEmptyRowTds(this.getAnimationHeight(this.ANIMATION_START)), authorId);
    }
    $('table#otheruserstable').show();
    if (position === 0) {
      $('table#otheruserstable').prepend(tr);
    } else {
      this.rowNode(this.rowsPresent[position - 1]).after(tr);
    }

    if (animationPower !== 0) {
      this.scheduleAnimation();
    }

    this.handleOtherUserInputs();

    return row;
  }

  updateRow = (position: number, data: UserData) => {
    const row = this.rowsPresent[position];
    if (row) {
      row.data = data;
      this.handleRowData(row);
      if (row.animationStep === 0) {
        // not currently animating
        const tr = this.rowNode(row);
        this.replaceUserRowContents(tr, this.getAnimationHeight(0), row.data)
          .find('td')
          .css('opacity', (row.opacity === undefined ? 1 : row.opacity));
        this.handleOtherUserInputs();
      }
    }
  }

  // animationPower is 0 to skip animation, 1 for linear, 2 for quadratic, etc.
  removeRow = (position: number, animationPower?: number) => {
    animationPower = (animationPower === undefined ? 4 : animationPower);
    const row = this.rowsPresent[position];
    if (row) {
      this.rowsPresent.splice(position, 1); // remove
      if (animationPower === 0) {
        this.rowNode(row).remove();
      } else {
        row.animationStep = -row.animationStep!; // use symmetry
        row.animationPower = animationPower;
        this.rowsFadingOut.push(row);
        this.scheduleAnimation();
      }
    }
    if (this.rowsPresent.length === 0) {
      $('table#otheruserstable').hide();
    }
  }

  // newPosition is position after the row has been removed
  moveRow = (oldPosition: number, newPosition: number, animationPower?: number) => {
    animationPower = (animationPower === undefined ? 1 : animationPower); // linear is best
    const row = this.rowsPresent[oldPosition];
    if (row && oldPosition !== newPosition) {
      const rowData = row.data;
      this.removeRow(oldPosition, animationPower);
      this.insertRow(newPosition, rowData!, animationPower);
    }
  }
}


class PadUserList {
  private rowManager: RowManager;
  private otherUsersInfo: UserInfo[] = [];
  private otherUsersData: UserData[] = [];
  private pad?: Pad = undefined;
  private myUserInfo?: UserInfo

  constructor() {
    this.rowManager = new RowManager(this)
  }

  rowManagerMakeNameEditor = (jnode: JQuery<HTMLElement>, userId: string) => {
    this.setUpEditable(jnode, () => {
      const existingIndex = this.findExistingIndex(userId);
      if (existingIndex >= 0) {
        return this.otherUsersInfo[existingIndex].name || '';
      } else {
        return '';
      }
    }, (newName: string) => {
      if (!newName) {
        jnode.addClass('editempty');
        jnode.val(html10n.get('pad.userlist.unnamed'));
      } else {
        jnode.attr('disabled', 'disabled');
        pad.suggestUserName(userId, newName);
      }
    })
  }
  findExistingIndex = (userId: string) => {
    let existingIndex = -1;
    for (let i = 0; i < this.otherUsersInfo.length; i++) {
      if (this.otherUsersInfo[i].userId === userId) {
        existingIndex = i;
        break;
      }
    }
    return existingIndex;
  }

  setUpEditable = (jqueryNode: JQuery<HTMLElement>, valueGetter: () => any, valueSetter: (val: any) => void) => {
    jqueryNode.on('focus', (evt) => {
      const oldValue = valueGetter();
      if (jqueryNode.val() !== oldValue) {
        jqueryNode.val(oldValue);
      }
      jqueryNode.addClass('editactive').removeClass('editempty');
    });
    jqueryNode.on('blur', (evt) => {
      const newValue = jqueryNode.removeClass('editactive').val();
      valueSetter(newValue);
    });
    padutils.bindEnterAndEscape(jqueryNode, () => {
      jqueryNode.trigger('blur');
    }, () => {
      jqueryNode.val(valueGetter()).trigger('blur');
    });
    jqueryNode.prop('disabled', false).addClass('editable');
  }

  init = (myInitialUserInfo: UserInfo, _pad: Pad) => {
    this.pad = _pad;

    this.setMyUserInfo(myInitialUserInfo);

    if ($('#online_count').length === 0) {
      $('#editbar [data-key=showusers] > a').append('<span id="online_count">1</span>');
    }

    $('#otheruserstable tr').remove();

    $('#myusernameedit').addClass('myusernameedithoverable');
    this.setUpEditable($('#myusernameedit'), () => this.myUserInfo!.name || '', (newValue) => {
      this.myUserInfo!.name = newValue;
      pad.notifyChangeName(newValue);
      // wrap with setTimeout to do later because we get
      // a double "blur" fire in IE...
      window.setTimeout(() => {
        this.renderMyUserInfo();
      }, 0);
    });

// color picker
    $('#myswatchbox').on('click', this.showColorPicker);
    $('#mycolorpicker .pickerswatchouter').on('click', function () {
      $('#mycolorpicker .pickerswatchouter').removeClass('picked');
      $(this).addClass('picked');
    });
    $('#mycolorpickersave').on('click', () => {
      this.closeColorPicker(true);
    });
    $('#mycolorpickercancel').on('click', () => {
      this.closeColorPicker(false);
    });
//
  }

  usersOnline = () => {
    // Returns an object of users who are currently online on this pad
    // Make a copy of the otherUsersInfo, otherwise every call to users
    // modifies the referenced array
    let newConcat: UserInfo[] = []
    const userList: UserInfo[] = newConcat.concat(this.otherUsersInfo);
    // Now we need to add ourselves..
    userList.push(this.myUserInfo!);
    return userList;
  }

  users = () => {
    // Returns an object of users who have been on this pad
    const userList = this.usersOnline();

    // Now we add historical authors
    const historical = window.clientVars.collab_client_vars.historicalAuthorData;
    for (const [key,
      {
        userId
      }
    ]
      of
      Object.entries(historical)
      ) {
      // Check we don't already have this author in our array
      let exists = false;

      userList.forEach((user) => {
        if (user.userId === userId) exists = true;
      });

      if (exists === false) {
        userList.push(historical[key]);
      }
    }
    return userList;
  }

  setMyUserInfo = (info: UserInfo) => {
    // translate the colorId
    if (typeof info.colorId === 'number') {
      info.colorId = window.clientVars.colorPalette[info.colorId];
    }

    this.myUserInfo = $.extend(
      {}, info);

    this.renderMyUserInfo();
  }

  userJoinOrUpdate
    =
    (info: UserInfo) => {
      if ((!info.userId) || (info.userId === this.myUserInfo!.userId)) {
        // not sure how this would happen
        return;
      }

      hooks.callAll('userJoinOrUpdate', {
        userInfo: info,
      });

      // @ts-ignore
      const userData: UserData = {};
      // @ts-ignore
      userData.color = typeof info.colorId === 'number'
        ? window.clientVars.colorPalette[info.colorId] : info.colorId!;
      userData.name = info.name;
      userData.status = '';
      userData.activity = '';
      userData.id = info.userId;

      const existingIndex = this.findExistingIndex(info.userId);

      let numUsersBesides = this.otherUsersInfo.length;
      if (existingIndex >= 0) {
        numUsersBesides--;
      }
      const newIndex = padutils.binarySearch(numUsersBesides, (n: number) => {
        if (existingIndex >= 0 && n >= existingIndex) {
          // pretend existingIndex isn't there
          n++;
        }
        const infoN = this.otherUsersInfo[n];
        const nameN = (infoN.name || '').toLowerCase();
        const nameThis = (info.name || '').toLowerCase();
        const idN = infoN.userId;
        const idThis = info.userId;
        return (nameN > nameThis) || (nameN === nameThis && idN > idThis);
      });

      if (existingIndex >= 0) {
        // update
        if (existingIndex === newIndex) {
          this.otherUsersInfo[existingIndex] = info;
          this.otherUsersData[existingIndex] = userData;
          this.rowManager.updateRow(existingIndex, userData!);
        } else {
          this.otherUsersInfo.splice(existingIndex, 1);
          this.otherUsersData.splice(existingIndex, 1);
          this.otherUsersInfo.splice(newIndex, 0, info);
          this.otherUsersData.splice(newIndex, 0, userData);
          this.rowManager.updateRow(existingIndex, userData!);
          this.rowManager.moveRow(existingIndex, newIndex);
        }
      } else {
        this.otherUsersInfo.splice(newIndex, 0, info);
        this.otherUsersData.splice(newIndex, 0, userData);
        this.rowManager.insertRow(newIndex, userData);
      }

      this.updateNumberOfOnlineUsers();
    }

  updateNumberOfOnlineUsers
    =
    () => {
      let online = 1; // you are always online!
      for (let i = 0; i < this.otherUsersData.length; i++) {
        if (this.otherUsersData[i].status === '') {
          online++;
        }
      }

      $('#online_count').text(online);

      return online;
    }

  userLeave
    =
    (info: UserInfo) => {
      const existingIndex = this.findExistingIndex(info.userId);
      if (existingIndex >= 0) {
        const userData = this.otherUsersData[existingIndex];
        userData.status = 'Disconnected';
        this.rowManager.updateRow(existingIndex, userData);
        if (userData.leaveTimer) {
          window.clearTimeout(userData.leaveTimer);
        }
// set up a timer that will only fire if no leaves,
// joins, or updates happen for this user in the
// next N seconds, to remove the user from the list.
        const thisUserId = info.userId;
        const thisLeaveTimer = window.setTimeout(() => {
          const newExistingIndex = this.findExistingIndex(thisUserId);
          if (newExistingIndex >= 0) {
            const newUserData = this.otherUsersData[newExistingIndex];
            if (newUserData.status === 'Disconnected' &&
              newUserData.leaveTimer === thisLeaveTimer) {
              this.otherUsersInfo.splice(newExistingIndex, 1);
              this.otherUsersData.splice(newExistingIndex, 1);
              this.rowManager.removeRow(newExistingIndex);
              hooks.callAll('userLeave', {
                userInfo: info,
              });
            }
          }
        }, 8000); // how long to wait
        userData.leaveTimer = thisLeaveTimer;
      }

      this.updateNumberOfOnlineUsers();
    }

  renderMyUserInfo
    =
    () => {
      if (this.myUserInfo!.name) {
        $('#myusernameedit').removeClass('editempty').val(this.myUserInfo!.name);
      } else {
        $('#myusernameedit').attr('placeholder', html10n.get('pad.userlist.entername'));
      }
      if (colorPickerOpen) {
        $('#myswatchbox').addClass('myswatchboxunhoverable').removeClass('myswatchboxhoverable');
      } else {
        $('#myswatchbox').addClass('myswatchboxhoverable').removeClass('myswatchboxunhoverable');
      }

      $('#myswatch').css({'background-color': this.myUserInfo!.colorId});
      $('li[data-key=showusers] > a').css({'box-shadow': `inset 0 0 30px ${this.myUserInfo!.colorId}`});
    }
  getColorPickerSwatchIndex = (jnode: JQuery<HTMLElement>) => $('#colorpickerswatches li').index(jnode)
  closeColorPicker = (accept: boolean) => {
    if (accept) {
      let newColor = $('#mycolorpickerpreview').css('background-color');
      const parts = newColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      // parts now should be ["rgb(0, 70, 255", "0", "70", "255"]
      if (parts) {
        // @ts-ignore
        delete (parts[0]);
        for (let i = 1; i <= 3; ++i) {
          parts[i] = parseInt(parts[i]).toString(16);
          if (parts[i].length === 1) parts[i] = `0${parts[i]}`;
        }
        newColor = `#${parts.join('')}`; // "0070ff"
      }
      // @ts-ignore
      this.myUserInfo!.colorId! = newColor;
      // @ts-ignore
      pad.notifyChangeColor(newColor);
      paduserlist.renderMyUserInfo();
    } else {
      // pad.notifyChangeColor(previousColorId);
      // paduserlist.renderMyUserInfo();
    }

    colorPickerOpen = false;
    $('#mycolorpicker').removeClass('popup-show');
  }

  showColorPicker = () => {
    // @ts-ignore
    $.farbtastic('#colorpicker').setColor(this.myUserInfo!.colorId);

    if (!colorPickerOpen) {
      const palette = pad.getColorPalette();

      if (!colorPickerSetup) {
        const colorsList = $('#colorpickerswatches');
        for (let i = 0; i < palette.length; i++) {
          const li = $('<li>', {
            style: `background: ${palette[i]};`,
          });

          li.appendTo(colorsList);

          li.on('click', (event) => {
            $('#colorpickerswatches li').removeClass('picked');
            $(event.target).addClass('picked');

            const newColorId = this.getColorPickerSwatchIndex($('#colorpickerswatches .picked'));
            pad.notifyChangeColor(newColorId);
          });
        }

        colorPickerSetup = true;
      }

      $('#mycolorpicker').addClass('popup-show');
      colorPickerOpen = true;

      $('#colorpickerswatches li').removeClass('picked');
      $($('#colorpickerswatches li')[this.myUserInfo!.colorId]).addClass('picked'); // seems weird
    }
  };
}


export const paduserlist = new PadUserList()
