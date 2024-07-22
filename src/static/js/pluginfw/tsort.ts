'use strict';

import {MapArrayType} from "../../../node/types/MapType";

/**
 * general topological sort
 * from https://gist.github.com/1232505
 * @author SHIN Suzuki (shinout310@gmail.com)
 * @param Array<Array> edges : list of edges. each edge forms Array<ID,ID> e.g. [12 , 3]
 *
 * @returns Array : topological sorted list of IDs
 **/

export class TSort {
  private nodes: MapArrayType<Node> = {}; // hash: stringified id of the node => { id: id, afters: lisf of ids }
  private sorted: (number|string)[] = []; // sorted list of IDs ( returned value )
  private visited: MapArrayType<boolean> = {}; // hash: id of already visited node => true

  constructor(edges: (number|string)[][]) {
    // 1. build data structures
    edges.forEach((v) => {
      const from = v[0]; const
        to = v[1];
      if (!this.nodes[from]) {
        this.nodes[from] = new Node(from);
      }
      if (!this.nodes[to]) {
        this.nodes[to] = new Node(to);
      }
      this.nodes[from].afters.push(to);
    });

    // 2. topological sort
    for (const key in this.nodes) {
      this.visit(key, []);
    }
  }

  visit = (idstr: string, ancestors:(number|string)[]) => {
    const node = this.nodes[idstr];
    const id = node.id;

    // if already exists, do nothing
    if (this.visited[idstr]) return;

    if (!Array.isArray(ancestors)) ancestors = [];

    ancestors.push(id);

    this.visited[idstr] = true;

    node.afters.forEach((afterID) => {
      // if already in ancestors, a closed chain exists.
      if (ancestors.indexOf(afterID) >= 0) throw new Error(`closed chain : ${afterID} is in ${id}`);

      this.visit(afterID.toString(), ancestors.map((v) => v)); // recursive call
    });

    this.sorted.unshift(id);
  }

  getSorted = ()=>{
    return this.sorted
  }
}

class Node {
  id: number|string
  afters: (number|string)[]
  constructor(id: number|string) {
    this.id = id
    this.afters = []
  }
}
