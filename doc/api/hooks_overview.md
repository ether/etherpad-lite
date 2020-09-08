# Hooks

A hook function is registered with a hook via the plugin's `ep.json` file. See
the Plugins section for details. A hook may have many registered functions from
different plugins.

When a hook is invoked, its registered functions are called with three
arguments:

1. hookName - The name of the hook being invoked.
2. context - An object with some relevant information about the context of the
   call. See the hook-specific documentation for details.
3. callback - Function to call when done. This callback takes a single argument,
   the meaning of which depends on the hook. See the "Return values" section for
   general information that applies to most hooks. The value returned by this
   callback must be returned by the hook function unless otherwise specified.

## Return values

Note: This section applies to every hook unless the hook-specific documentation
says otherwise.

Hook functions return zero or more values to Etherpad by passing an array to the
provided callback. Hook functions typically provide a single value (array of
length one). If the function does not want to or need to provide a value, it may
pass an empty array or `undefined` (which is treated the same as an empty
array). Hook functions may also provide more than one value (array of length two
or more).

Some hooks concatenate the arrays provided by its registered functions. For
example, if a hook's registered functions pass `[1, 2]`, `undefined`, `[3, 4]`,
`[]`, and `[5]` to the provided callback, then the hook's return value is `[1,
2, 3, 4, 5]`.

Other hooks only use the first non-empty array provided by a registered
function. In this case, each of the hook's registered functions is called one at
a time until one provides a non-empty array. The remaining functions are
skipped. If none of the functions provide a non-empty array, or there are no
registered functions, the hook's return value is `[]`.

Example:

```
exports.abstractHook = (hookName, context, callback) => {
  if (notApplicableToThisPlugin(context)) {
    return callback();
  }
  const value = doSomeProcessing(context);
  return callback([value]);
};
```
