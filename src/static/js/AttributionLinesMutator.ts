import {TextLinesMutator} from "./TextLinesMutator";
import AttributePool from "./AttributePool";
import {assert, copyOp, deserializeOps, slicerZipperFunc, unpack} from "./Changeset";
import Op from "./Op";
import {MergingOpAssembler} from "./MergingOpAssembler";

/**
 * Applies a changeset to an array of attribute lines.
 *
 * @param {string} cs - The encoded changeset.
 * @param {Array<string>} lines - Attribute lines. Modified in place.
 * @param {AttributePool.ts} pool - Attribute pool.
 */
export class AttributionLinesMutator {
  private unpacked
  private csOps: Generator<Op>|Op
  private csOpsNext: IteratorResult<Op>
  private csBank: string
  private csBankIndex: number
  private mut: TextLinesMutator
  private lineOps: Generator<Op>|null
  private lineOpsNext: IteratorResult<Op>|null
  private lineAssem: null|MergingOpAssembler
  private attOp: Op
  private csOp: Op
  constructor(cs: string, lines:string[], pool: AttributePool) {
    this.unpacked = unpack(cs);
    this.csOps = deserializeOps(this.unpacked.ops);
    this.csOpsNext = this.csOps.next();
    this.csBank = this.unpacked.charBank;
    this.csBankIndex = 0;
    // treat the attribution lines as text lines, mutating a line at a time
    this.mut = new TextLinesMutator(lines);
    /**
     * The Ops in the current line from `lines`.
     *
     * @type {?Generator<Op>}
     */
    this.lineOps = null;
    this.lineOpsNext = null;
    this.lineAssem = null
    this.csOp = new Op()
    this.attOp = new Op()
    while (this.csOp.opcode || !this.csOpsNext.done || this.attOp.opcode || this.isNextMutOp()) {
      if (!this.csOp.opcode && !this.csOpsNext.done) {
        // coOp done, but more ops in cs.
        this.csOp = this.csOpsNext.value;
        this.csOpsNext = this.csOps.next();
      }
      if (!this.csOp.opcode && !this.attOp.opcode && !this.lineAssem && !this.lineOpsHasNext()) {
        break; // done
      } else if (this.csOp.opcode === '=' && this.csOp.lines > 0 && !this.csOp.attribs && !this.attOp.opcode &&
        !this.lineAssem && !this.lineOpsHasNext()) {
        // Skip multiple lines without attributes; this is what makes small changes not order of the
        // document size.
        this.mut.skipLines(this.csOp.lines);
        this.csOp.opcode = '';
      } else if (this.csOp.opcode === '+') {
        const opOut = copyOp(this.csOp);
        if (this.csOp.lines > 1) {
          // Copy the first line from `csOp` to `opOut`.
          const firstLineLen = this.csBank.indexOf('\n', this.csBankIndex) + 1 - this.csBankIndex;
          this.csOp.chars -= firstLineLen;
          this.csOp.lines--;
          opOut.lines = 1;
          opOut.chars = firstLineLen;
        } else {
          // Either one or no newlines in '+' `csOp`, copy to `opOut` and reset `csOp`.
          this.csOp.opcode = '';
        }
        this.outputMutOp(opOut);
        this.csBankIndex += opOut.chars;
      } else {
        if (!this.attOp.opcode && this.isNextMutOp()) {
          this.attOp = this.nextMutOp();
        }
        const opOut = slicerZipperFunc(this.attOp, this.csOp, pool);
        if (opOut.opcode) {
          this.outputMutOp(opOut);
        }
      }
    }

    assert(!this.lineAssem, `line assembler not finished:${cs}`);
    this.mut.close();
  }

  lineOpsHasNext = () => this.lineOpsNext && !this.lineOpsNext.done;
  /**
   * Returns false if we are on the last attribute line in `lines` and there is no additional op in
   * that line.
   *
   * @returns {boolean} True if there are more ops to go through.
   */
  isNextMutOp = () => this.lineOpsHasNext() || this.mut.hasMore();


  /**
   * @returns {Op} The next Op from `lineIter`. If there are no more Ops, `lineIter` is reset to
   *     iterate over the next line, which is consumed from `mut`. If there are no more lines,
   *     returns a null Op.
   */
  nextMutOp = () => {
    if (!this.lineOpsHasNext() && this.mut.hasMore()) {
      // There are more attribute lines in `lines` to do AND either we just started so `lineIter` is
      // still null or there are no more ops in current `lineIter`.
      const line = this.mut.removeLines(1);
      this.lineOps = deserializeOps(line);
      this.lineOpsNext = this.lineOps.next();
    }
    if (!this.lineOpsHasNext()) return new Op(); // No more ops and no more lines.
    const op = this.lineOpsNext!.value;
    this.lineOpsNext = this.lineOps!.next();
    return op;
  }

  /**
   * Appends an op to `lineAssem`. In case `lineAssem` includes one single newline, adds it to the
   * `lines` mutator.
   */
  outputMutOp = (op: Op) => {
    if (!this.lineAssem) {
      this.lineAssem = new MergingOpAssembler()
    }
    this.lineAssem.append(op);
    if (op.lines <= 0) return;
    assert(op.lines === 1, `Can't have op.lines of ${op.lines} in attribution lines`);
    // ship it to the mut
    this.mut.insert(this.lineAssem.toString(), 1);
    this.lineAssem = null;
  };
}
