
exports.showCountDownTimerToReconnectOnModal = function($modal, pad) {
  if (clientVars.automaticReconnectionTimeout && $modal.is('.with_reconnect_timer')) {
    createCountDownElementsIfNecessary($modal);

    var timer = createTimerForModal($modal, pad);

    $modal.find('#cancelreconnect').one('click', function() {
      timer.cancel();
      disableAutomaticReconnection($modal);
    });

    enableAutomaticReconnection($modal);
  }
}

var createCountDownElementsIfNecessary = function($modal) {
  var elementsDoNotExist = $modal.find('#cancelreconnect').length === 0;
  if (elementsDoNotExist) {
    var $defaultMessage = $modal.find('#defaulttext');
    var $reconnectButton = $modal.find('#forcereconnect');

    // create extra DOM elements, if they don't exist
    var $reconnectTimerMessage = $('<p class="reconnecttimer"> \
                                      <span data-l10n-id="pad.modals.reconnecttimer">Trying to reconnect in </span> \
                                      <span class="timetoexpire"></span> \
                                    </p>');
    var $cancelReconnect = $('<button id="cancelreconnect" data-l10n-id="pad.modals.cancel">Cancel</button>');

    localize($reconnectTimerMessage);
    localize($cancelReconnect);

    $reconnectTimerMessage.insertAfter($defaultMessage);
    $cancelReconnect.insertAfter($reconnectButton);
  }
}

var localize = function($element) {
  html10n.translateElement(html10n.translations, $element.get(0));
};

var createTimerForModal = function($modal, pad) {
  var timeUntilReconnection = clientVars.automaticReconnectionTimeout * reconnectionTries.nextTry();
  var timer = new CountDownTimer(timeUntilReconnection);

  timer.onTick(function(minutes, seconds) {
    updateCountDownTimerMessage($modal, minutes, seconds);
  }).onExpire(function() {
    var wasANetworkError = $modal.is('.disconnected');
    if (wasANetworkError) {
      // cannot simply reconnect, client is having issues to establish connection to server
      waitUntilClientCanConnectToServerAndThen(function() { forceReconnection($modal); }, pad);
    } else {
      forceReconnection($modal);
    }
  }).start();

  return timer;
}

var disableAutomaticReconnection = function($modal) {
  toggleAutomaticReconnectionOption($modal, true);
}
var enableAutomaticReconnection = function($modal) {
  toggleAutomaticReconnectionOption($modal, false);
}
var toggleAutomaticReconnectionOption = function($modal, disableAutomaticReconnect) {
  $modal.find('#cancelreconnect, .reconnecttimer').toggleClass('hidden', disableAutomaticReconnect);
  $modal.find('#defaulttext').toggleClass('hidden', !disableAutomaticReconnect);
}

var waitUntilClientCanConnectToServerAndThen = function(callback, pad) {
  whenConnectionIsRestablishedWithServer(callback, pad);
  pad.socket.connect();
}

var whenConnectionIsRestablishedWithServer = function(callback, pad) {
  // only add listener for the first try, don't need to add another listener
  // on every unsuccessful try
  if (reconnectionTries.counter === 1) {
    pad.socket.once('connect', callback);
  }
}

var forceReconnection = function($modal) {
  $modal.find('#forcereconnect').click();
}

var updateCountDownTimerMessage = function($modal, minutes, seconds) {
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  $modal.find('.timetoexpire').text(minutes + ':' + seconds);
}

// store number of tries to reconnect to server, in order to increase time to wait
// until next try
var reconnectionTries = {
  counter: 0,

  nextTry: function() {
    // double the time to try to reconnect on every time reconnection fails
    var nextCounterFactor = Math.pow(2, this.counter);
    this.counter++;

    return nextCounterFactor;
  }
}

// Timer based on http://stackoverflow.com/a/20618517.
// duration: how many **seconds** until the timer ends
// granularity (optional): how many **milliseconds** between each 'tick' of timer. Default: 1000ms (1s)
var CountDownTimer = function(duration, granularity) {
  this.duration    = duration;
  this.granularity = granularity || 1000;
  this.running     = false;

  this.onTickCallbacks    = [];
  this.onExpireCallbacks = [];
}

CountDownTimer.prototype.start = function() {
  if (this.running) {
    return;
  }
  this.running = true;
  var start = Date.now(),
      that = this,
      diff;

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

CountDownTimer.prototype.tick = function(diff) {
  var obj = CountDownTimer.parse(diff);
  this.onTickCallbacks.forEach(function(callback) {
    callback.call(this, obj.minutes, obj.seconds);
  }, this);
}
CountDownTimer.prototype.expire = function() {
  this.onExpireCallbacks.forEach(function(callback) {
    callback.call(this);
  }, this);
}

CountDownTimer.prototype.onTick = function(callback) {
  if (typeof callback === 'function') {
    this.onTickCallbacks.push(callback);
  }
  return this;
};

CountDownTimer.prototype.onExpire = function(callback) {
  if (typeof callback === 'function') {
    this.onExpireCallbacks.push(callback);
  }
  return this;
};

CountDownTimer.prototype.cancel = function() {
  this.running = false;
  clearTimeout(this.timeoutId);
  return this;
};

CountDownTimer.parse = function(seconds) {
  return {
    'minutes': (seconds / 60) | 0,
    'seconds': (seconds % 60) | 0
  };
};
