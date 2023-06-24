import * as Changeset from "./Changeset.js";
import * as attributes from "./attributes.js";
import * as hooks from "./pluginfw/hooks.js";
import AttributeManager from "./AttributeManager.js";
import { padutils as padutils$0 } from "./pad_utils.js";
'use strict';
const linestylefilter = {};
const padutils = { padutils: padutils$0 }.padutils;
linestylefilter.ATTRIB_CLASSES = {
    bold: 'tag:b',
    italic: 'tag:i',
    underline: 'tag:u',
    strikethrough: 'tag:s',
};
const lineAttributeMarker = 'lineAttribMarker';
linestylefilter.getAuthorClassName = (author) => `author-${author.replace(/[^a-y0-9]/g, (c) => {
    if (c === '.')
        return '-';
    return `z${c.charCodeAt(0)}z`;
})}`;
// lineLength is without newline; aline includes newline,
// but may be falsy if lineLength == 0
linestylefilter.getLineStyleFilter = (lineLength, aline, textAndClassFunc, apool) => {
    // Plugin Hook to add more Attrib Classes
    for (const attribClasses of hooks.callAll('aceAttribClasses', linestylefilter.ATTRIB_CLASSES)) {
        Object.assign(linestylefilter.ATTRIB_CLASSES, attribClasses);
    }
    if (lineLength === 0)
        return textAndClassFunc;
    const nextAfterAuthorColors = textAndClassFunc;
    const authorColorFunc = (() => {
        const lineEnd = lineLength;
        let curIndex = 0;
        let extraClasses;
        let leftInAuthor;
        const attribsToClasses = (attribs) => {
            let classes = '';
            let isLineAttribMarker = false;
            for (const [key, value] of attributes.attribsFromString(attribs, apool)) {
                if (!key || !value)
                    continue;
                if (!isLineAttribMarker && AttributeManager.lineAttributes.indexOf(key) >= 0) {
                    isLineAttribMarker = true;
                }
                if (key === 'author') {
                    classes += ` ${linestylefilter.getAuthorClassName(value)}`;
                }
                else if (key === 'list') {
                    classes += ` list:${value}`;
                }
                else if (key === 'start') {
                    // Needed to introduce the correct Ordered list item start number on import
                    classes += ` start:${value}`;
                }
                else if (linestylefilter.ATTRIB_CLASSES[key]) {
                    classes += ` ${linestylefilter.ATTRIB_CLASSES[key]}`;
                }
                else {
                    const results = hooks.callAll('aceAttribsToClasses', { linestylefilter, key, value });
                    classes += ` ${results.join(' ')}`;
                }
            }
            if (isLineAttribMarker)
                classes += ` ${lineAttributeMarker}`;
            return classes.substring(1);
        };
        const attrOps = Changeset.deserializeOps(aline);
        let attrOpsNext = attrOps.next();
        let nextOp, nextOpClasses;
        const goNextOp = () => {
            nextOp = attrOpsNext.done ? new Changeset.Op() : attrOpsNext.value;
            if (!attrOpsNext.done)
                attrOpsNext = attrOps.next();
            nextOpClasses = (nextOp.opcode && attribsToClasses(nextOp.attribs));
        };
        goNextOp();
        const nextClasses = () => {
            if (curIndex < lineEnd) {
                extraClasses = nextOpClasses;
                leftInAuthor = nextOp.chars;
                goNextOp();
                while (nextOp.opcode && nextOpClasses === extraClasses) {
                    leftInAuthor += nextOp.chars;
                    goNextOp();
                }
            }
        };
        nextClasses();
        return (txt, cls) => {
            const disableAuthColorForThisLine = hooks.callAll('disableAuthorColorsForThisLine', {
                linestylefilter,
                text: txt,
                class: cls,
            });
            const disableAuthors = (disableAuthColorForThisLine == null ||
                disableAuthColorForThisLine.length === 0) ? false : disableAuthColorForThisLine[0];
            while (txt.length > 0) {
                if (leftInAuthor <= 0 || disableAuthors) {
                    // prevent infinite loop if something funny's going on
                    return nextAfterAuthorColors(txt, cls);
                }
                let spanSize = txt.length;
                if (spanSize > leftInAuthor) {
                    spanSize = leftInAuthor;
                }
                const curTxt = txt.substring(0, spanSize);
                txt = txt.substring(spanSize);
                nextAfterAuthorColors(curTxt, (cls && `${cls} `) + extraClasses);
                curIndex += spanSize;
                leftInAuthor -= spanSize;
                if (leftInAuthor === 0) {
                    nextClasses();
                }
            }
        };
    })();
    return authorColorFunc;
};
linestylefilter.getAtSignSplitterFilter = (lineText, textAndClassFunc) => {
    const at = /@/g;
    at.lastIndex = 0;
    let splitPoints = null;
    let execResult;
    while ((execResult = at.exec(lineText))) {
        if (!splitPoints) {
            splitPoints = [];
        }
        splitPoints.push(execResult.index);
    }
    if (!splitPoints)
        return textAndClassFunc;
    return linestylefilter.textAndClassFuncSplitter(textAndClassFunc, splitPoints);
};
linestylefilter.getRegexpFilter = (regExp, tag) => (lineText, textAndClassFunc) => {
    regExp.lastIndex = 0;
    let regExpMatchs = null;
    let splitPoints = null;
    let execResult;
    while ((execResult = regExp.exec(lineText))) {
        if (!regExpMatchs) {
            regExpMatchs = [];
            splitPoints = [];
        }
        const startIndex = execResult.index;
        const regExpMatch = execResult[0];
        regExpMatchs.push([startIndex, regExpMatch]);
        splitPoints.push(startIndex, startIndex + regExpMatch.length);
    }
    if (!regExpMatchs)
        return textAndClassFunc;
    const regExpMatchForIndex = (idx) => {
        for (let k = 0; k < regExpMatchs.length; k++) {
            const u = regExpMatchs[k];
            if (idx >= u[0] && idx < u[0] + u[1].length) {
                return u[1];
            }
        }
        return false;
    };
    const handleRegExpMatchsAfterSplit = (() => {
        let curIndex = 0;
        return (txt, cls) => {
            const txtlen = txt.length;
            let newCls = cls;
            const regExpMatch = regExpMatchForIndex(curIndex);
            if (regExpMatch) {
                newCls += ` ${tag}:${regExpMatch}`;
            }
            textAndClassFunc(txt, newCls);
            curIndex += txtlen;
        };
    })();
    return linestylefilter.textAndClassFuncSplitter(handleRegExpMatchsAfterSplit, splitPoints);
};
linestylefilter.getURLFilter = linestylefilter.getRegexpFilter(padutils.urlRegex, 'url');
linestylefilter.textAndClassFuncSplitter = (func, splitPointsOpt) => {
    let nextPointIndex = 0;
    let idx = 0;
    // don't split at 0
    while (splitPointsOpt &&
        nextPointIndex < splitPointsOpt.length &&
        splitPointsOpt[nextPointIndex] === 0) {
        nextPointIndex++;
    }
    const spanHandler = (txt, cls) => {
        if ((!splitPointsOpt) || nextPointIndex >= splitPointsOpt.length) {
            func(txt, cls);
            idx += txt.length;
        }
        else {
            const splitPoints = splitPointsOpt;
            const pointLocInSpan = splitPoints[nextPointIndex] - idx;
            const txtlen = txt.length;
            if (pointLocInSpan >= txtlen) {
                func(txt, cls);
                idx += txt.length;
                if (pointLocInSpan === txtlen) {
                    nextPointIndex++;
                }
            }
            else {
                if (pointLocInSpan > 0) {
                    func(txt.substring(0, pointLocInSpan), cls);
                    idx += pointLocInSpan;
                }
                nextPointIndex++;
                // recurse
                spanHandler(txt.substring(pointLocInSpan), cls);
            }
        }
    };
    return spanHandler;
};
linestylefilter.getFilterStack = (lineText, textAndClassFunc, abrowser) => {
    let func = linestylefilter.getURLFilter(lineText, textAndClassFunc);
    const hookFilters = hooks.callAll('aceGetFilterStack', {
        linestylefilter,
        browser: abrowser,
    });
    hookFilters.map((hookFilter) => {
        func = hookFilter(lineText, func);
    });
    return func;
};
// domLineObj is like that returned by domline.createDomLine
linestylefilter.populateDomLine = (textLine, aline, apool, domLineObj) => {
    // remove final newline from text if any
    let text = textLine;
    if (text.slice(-1) === '\n') {
        text = text.substring(0, text.length - 1);
    }
    const textAndClassFunc = (tokenText, tokenClass) => {
        domLineObj.appendSpan(tokenText, tokenClass);
    };
    let func = linestylefilter.getFilterStack(text, textAndClassFunc);
    func = linestylefilter.getLineStyleFilter(text.length, aline, func, apool);
    func(text, '');
};
export { lineAttributeMarker };
export { linestylefilter };
