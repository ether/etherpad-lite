exports.assert = function (code, optMsg) {
    if (!eval(code)) throw new Error("FALSE: " + (optMsg || code));
};

exports.literal = function (v) {
    if ((typeof v) == "string") {
      return '"' + v.replace(/[\\\"]/g, '\\$1').replace(/\n/g, '\\n') + '"';
    } else
    return JSON.stringify(v);
}

exports.assertEqualArrays = function (a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

exports.assertEqualStrings = function (a, b) {
    return a === b
}

exports.throughIterator = function (opsStr) {
    var iter = Changeset.opIterator(opsStr);
    var assem = Changeset.opAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    return assem.toString();
}

exports.throughSmartAssembler =  function (opsStr) {
    var iter = Changeset.opIterator(opsStr);
    var assem = Changeset.smartOpAssembler();
    while (iter.hasNext()) {
      assem.append(iter.next());
    }
    assem.endDocument();
    return assem.toString();
}
