
/**
 * Class to iterate and modify texts which have several lines. It is used for applying Changesets on
 * arrays of lines.
 *
 * Mutation operations have the same constraints as exports operations with respect to newlines, but
 * not the other additional constraints (i.e. ins/del ordering, forbidden no-ops, non-mergeability,
 * final newline). Can be used to mutate lists of strings where the last char of each string is not
 * actually a newline, but for the purposes of N and L values, the caller should pretend it is, and
 * for things to work right in that case, the input to the `insert` method should be a single line
 * with no newlines.
 */
export class TextLinesMutator {
  private readonly lines: string[]
  private readonly curSplice: [number, number]
  private inSplice: boolean
  private curLine: number
  private curCol: number
  /**
   * @param {(string[]|StringArrayLike)} lines - Lines to mutate (in place).
   */
  constructor(lines: string[]) {
    this.lines = lines;
    /**
     * this._curSplice holds values that will be passed as arguments to this._lines.splice() to
     * insert, delete, or change lines:
     *   - this._curSplice[0] is an index into the this._lines array.
     *   - this._curSplice[1] is the number of lines that will be removed from the this._lines array
     *     starting at the index.
     *   - The other elements represent mutated (changed by ops) lines or new lines (added by ops)
     *     to insert at the index.
     *
     * @type {[number, number?, ...string[]?]}
     */
    this.curSplice = [0, 0];
    this.inSplice = false;
    // position in lines after curSplice is applied:
    this.curLine = 0;
    this.curCol = 0;
    // invariant: if (inSplice) then (curLine is in curSplice[0] + curSplice.length - {2,3}) &&
    //            curLine >= curSplice[0]
    // invariant: if (inSplice && (curLine >= curSplice[0] + curSplice.length - 2)) then
    //            curCol == 0
  }

  /**
   * Get a line from `lines` at given index.
   *
   * @param {number} idx - an index
   * @returns {string}
   */
  private linesGet(idx: number) {
    if ('get' in this.lines) {
      // @ts-ignore
      return this.lines.get(idx) as string;
    } else {
      return this.lines[idx];
    }
  }

  /**
   * Return a slice from `lines`.
   *
   * @param {number} start - the start index
   * @param {number} end - the end index
   * @returns {string[]}
   */
  private linesSlice(start: number, end: number): string[] {
    // can be unimplemented if removeLines's return value not needed
    if (this.lines.slice) {
      return this.lines.slice(start, end);
    } else {
      return [];
    }
  }

  /**
   * Return the length of `lines`.
   *
   * @returns {number}
   */
  private linesLength() {
    if (typeof this.lines.length === 'number') {
      return this.lines.length;
    } else {
      // @ts-ignore
      return this.lines.length();
    }
  }

  /**
   * Starts a new splice.
   */
  enterSplice() {
    this.curSplice[0] = this.curLine;
    this.curSplice[1] = 0;
    // TODO(doc) when is this the case?
    //           check all enterSplice calls and changes to curCol
    if (this.curCol > 0) this.putCurLineInSplice();
    this.inSplice = true;
  }

  /**
   * Changes the lines array according to the values in curSplice and resets curSplice. Called via
   * close or TODO(doc).
   */
  private leaveSplice() {
    this.lines.splice(...this.curSplice);
    this.curSplice.length = 2;
    this.curSplice[0] = this.curSplice[1] = 0;
    this.inSplice = false;
  }

  /**
   * Indicates if curLine is already in the splice. This is necessary because the last element in
   * curSplice is curLine when this line is currently worked on (e.g. when skipping or inserting).
   *
   * @returns {boolean} true if curLine is in splice
   */
  private isCurLineInSplice() {
    // The value of `this._curSplice[1]` does not matter when determining the return value because
    // `this._curLine` refers to the line number *after* the splice is applied (so after those lines
    // are deleted).
    return this.curLine - this.curSplice[0] < this.curSplice.length - 2;
  }

  /**
   * Incorporates current line into the splice and marks its old position to be deleted.
   *
   * @returns {number} the index of the added line in curSplice
   */
  private putCurLineInSplice() {
    if (!this.isCurLineInSplice()) {
      this.curSplice.push(Number(this.linesGet(this.curSplice[0] + this.curSplice[1]!)));
      this.curSplice[1]!++;
    }
    // TODO should be the same as this._curSplice.length - 1
    return 2 + this.curLine - this.curSplice[0];
  }

  /**
   * It will skip some newlines by putting them into the splice.
   *
   * @param {number} L -
   * @param {boolean} includeInSplice - Indicates that attributes are present.
   */
  public skipLines(L: number, includeInSplice?: boolean) {
    if (!L) return;
    if (includeInSplice) {
      if (!this.inSplice) this.enterSplice();
      // TODO(doc) should this count the number of characters that are skipped to check?
      for (let i = 0; i < L; i++) {
        this.curCol = 0;
        this.putCurLineInSplice();
        this.curLine++;
      }
    } else {
      if (this.inSplice) {
        if (L > 1) {
          // TODO(doc) figure out why single lines are incorporated into splice instead of ignored
          this.leaveSplice();
        } else {
          this.putCurLineInSplice();
        }
      }
      this.curLine += L;
      this.curCol = 0;
    }
    // tests case foo in remove(), which isn't otherwise covered in current impl
  }

