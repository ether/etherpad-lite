import AttributePool from "../../static/js/AttributePool";
import { Attribute } from "../../static/js/types/Attribute";
import {StringAssembler} from "../../static/js/StringAssembler";
import {SmartOpAssembler} from "../../static/js/SmartOpAssembler";
import Op from "../../static/js/Op";
import {numToString} from "../../static/js/ChangesetUtils";
import {checkRep, pack} from "../../static/js/Changeset";

export const poolOrArray = (attribs: any) => {
  if (attribs.getAttrib) {
    return attribs; // it's already an attrib pool
  } else {
    // assume it's an array of attrib strings to be split and added
    const p = new AttributePool();
    attribs.forEach((kv: { split: (arg0: string) => Attribute; }) => {
      p.putAttrib(kv.split(','));
    });
    return p;
  }
};
const randInt = (maxValue: number) => Math.floor(Math.random() * maxValue);
const randomInlineString = (len: number) => {
  const assem = new StringAssembler();
  for (let i = 0; i < len; i++) {
    assem.append(String.fromCharCode(randInt(26) + 97));
  }
  return assem.toString();
};
export const randomMultiline = (approxMaxLines: number, approxMaxCols: number) => {
  const numParts = randInt(approxMaxLines * 2) + 1;
  const txt = new StringAssembler();
  txt.append(randInt(2) ? '\n' : '');
  for (let i = 0; i < numParts; i++) {
    if ((i % 2) === 0) {
      if (randInt(10)) {
        txt.append(randomInlineString(randInt(approxMaxCols) + 1));
      } else {
        txt.append('\n');
      }
    } else {
      txt.append('\n');
    }
  }
  return txt.toString();
};

const randomTwoPropAttribs = (opcode: "" | "=" | "+" | "-") => {
  // assumes attrib pool like ['apple,','apple,true','banana,','banana,true']
  if (opcode === '-' || randInt(3)) {
    return '';
  } else if (randInt(3)) { // eslint-disable-line no-dupe-else-if
    if (opcode === '+' || randInt(2)) {
      return `*${numToString(randInt(2) * 2 + 1)}`;
    } else {
      return `*${numToString(randInt(2) * 2)}`;
    }
  } else if (opcode === '+' || randInt(4) === 0) {
    return '*1*3';
  } else {
    return ['*0*2', '*0*3', '*1*2'][randInt(3)];
  }
};


const randomStringOperation = (numCharsLeft: number) => {
  let result;
  switch (randInt(11)) {
    case 0:
    {
      // insert char
      result = {
        insert: randomInlineString(1),
      };
      break;
    }
    case 1:
    {
      // delete char
      result = {
        remove: 1,
      };
      break;
    }
    case 2:
    {
      // skip char
      result = {
        skip: 1,
      };
      break;
    }
    case 3:
    {
      // insert small
      result = {
        insert: randomInlineString(randInt(4) + 1),
      };
      break;
    }
    case 4:
    {
      // delete small
      result = {
        remove: randInt(4) + 1,
      };
      break;
    }
    case 5:
    {
      // skip small
      result = {
        skip: randInt(4) + 1,
      };
      break;
    }
    case 6:
    {
      // insert multiline;
      result = {
        insert: randomMultiline(5, 20),
      };
      break;
    }
    case 7:
    {
      // delete multiline
      result = {
        remove: Math.round(numCharsLeft * Math.random() * Math.random()),
      };
      break;
    }
    case 8:
    {
      // skip multiline
      result = {
        skip: Math.round(numCharsLeft * Math.random() * Math.random()),
      };
      break;
    }
    case 9:
    {
      // delete to end
      result = {
        remove: numCharsLeft,
      };
      break;
    }
    case 10:
    {
      // skip to end
      result = {
        skip: numCharsLeft,
      };
      break;
    }
  }
  const maxOrig = numCharsLeft - 1;
  if ('remove' in result!) {
    result.remove = Math.min(result.remove, maxOrig);
  } else if ('skip' in result!) {
    result.skip = Math.min(result.skip, maxOrig);
  }
  return result;
};

export const randomTestChangeset = (origText: string, withAttribs?: any) => {
  const charBank = new StringAssembler();
  let textLeft = origText; // always keep final newline
  const outTextAssem = new StringAssembler();
  const opAssem = new SmartOpAssembler();
  const oldLen = origText.length;

  const nextOp = new Op();

  const appendMultilineOp = (opcode: "" | "=" | "+" | "-", txt: string) => {
    nextOp.opcode = opcode;
    if (withAttribs) {
      nextOp.attribs = randomTwoPropAttribs(opcode);
    }
    txt.replace(/\n|[^\n]+/g, (t) => {
      if (t === '\n') {
        nextOp.chars = 1;
        nextOp.lines = 1;
        opAssem.append(nextOp);
      } else {
        nextOp.chars = t.length;
        nextOp.lines = 0;
        opAssem.append(nextOp);
      }
      return '';
    });
  };

  const doOp = () => {
    const o = randomStringOperation(textLeft.length);
    if (o!.insert) {
      const txt = o!.insert;
      charBank.append(txt);
      outTextAssem.append(txt);
      appendMultilineOp('+', txt);
    } else if (o!.skip) {
      const txt = textLeft.substring(0, o!.skip);
      textLeft = textLeft.substring(o!.skip);
      outTextAssem.append(txt);
      appendMultilineOp('=', txt);
    } else if (o!.remove) {
      const txt = textLeft.substring(0, o!.remove);
      textLeft = textLeft.substring(o!.remove);
      appendMultilineOp('-', txt);
    }
  };

  while (textLeft.length > 1) doOp();
  for (let i = 0; i < 5; i++) doOp(); // do some more (only insertions will happen)
  const outText = `${outTextAssem.toString()}\n`;
  opAssem.endDocument();
  const cs = pack(oldLen, outText.length, opAssem.toString(), charBank.toString());
  checkRep(cs);
  return [cs, outText];
};
