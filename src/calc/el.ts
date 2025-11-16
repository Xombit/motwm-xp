/** EL engine: combine same-CR (+2 per doubling), mixed-EL pairwise */
export function groupToEL(cr: number, count: number): number {
  if (count <= 0) return -Infinity;
  let el = cr;
  let k = count;
  while (k >= 2) {
    el += 2;
    k = Math.floor(k / 2);
  }
  return el;
}

export function combineELs(els: number[]): number {
  if (!els.length) return -Infinity;
  let arr = els.slice().sort((a,b)=>a-b);
  while (arr.length > 1) {
    const a = arr.pop()!; // largest
    const b = arr.pop()!; // second largest
    const diff = Math.abs(a-b);
    let combined = a;
    
    // DMG 3.5e rules (p. 49):
    // - Same EL (diff 0): +2
    // - 1-2 below: +1
    // - 3-7 below: +1 (weaker but still contributes)
    // - 8+ below: +0 (too weak to matter)
    if (diff === 0) combined = a + 2;
    else if (diff >= 1 && diff <= 7) combined = a + 1;
    else combined = a; // diff 8+: too weak to matter
    
    arr.push(combined);
    arr.sort((x,y)=>x-y);
  }
  return arr[0];
}
