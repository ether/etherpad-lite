exports.showCountDownTimerToReconnectOnModal = function ($modal, pad) {
  if (clientVars.automaticReconnectionTimeout && $modal.is('.with_reconnect_timer')) {
    createCountDownElementsIfNecessary($modal);

    const timer = createTimerForModal($modal, pad);

    $modal.find('#cancelreconnect').one('click', () => {
      timer.cancel();
      disableAutomaticReconnection($modal);
    });

    enableAutomaticReconnection($modal);
  }
};

var createCountDownElementsIfNecessary = function ($modal) {
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

var localize = function ($element) {
  html10n.translateElement(html10n.translations, $element.get(0));
};

var createTimerForModal = function ($modal, pad) {
  const timeUntilReconnection = clientVars.automaticReconnectionTimeout * reconnectionTries.nextTry();
  const timer = new CountDownTimer(timeUntilReconnection);

  timer.onTick((minutes, seconds) => {
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

var disableAutomaticReconnection = function ($modal) {
  toggleAutomaticReconnectionOption($modal, true);
};
var enableAutomaticReconnection = function ($modal) {
  toggleAutomaticReconnectionOption($modal, false);
};
var toggleAutomaticReconnectionOption = function ($modal, disableAutomaticReconnect) {
  $modal.find('#cancelreconnect, .reconnecttimer').toggleClass('hidden', disableAutomaticReconnect);
  $modal.find('#defaulttext').toggleClass('hidden', !disableAutomaticReconnect);
};

var waitUntilClientCanConnectToServerAndThen = function (callback, pad) {
  whenConnectionIsRestablishedWithServer(callback, pad);
  pad.socket.connect();
};

var whenConnectionIsRestablishedWithServer = function (callback, pad) {
  // only add listener for the first try, don't need to add another listener
  // on every unsuccessful try
  if (reconnectionTries.counter === 1) {
    pad.socket.once('connect', callback);
  }
};

var forceReconnection = function ($modal) {
  $modal.find('#forcereconnect').click();
};

var updateCountDownTimerMessage = function ($modal, minutes, seconds) {
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  seconds = seconds < 10 ? `0${seconds}` : seconds;

  $modal.find('.timetoexpire').text(`${minutes}:${seconds}`);
};

// store number of tries to reconnect to server, in order to increase time to wait
// until next try
var reconnectionTries = {
  counter: 0,

  nextTry() {
    // double the time to try to reconnect on every time reconnection fails
    const nextCounterFactor = Math.pow(2, this.counter);
    this.counter++;

    return nextCounterFactor;
  },
};

// Timer based on http://stackoverflow.com/a/20618517.
// duration: how many **seconds** until the timer ends
// granularity (optional): how many **milliseconds** between each 'tick' of timer. Default: 1000ms (1s)
var CountDownTimer = function (duration, granularity) {
  this.duration = duration;
  this.granularity = granularity || 1000;
  this.running = false;

  this.onTickCallbacks = [];
  this.onExpireCallbacks = [];
};

CountDownTimer.prototype.start = function () {
  if (this.running) {
    return;
  }
  this.running = true;
  const start = Date.now();
  const that = this;
  let diff;

  (function timer() {
    diff = that.duration - Math.floor((Date.now() - start) / 1000);

    if (diff > 0) {
      that.timeoutId = setTimeout(timer, that.granularity);
      that.tick(diff);
    } else {
      that.running = false;
      that.tick(0);
      that.expire();
    }
  }());
};

CountDownTimer.prototype.tick = function (diff) {
  const obj = CountDownTimer.parse(diff);
  this.onTickCallbacks.forEach(function (callback) {
    callback.call(this, obj.minutes, obj.seconds);
  }, this);
};
CountDownTimer.prototype.expire = function () {
  this.onExpireCallbacks.forEach(function (callback) {
    callback.call(this);
  }, this);
};

CountDownTimer.prototype.onTick = function (callback) {
  if (typeof callback === 'function') {
    this.onTickCallbacks.push(callback);
  }
  return this;
};

CountDownTimer.prototype.onExpire = function (callback) {
  if (typeof callback === 'function') {
    this.onExpireCallbacks.push(callback);
  }
  return this;
};

CountDownTimer.prototype.cancel = function () {
  this.running = false;
  clearTimeout(this.timeoutId);
  return this;
};

CountDownTimer.parse = function (seconds) {
  return {
    minutes: (seconds / 60) | 0,
    seconds: (seconds % 60) | 0,
  };
};
