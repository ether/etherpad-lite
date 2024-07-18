import Op from "./Op";

/**
 * Iterator over a changeset's operations.
 *
 * Note: This class does NOT implement the ECMAScript iterable or iterator protocols.
 *
 * @deprecated Use `deserializeOps` instead.
 */
export class OpIter {
  private gen
  /**
   * @param {string} ops - String encoding the change operations to iterate over.
   */
  constructor(ops: string) {
    this.gen = exports.deserializeOps(ops);
    this.next = this.gen.next();
  }

  /**
   * @returns {boolean} Whether there are any remaining operations.
   */
  hasNext() {
    return !this.next.done;
  }

  /**
   * Returns the next operation object and advances the iterator.
   *
   * Note: This does NOT implement the ECMAScript iterator protocol.
   *
   * @param {Op} [opOut] - Deprecated. Operation object to recycle for the return value.
   * @returns {Op} The next operation, or an operation with a falsy `opcode` property if there are
   *     no more operations.
   */
  next(opOut = new Op()) {
    if (this.hasNext()) {
      copyOp(this._next.value, opOut);
      this._next = this._gen.next();
    } else {
      clearOp(opOut);
    }
    return opOut;
  }
}
