'use strict';

// Low-level utilities for manipulating attribute strings. For a high-level API, see AttributeMap.

/**
 * A `[key, value]` pair of strings describing a text attribute.
 *
 * @typedef {[string, string]} Attribute
 */

/**
 * A concatenated sequence of zero or more attribute identifiers, each one represented by an
 * asterisk followed by a base-36 encoded attribute number.
 *
 * Examples: '', '*0', '*3*j*z*1q'
 *
 * @typedef {string} AttributeString
 */

/**
 * Converts an attribute string into a sequence of attribute identifier numbers.
 *
 * WARNING: This only works on attribute strings. It does NOT work on serialized operations or
 * changesets.
 *
 * @param {AttributeString} str - Attribute string.
 * @yields {number} The attribute numbers (to look up in the associated pool), in the order they
 *     appear in `str`.
 * @returns {Generator<number>}
 */
exports.decodeAttribString = function* (str) {
  const re = /\*([0-9a-z]+)|./gy;
  let match;
  while ((match = re.exec(str)) != null) {
    const [m, n] = match;
    if (n == null) throw new Error(`invalid character in attribute string: ${m}`);
    yield Number.parseInt(n, 36);
  }
};

const checkAttribNum = (n) => {
  if (typeof n !== 'number') throw new TypeError(`not a number: ${n}`);
  if (n < 0) throw new Error(`attribute number is negative: ${n}`);
  if (n !== Math.trunc(n)) throw new Error(`attribute number is not an integer: ${n}`);
};

/**
 * Inverse of `decodeAttribString`.
 *
 * @param {Iterable<number>} attribNums - Sequence of attribute numbers.
 * @returns {AttributeString}
 */
exports.encodeAttribString = (attribNums) => {
  let str = '';
  for (const n of attribNums) {
    checkAttribNum(n);
    str += `*${n.toString(36).toLowerCase()}`;
  }
  return str;
};

/**
 * Converts a sequence of attribute numbers into a sequence of attributes.
 *
 * @param {Iterable<number>} attribNums - Attribute numbers to look up in the pool.
 * @param {AttributePool} pool - Attribute pool.
 * @yields {Attribute} The identified attributes, in the same order as `attribNums`.
 * @returns {Generator<Attribute>}
 */
exports.attribsFromNums = function* (attribNums, pool) {
  for (const n of attribNums) {
    checkAttribNum(n);
    const attrib = pool.getAttrib(n);
    if (attrib == null) throw new Error(`attribute ${n} does not exist in pool`);
    yield attrib;
  }
};

/**
 * Inverse of `attribsFromNums`.
 *
 * @param {Iterable<Attribute>} attribs - Attributes. Any attributes not already in `pool` are
 *     inserted into `pool`. No checking is performed to ensure that the attributes are in the
 *     canonical order and that there are no duplicate keys. (Use an AttributeMap and/or `sort()` if
 *     required.)
 * @param {AttributePool} pool - Attribute pool.
 * @yields {number} The attribute number of each attribute in `attribs`, in order.
 * @returns {Generator<number>}
 */
exports.attribsToNums = function* (attribs, pool) {
  for (const attrib of attribs) yield pool.putAttrib(attrib);
};

/**
 * Convenience function that is equivalent to `attribsFromNums(decodeAttribString(str), pool)`.
 *
 * WARNING: This only works on attribute strings. It does NOT work on serialized operations or
 * changesets.
 *
 * @param {AttributeString} str - Attribute string.
 * @param {AttributePool} pool - Attribute pool.
 * @yields {Attribute} The attributes identified in `str`, in order.
 * @returns {Generator<Attribute>}
 */
exports.attribsFromString = function* (str, pool) {
  yield* exports.attribsFromNums(exports.decodeAttribString(str), pool);
};

/**
 * Inverse of `attribsFromString`.
 *
 * @param {Iterable<Attribute>} attribs - Attributes. The attributes to insert into the pool (if
 *     necessary) and encode. No checking is performed to ensure that the attributes are in the
 *     canonical order and that there are no duplicate keys. (Use an AttributeMap and/or `sort()` if
 *     required.)
 * @param {AttributePool} pool - Attribute pool.
 * @returns {AttributeString}
 */
exports.attribsToString =
    (attribs, pool) => exports.encodeAttribString(exports.attribsToNums(attribs, pool));

/**
 * Sorts the attributes in canonical order. The order of entries with the same attribute name is
 * unspecified.
 *
 * @param {Attribute[]} attribs - Attributes to sort in place.
 * @returns {Attribute[]} `attribs` (for chaining).
 */
exports.sort =
    (attribs) => attribs.sort(([keyA], [keyB]) => (keyA > keyB ? 1 : 0) - (keyA < keyB ? 1 : 0));
