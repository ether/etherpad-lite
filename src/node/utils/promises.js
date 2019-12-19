/**
 * Helpers to manipulate promises (like async but for promises).
 */

var timesLimit = function (ltMax, concurrency, promiseCreator) {
  var done = 0
  var current = 0

  function addAnother () {
    function _internalRun () {
      done++

      if (done < ltMax) {
        addAnother()
      }
    }

    promiseCreator(current)
      .then(_internalRun)
      .catch(_internalRun)

    current++
  }

  for (var i = 0; i < concurrency && i < ltMax; i++) {
    addAnother()
  }
}

module.exports = {
  timesLimit: timesLimit
}
