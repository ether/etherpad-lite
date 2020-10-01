/**
 * Helpers to manipulate promises (like async but for promises).
 */

// Returns a Promise that resolves to the first resolved value from `promises` that satisfies
// `predicate`. Resolves to `undefined` if none of the Promises satisfy `predicate`, or if
// `promises` is empty. If `predicate` is nullish, the truthiness of the resolved value is used as
// the predicate.
exports.firstSatisfies = (promises, predicate) => {
  if (predicate == null) predicate = (x) => x;

  // Transform each original Promise into a Promise that never resolves if the original resolved
  // value does not satisfy `predicate`. These transformed Promises will be passed to Promise.race,
  // yielding the first resolved value that satisfies `predicate`.
  const newPromises = promises.map(
    (p) => new Promise((resolve, reject) => p.then((v) => predicate(v) && resolve(v), reject)));

  // If `promises` is an empty array or if none of them resolve to a value that satisfies
  // `predicate`, then `Promise.race(newPromises)` will never resolve. To handle that, add another
  // Promise that resolves to `undefined` after all of the original Promises resolve.
  //
  // Note: If all of the original Promises simultaneously resolve to a value that satisfies
  // `predicate` (perhaps they were already resolved when this function was called), then this
  // Promise will resolve too, and with a value of `undefined`. There is no concern that this
  // Promise will win the race and thus cause an erroneous `undefined` result. This is because
  // a resolved Promise's `.then()` function is scheduled for execution -- not executed right away
  // -- and ES guarantees in-order execution of the enqueued invocations. Each of the above
  // transformed Promises has a `.then()` chain of length one, while the Promise added here has a
  // `.then()` chain of length two or more (at least one `.then()` that is internal to
  // `Promise.all()`, plus the `.then()` function added here). By the time the `.then()` function
  // added here executes, all of the above transformed Promises will have already resolved and one
  // will have been chosen as the winner.
  newPromises.push(Promise.all(promises).then(() => {}));

  return Promise.race(newPromises);
};

exports.timesLimit = function(ltMax, concurrency, promiseCreator) {
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
