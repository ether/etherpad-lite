'use strict';
export const buildRemoveRange = (rep, builder, start, end) => {
    const startLineOffset = rep.lines.offsetOfIndex(start[0]);
    const endLineOffset = rep.lines.offsetOfIndex(end[0]);
    if (end[0] > start[0]) {
        builder.remove(endLineOffset - startLineOffset - start[1], end[0] - start[0]);
        builder.remove(end[1]);
    }
    else {
        builder.remove(end[1] - start[1]);
    }
};
export const buildKeepRange = (rep, builder, start, end, attribs?, pool?) => {
    const startLineOffset = rep.lines.offsetOfIndex(start[0]);
    const endLineOffset = rep.lines.offsetOfIndex(end[0]);
    if (end[0] > start[0]) {
        builder.keep(endLineOffset - startLineOffset - start[1], end[0] - start[0], attribs, pool);
        builder.keep(end[1], 0, attribs, pool);
    }
    else {
        builder.keep(end[1] - start[1], 0, attribs, pool);
    }
};
export const buildKeepToStartOfRange = (rep, builder, start) => {
    const startLineOffset = rep.lines.offsetOfIndex(start[0]);
    builder.keep(startLineOffset, start[0]);
    builder.keep(start[1]);
};
