# Hooks
All hooks are called with two arguments:

1. name - the name of the hook being called
2. context - an object with some relevant information about the context of the call

## Return values
A hook should always return a list or undefined. Returning undefined is equivalent to returning an empty list.
All the returned lists are appended to each other, so if the return values where `[1, 2]`, `undefined`, `[3, 4,]`, `undefined` and `[5]`, the value returned by callHook would be `[1, 2, 3, 4, 5]`.

This is, because it should never matter if you have one plugin or several plugins doing some work - a single plugin should be able to make callHook return the same value a set of plugins are able to return collectively. So, any plugin can return a list of values, of any length, not just one value.