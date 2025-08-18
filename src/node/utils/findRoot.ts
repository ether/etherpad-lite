import path from 'node:path'
import fs from 'fs'

function defaultCheck (dir: string) {
  return fs.existsSync(path.join(dir, 'package.json'))
}

function findRoot (start: string|string[], check?: (dir: string)=>{}) {
  start = start || module.parent!.filename
  check = check || defaultCheck

  if (typeof start === 'string') {
    if (start[start.length - 1] !== path.sep) {
      start += path.sep
    }
    start = start.split(path.sep)
  }
  if (!start.length) {
    throw new Error('package.json not found in path')
  }
  start.pop()
  const dir = start.join(path.sep);
  try {
    if (check(dir)) {
      return dir
    }
  } catch (e) {}
  return findRoot(start, check)
}


export default findRoot
