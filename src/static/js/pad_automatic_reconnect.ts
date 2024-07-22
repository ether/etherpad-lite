'use strict';
import html10n from './vendors/html10n';
import {PadOption} from "./types/SocketIOMessage";
import {Pad} from "./pad";

export const showCountDownTimerToReconnectOnModal = ($modal: JQuery<HTMLElement>, pad: Pad) => {
  if (window.clientVars.automaticReconnectionTimeout && $modal.is('.with_reconnect_timer')) {
    createCountDownElementsIfNecessary($modal);

    const timer = createTimerForModal($modal, pad);

    $modal.find('#cancelreconnect').one('click', () => {
      timer.cancel();
      disableAutomaticReconnection($modal);
    });

    enableAutomaticReconnection($modal);
  }
};

const createCountDownElementsIfNecessary = ($modal: JQuery<HTMLElement>) => {
  const elementsDoNotExist = $modal.find('#cancelreconnect').length === 0;
  if (elementsDoNotExist) {
    const $defaultMessage = $modal.find('#defaulttext');
    const $reconnectButton = $modal.find('#forcereconnect');

    // create extra DOM elements, if they don't exist
    const $reconnectTimerMessage =
        $('<p>')
            .addClass('reconnecttimer')
            .append(
                $('<span>')
                    .attr('data-l10n-id', 'pad.modals.reconnecttimer')
                    .text('Trying to reconnect in'))
            .append(' ')
            .append(
                $('<span>')
                    .addClass('timetoexpire'));
    const $cancelReconnect =
        $('<button>')
            .attr('id', 'cancelreconnect')
            .attr('data-l10n-id', 'pad.modals.cancel')
            .text('Cancel');

    localize($reconnectTimerMessage);
    localize($cancelReconnect);

    $reconnectTimerMessage.insertAfter($defaultMessage);
    $cancelReconnect.insertAfter($reconnectButton);
  }
};

const localize = ($element: JQuery<HTMLElement>) => {
  html10n.translateElement(html10n.translations, $element.get(0));
};

const createTimerForModal = ($modal: JQuery<HTMLElement>, pad: Pad) => {
  const timeUntilReconnection =
      window.clientVars.automaticReconnectionTimeout * reconnectionTries.nextTry();
  const timer = new CountDownTimer(timeUntilReconnection);

  timer.onTick((minutes: number, seconds: number) => {
    updateCountDownTimerMessage($modal, minutes, seconds);
  }).onExpire(() => {
    const wasANetworkError = $modal.is('.disconnected');
    if (wasANetworkError) {
      // cannot simply reconnect, client is having issues to establish connection to server
      waitUntilClientCanConnectToServerAndThen(() => { forceReconnection($modal); }, pad);
    } else {
      forceReconnection($modal);
    }
  }).start();

  return timer;
};

const disableAutomaticReconnection = ($modal: JQuery<HTMLElement>) => {
  toggleAutomaticReconnectionOption($modal, true);
};
const enableAutomaticReconnection = ($modal: JQuery<HTMLElement>) => {
  toggleAutomaticReconnectionOption($modal, false);
};
const toggleAutomaticReconnectionOption = ($modal: JQuery<HTMLElement>, disableAutomaticReconnect: boolean) => {
  $modal.find('#cancelreconnect, .reconnecttimer').toggleClass('hidden', disableAutomaticReconnect);
  $modal.find('#defaulttext').toggleClass('hidden', !disableAutomaticReconnect);
};

const waitUntilClientCanConnectToServerAndThen = (callback: Function, pad: Pad) => {
  whenConnectionIsRestablishedWithServer(callback, pad);
  pad.socket.connect();
};

const whenConnectionIsRestablishedWithServer = (callback: Function, pad: Pad) => {
  // only add listener for the first try, don't need to add another listener
  // on every unsuccessful try
  if (reconnectionTries.counter === 1) {
    pad.socket.once('connect', callback);
  }
};

const forceReconnection = ($modal: JQuery<HTMLElement>) => {
  $modal.find('#forcereconnect').trigger('click');
};

const updateCountDownTimerMessage = ($modal: JQuery<HTMLElement>, minutes: number, seconds: number) => {
  let minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
  let secondsFormatted = seconds < 10 ? `0${seconds}` : seconds;

  $modal.find('.timetoexpire').text(`${minutesFormatted}:${secondsFormatted}`);
};

// store number of tries to reconnect to server, in order to increase time to wait
// until next try
const reconnectionTries = {
  counter: 0,

  nextTry() {
    // double the time to try to reconnect on every time reconnection fails
    const nextCounterFactor = 2 ** this.counter;
    this.counter++;

    return nextCounterFactor;
  },
};

// Timer based on http://stackoverflow.com/a/20618517.
// duration: how many **seconds** until the timer ends
// granularity (optional): how many **milliseconds**
// between each 'tick' of timer. Default: 1000ms (1s)

class CountDownTimer {
  private duration: number
  private granularity: number
  private running: boolean
  private onTickCallbacks: Function[]
  private onExpireCallbacks: Function[]
  private timeoutId: any = 0
  constructor(duration: number, granularity?: number) {
    this.duration = duration;
    this.granularity = granularity || 1000;
    this.running = false;

    this.onTickCallbacks = [];
    this.onExpireCallbacks = [];
  }
  start =  ()=> {
    if (this.running) {
      return;
    }
    this.running = true;
    const start = Date.now();
    const that = this;
    let diff;
    const timer = () => {
      diff = that.duration - Math.floor((Date.now() - start) / 1000);

      if (diff > 0) {
        that.timeoutId = setTimeout(timer, that.granularity);
        that.tick(diff);
      } else {
        that.running = false;
        that.tick(0);
        that.expire();
      }
    };
    timer();
  }
  tick =  (diff: number)=> {
    const obj = this.parse(diff);
    this.onTickCallbacks.forEach( (callback)=> {
      callback.call(this, obj.minutes, obj.seconds);
    }, this);
  }
  expire =  ()=> {
    this.onExpireCallbacks.forEach( (callback)=> {
      callback.call(this);
    }, this);
  }
  onTick =  (callback: Function)=> {
    if (typeof callback === 'function') {
      this.onTickCallbacks.push(callback);
    }
    return this;
  }

  onExpire =  (callback: Function)=> {
    if (typeof callback === 'function') {
      this.onExpireCallbacks.push(callback);
    }
    return this;
  }
  cancel =  () => {
    this.running = false;
    clearTimeout(this.timeoutId);
    return this;
  }
  parse = (seconds: number) => ({
    minutes: (seconds / 60) | 0,
    seconds: (seconds % 60) | 0,
  });
}
