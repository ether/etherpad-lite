import {describe, it} from 'vitest'
import {TSort} from "../../../static/js/pluginfw/tsort";
import {expect} from "@playwright/test";


describe('tsort', () => {
  it('should work', () => {
    let edges: (number|string)[][] = [
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 4],
    ];

    let sorted = new TSort(edges).getSorted();
    expect(sorted).toEqual([1, 3, 2, 4]);



    // example 3: generate random edges
    const max = 100;
    const iteration = 30;
    const randomInt = (max: number) => Math.floor(Math.random() * max) + 1;
    edges = (() => {
      const ret = [];
      let i = 0;
      while (i++ < iteration) ret.push([randomInt(max), randomInt(max)]);
      return ret;
    })();
    try {
      sorted = new TSort(edges).getSorted();
      console.log('succeeded', sorted);
    } catch (e) {
      // @ts-ignore
      console.log('failed', e.message);
    }
  })

  it('fails with closed chain', ()=> {
    // example 2: failure ( A > B > C > A )
    let edges = [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
    ];

    expect(() => new TSort(edges)).toThrowError('closed chain : A is in C');
  })

  it('fails with closed chain 2', ()=> {
    // example 1: failure ( 1 > 2 > 3 > 1 )
    let edges = [
      [1, 2],
      [2, 3],
      [3, 1],
    ];

    expect(() => new TSort(edges)).toThrowError('closed chain : 1 is in 3');
  })

  it('works with 6 nodes', ()=> {
    let edges = [
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 4],
      [4, 5],
      [4, 6],
    ];

    let sorted = new TSort(edges).getSorted();
    expect(sorted).toEqual([1, 3, 2, 4, 6, 5]);
  })
})
