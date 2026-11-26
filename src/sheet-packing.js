function blockIn(space, length, width, quantity) {
  const columns = Math.min(quantity, Math.floor(space.length / length + 1e-9));
  if (!columns) return null;
  const rows = Math.min(Math.floor(quantity / columns), Math.floor(space.width / width + 1e-9));
  if (!rows) return null;
  return { length: columns * length, width: rows * width, count: columns * rows };
}

function placeBlock(spaces, piece, quantity) {
  let best = null;
  for (const [index, space] of spaces.entries()) {
    for (const block of [
      blockIn(space, piece.length, piece.width, quantity),
      blockIn(space, piece.width, piece.length, quantity),
    ]) {
      if (!block) continue;
      const unusedArea = space.length * space.width - block.length * block.width;
      if (!best || block.count > best.block.count || (block.count === best.block.count && unusedArea < best.unusedArea)) {
        best = { index, block, unusedArea };
      }
    }
  }
  if (!best) return 0;

  const [space] = spaces.splice(best.index, 1);
  const { block } = best;
  const lengthLeft = space.length - block.length;
  const widthLeft = space.width - block.width;
  // Split into disjoint rectangles, keeping the larger strip available.
  if (lengthLeft * space.width >= widthLeft * space.length) {
    if (lengthLeft > 0) spaces.push({ length: lengthLeft, width: space.width });
    if (widthLeft > 0) spaces.push({ length: block.length, width: widthLeft });
  } else {
    if (lengthLeft > 0) spaces.push({ length: lengthLeft, width: block.width });
    if (widthLeft > 0) spaces.push({ length: space.length, width: widthLeft });
  }
  return block.count;
}

export function estimateSheets(length, width, pieces) {
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0 || !pieces.length) {
    return { sheets: null };
  }
  for (const piece of pieces) {
    if (!Number.isFinite(piece.length) || !Number.isFinite(piece.width) || piece.length <= 0 || piece.width <= 0
        || !Number.isSafeInteger(piece.quantity) || piece.quantity < 1) {
      return { sheets: null, issue: 'incomplete', box: piece.name };
    }
    if (!blockIn({ length, width }, piece.length, piece.width, 1)
        && !blockIn({ length, width }, piece.width, piece.length, 1)) {
      return { sheets: null, issue: 'oversize', box: piece.name };
    }
  }

  const remaining = pieces.map((piece) => ({ ...piece })).sort((a, b) =>
    Math.max(b.length, b.width) - Math.max(a.length, a.width) || b.length * b.width - a.length * a.width);
  let sheets = 0;
  while (remaining.some((piece) => piece.quantity > 0)) {
    const spaces = [{ length, width }];
    const used = remaining.map((piece) => {
      let total = 0;
      while (total < piece.quantity) {
        const count = placeBlock(spaces, piece, piece.quantity - total);
        if (!count) break;
        total += count;
      }
      return total;
    });
    // Repeat an identical cutting layout in one step for large batches.
    const repeat = used.reduce((limit, count, index) =>
      count ? Math.min(limit, Math.floor(remaining[index].quantity / count)) : limit, Infinity);
    sheets += repeat;
    if (!Number.isSafeInteger(sheets)) return { sheets: null, issue: 'too-many' };
    remaining.forEach((piece, index) => {
      piece.quantity -= used[index] * repeat;
    });
  }
  return { sheets };
}
