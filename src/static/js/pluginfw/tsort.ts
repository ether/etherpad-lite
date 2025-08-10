/**
 * general topological sort
 * from https://gist.github.com/1232505
 * @author SHIN Suzuki (shinout310@gmail.com)
 *
 * @returns Array : topological sorted list of IDs
 * @param edges
 **/
import {MapArrayType} from "../../../node/types/MapType";

class Node<T extends string | number | symbol> {
  id: T;
  afters: T[];
  constructor(id: T) {
    this.id = id;
    this.afters = [];
  }
}

const tsort = <T extends string | number | symbol>(edges: Array<[T, T]>) => {
  const nodes: Record<string, Node<T>> = {}; // hash: stringified id of the node => { id: id, afters: lisf of ids }
  const sorted: string[] = []; // sorted list of IDs ( returned value )
  const visited: MapArrayType<string> = {}; // hash: id of already visited node => true


  // 1. build data structures
  edges.forEach((v) => {
    const from = v[0]; const
      to = v[1];
    if (!nodes[from.toString()]) nodes[from.toString()] = new Node(from);
    if (!nodes[to.toString()]) nodes[to.toString()] = new Node(to);
    nodes[from.toString()].afters.push(to);
  });

  const visit = (idstr: string, ancestors: string[]| null) => {
    const node = nodes[idstr];
    const id = node.id;

    // if already exists, do nothing
    if (visited[idstr]) return;

    if (!Array.isArray(ancestors)) ancestors = [];

    ancestors.push(id.toString());

    // @ts-ignore
    visited[idstr] = true;

    node.afters.forEach((afterID) => {
      // if already in ancestors, a closed chain exists.
      if (ancestors.indexOf(afterID.toString()) >= 0) throw new Error(`closed chain : ${afterID.toString()} is in ${id.toString()}`);

      visit(afterID.toString(), ancestors.map((v) => v)); // recursive call
    });

    // @ts-ignore
    sorted.unshift(id);
  };

  // 2. topological sort
  // @ts-ignore
  Object.keys(nodes).forEach(visit);

  return sorted;
};

export default tsort