  /**
   * Skip some characters. Can contain newlines.
   *
   * @param {number} N - number of characters to skip
   * @param {number} L - number of newlines to skip
   * @param {boolean} includeInSplice - indicates if attributes are present
   */
  skip(N: number, L: number, includeInSplice: boolean) {
    if (!N) return;
    if (L) {
      this.skipLines(L, includeInSplice);
    } else {
      if (includeInSplice && !this.inSplice) this.enterSplice();
      if (this.inSplice) {
        // although the line is put into splice curLine is not increased, because
        // only some chars are skipped, not the whole line
        this.putCurLineInSplice();
      }
      this.curCol += N;
    }
  }

  /**
   * Remove whole lines from lines array.
   *
   * @param {number} L - number of lines to remove
   * @returns {string}
   */
  removeLines(L: number):string {
    if (!L) return '';
    if (!this.inSplice) this.enterSplice();

    /**
     * Gets a string of joined lines after the end of the splice.
     *
     * @param {number} k - number of lines
     * @returns {string} joined lines
     */
    const nextKLinesText = (k: number): string => {
      const m = this.curSplice[0] + this.curSplice[1]!;
      return this.linesSlice(m, m + k).join('');
    };

    let removed: any = '';
    if (this.isCurLineInSplice()) {
      if (this.curCol === 0) {
        removed = this.curSplice[this.curSplice.length - 1];
        this.curSplice.length--;
        removed += nextKLinesText(L - 1);
        this.curSplice[1]! += L - 1;
      } else {
        removed = nextKLinesText(L - 1);
        this.curSplice[1]! += L - 1;
        const sline = this.curSplice.length - 1;
        // @ts-ignore
        removed = this.curSplice[sline]!.substring(this.curCol) + removed;
        // @ts-ignore
        this.curSplice[sline] = this.curSplice[sline]!.substring(0, this.curCol) +
          this.linesGet(this.curSplice[0] + this.curSplice[1]!);
        // @ts-ignore
        this.curSplice[1] += 1;
      }
    } else {
      removed = nextKLinesText(L);
      this.curSplice[1]! += L;
    }
    return removed;
  }

  /**
   * Remove text from lines array.
   *
   * @param {number} N - characters to delete
   * @param {number} L - lines to delete
   * @returns {string}
   */
  remove(N: number, L: number) {
    if (!N) return '';
    if (L) return this.removeLines(L);
    if (!this.inSplice) this.enterSplice();
    // although the line is put into splice, curLine is not increased, because
    // only some chars are removed not the whole line
    const sline = this.putCurLineInSplice();
    // @ts-ignore
    const removed = this.curSplice[sline].substring(this.curCol, this.curCol + N);
    // @ts-ignore
    this.curSplice[sline] = this.curSplice[sline]!.substring(0, this.curCol) +
      // @ts-ignore
      this.curSplice[sline].substring(this.curCol + N);
    return removed;
  }

  /**
   * Inserts text into lines array.
   *
   * @param {string} text - the text to insert
   * @param {number} L - number of newlines in text
   */
  insert(text: string, L: number) {
    if (!text) return;
    if (!this.inSplice) this.enterSplice();
    if (L) {
      const newLines = exports.splitTextLines(text);
      if (this.isCurLineInSplice()) {
        const sline = this.curSplice.length - 1;
        /** @type {string} */
        const theLine = this.curSplice[sline];
        const lineCol = this.curCol;
        // Insert the chars up to `curCol` and the first new line.
        // @ts-ignore
        this.curSplice[sline] = theLine.substring(0, lineCol) + newLines[0];
        this.curLine++;
        newLines.splice(0, 1);
        // insert the remaining new lines
        this.curSplice.push(...newLines);
        this.curLine += newLines.length;
        // insert the remaining chars from the "old" line (e.g. the line we were in
        // when we started to insert new lines)
        // @ts-ignore
        this.curSplice.push(theLine.substring(lineCol));
        this.curCol = 0; // TODO(doc) why is this not set to the length of last line?
      } else {
        this.curSplice.push(...newLines);
        this.curLine += newLines.length;
      }
    } else {
      // There are no additional lines. Although the line is put into splice, curLine is not
      // increased because there may be more chars in the line (newline is not reached).
      const sline = this.putCurLineInSplice();
      if (!this.curSplice[sline]) {
        const err = new Error(
          'curSplice[sline] not populated, actual curSplice contents is ' +
          `${JSON.stringify(this.curSplice)}. Possibly related to ` +
          'https://github.com/ether/etherpad-lite/issues/2802');
        console.error(err.stack || err.toString());
      }
      // @ts-ignore
      this.curSplice[sline] = this.curSplice[sline].substring(0, this.curCol) + text +
        // @ts-ignore
        this.curSplice[sline].substring(this.curCol);
      this.curCol += text.length;
    }
  }

  /**
   * Checks if curLine (the line we are in when curSplice is applied) is the last line in `lines`.
   *
   * @returns {boolean} indicates if there are lines left
   */
  hasMore(): boolean {
    let docLines = this.linesLength();
    if (this.inSplice) {
      docLines += this.curSplice.length - 2 - this.curSplice[1];
    }
    return this.curLine < docLines;
  }

  /**
   * Closes the splice
   */
  close() {
    if (this.inSplice) this.leaveSplice();
  }
}
