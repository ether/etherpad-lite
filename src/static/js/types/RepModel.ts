import AttributePool from "../AttributePool";
import {RangePos} from "./RangePos";

export type RepModel = {
  lines: {
    atIndex: (num: number)=>RepNode,
    offsetOfIndex: (range: number)=>number,
    search: (filter: (e: RepNode)=>boolean)=>number,
    length: ()=>number,
    totalWidth: ()=>number
  }
  selStart: RangePos,
  selEnd: RangePos,
  selFocusAtStart: boolean,
  apool: AttributePool,
  alines: {
    [key:string]: any
  }
}

export type Position = {
  bottom: number,
  height: number,
  top: number
}

export type RepNode = {
  firstChild: RepNode,
  lineNode: RepNode
  length: number,
  lastChild: RepNode,
  offsetHeight: number,
  offsetTop: number,
  text: string
}

export type WindowElementWithScrolling = HTMLIFrameElement & {
  pageYOffset: number|string,
  pageXOffset: number
}
