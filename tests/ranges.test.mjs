import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { beforeEach, test } from 'node:test';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { assembleRanges } = require('../out/services/tokenizer/ranges.js');
const config = { color: '#112233' };

beforeEach(() => vscode.reset());

function candidate(start, end, rangeKey = 'hover', style = config) {
  return { type: 'class', content: 'hover:flex', start, end, rangeKey, config: style };
}

/** Supply themed candidates independently of document scanning and class eligibility. */
function assemble(candidates, source = ' '.repeat(100)) {
  const editor = vscode.createEditor(source);
  const output = assembleRanges(editor.document, candidates);
  return {
    output,
    offsets: [...output].map(([key, entry]) => [
      key,
      entry.ranges.map((range) => [editor.document.offsetAt(range.start), editor.document.offsetAt(range.end)]),
    ]),
  };
}

for (const [name, intervals, expected] of [
  [
    'duplicates',
    [
      [2, 6],
      [2, 6],
    ],
    [[2, 6]],
  ],
  [
    'nested intervals',
    [
      [2, 12],
      [4, 6],
    ],
    [[2, 12]],
  ],
  [
    'containing intervals',
    [
      [4, 6],
      [2, 12],
    ],
    [[4, 6]],
  ],
  [
    'partial overlaps',
    [
      [2, 6],
      [4, 8],
      [0, 4],
    ],
    [[2, 6]],
  ],
  [
    'touching boundaries',
    [
      [2, 6],
      [6, 9],
      [0, 2],
    ],
    [[2, 6]],
  ],
  [
    'disjoint intervals',
    [
      [2, 6],
      [7, 9],
    ],
    [
      [2, 6],
      [7, 9],
    ],
  ],
  [
    'empty intervals',
    [
      [4, 4],
      [4, 4],
      [2, 4],
      [4, 6],
      [7, 7],
    ],
    [
      [4, 4],
      [7, 7],
    ],
  ],
  [
    'reversed intervals',
    [
      [9, 3],
      [2, 5],
      [10, 12],
    ],
    [
      [3, 9],
      [10, 12],
    ],
  ],
  [
    'out-of-order intervals',
    [
      [20, 24],
      [2, 6],
      [10, 14],
      [5, 11],
    ],
    [
      [20, 24],
      [2, 6],
      [10, 14],
    ],
  ],
]) {
  test(`range assembly preserves priority for ${name}`, () => {
    assert.deepEqual(assemble(intervals.map(([start, end]) => candidate(start, end))).offsets, [['hover', expected]]);
  });
}

test('range keys have independent overlap detection and insertion order', () => {
  const { offsets } = assemble([
    candidate(12, 20, 'focus'),
    candidate(12, 20, 'hover'),
    candidate(2, 6, 'focus'),
    candidate(18, 24, 'hover'),
    candidate(2, 6, '__proto__'),
  ]);
  assert.deepEqual(offsets, [
    [
      'focus',
      [
        [12, 20],
        [2, 6],
      ],
    ],
    ['hover', [[12, 20]]],
    ['__proto__', [[2, 6]]],
  ]);
});

test('each range key keeps its first eligible configuration', () => {
  const first = { color: '#abcdef' };
  const second = { color: '#fedcba' };
  const { output, offsets } = assemble([
    { ...candidate(0, 4), config: undefined },
    candidate(2, 6, 'hover', first),
    candidate(8, 12, 'hover', second),
    candidate(2, 6, 'focus', second),
    candidate(20, 24, ''),
    { ...candidate(30, 34), rangeKey: undefined },
  ]);
  assert.equal(output.get('hover').config, first);
  assert.equal(output.get('focus').config, second);
  assert.deepEqual(offsets, [
    [
      'hover',
      [
        [2, 6],
        [8, 12],
      ],
    ],
    ['focus', [[2, 6]]],
  ]);
});

test('overlap decisions use normalized UTF-16 document positions', () => {
  const { offsets } = assemble(
    [
      candidate(3, 3),
      candidate(2, 2),
      candidate(4, 6),
      candidate(5, 7),
      candidate(11, 9),
      candidate(100, 200),
      candidate(12, 14),
      candidate(-4, -1),
    ],
    '😀\r\nabcd\r\nxyz'
  );
  assert.deepEqual(offsets, [
    [
      'hover',
      [
        [2, 2],
        [4, 6],
        [8, 11],
        [13, 13],
        [0, 0],
      ],
    ],
  ]);
});

test('range assembly agrees with first-accepted interval selection across candidate orders', () => {
  let state = 0x62135;
  const random = (max) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % max;
  };
  for (let scenario = 0; scenario < 100; scenario++) {
    const candidates = Array.from({ length: 80 }, () =>
      candidate(random(100), random(100), ['hover', 'focus'][random(2)])
    );
    const expected = new Map();
    for (const { start, end, rangeKey } of candidates) {
      const interval = [Math.min(start, end), Math.max(start, end)];
      if (!expected.has(rangeKey)) expected.set(rangeKey, []);
      const accepted = expected.get(rangeKey);
      if (!accepted.some(([left, right]) => interval[0] <= right && interval[1] >= left)) accepted.push(interval);
    }
    assert.deepEqual(assemble(candidates).offsets, [...expected], `Candidate order ${scenario}`);
  }
});

test('range assembly handles ordered and shuffled candidates without pairwise API intersections', () => {
  const ascending = Array.from({ length: 12000 }, (_, index) => index);
  const descending = [...ascending].reverse();
  const shuffled = [...ascending];
  let state = 0x94321;
  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const original = vscode.Range.prototype.intersection;
  vscode.Range.prototype.intersection = () => {
    throw new Error('Range assembly must use its interval index instead of pairwise Range.intersection calls');
  };
  try {
    for (const order of [ascending, descending, shuffled]) {
      const candidates = order.map((index) => candidate(index * 4 + 1, index * 4 + 2));
      candidates.push(...ascending.map((index) => candidate(index * 4, index * 4 + 3)));
      assert.deepEqual(assemble(candidates, ' '.repeat(48000)).offsets, [
        ['hover', order.map((index) => [index * 4 + 1, index * 4 + 2])],
      ]);
    }
  } finally {
    vscode.Range.prototype.intersection = original;
  }
});
