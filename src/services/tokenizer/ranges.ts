import * as vscode from 'vscode';

import type { ClassToken } from './types';

type RangeCandidate = Pick<ClassToken, 'start' | 'end' | 'rangeKey' | 'config'>;

interface RangeEntry {
  ranges: vscode.Range[];
  config: ClassConfig;
}

interface IntervalNode {
  start: number;
  end: number;
  height: number;
  left?: IntervalNode;
  right?: IntervalNode;
}

interface RangeGroup extends RangeEntry {
  root?: IntervalNode;
}

function height(node?: IntervalNode): number {
  return node?.height ?? 0;
}

function updateHeight(node: IntervalNode): void {
  node.height = Math.max(height(node.left), height(node.right)) + 1;
}

function rotateLeft(node: IntervalNode): IntervalNode {
  const root = node.right!;
  node.right = root.left;
  root.left = node;
  updateHeight(node);
  updateHeight(root);
  return root;
}

function rotateRight(node: IntervalNode): IntervalNode {
  const root = node.left!;
  node.left = root.right;
  root.right = node;
  updateHeight(node);
  updateHeight(root);
  return root;
}

function balance(node: IntervalNode): IntervalNode {
  updateHeight(node);
  const difference = height(node.left) - height(node.right);
  if (difference > 1) {
    if (height(node.left!.left) < height(node.left!.right)) node.left = rotateLeft(node.left!);
    return rotateRight(node);
  }
  if (difference < -1) {
    if (height(node.right!.right) < height(node.right!.left)) node.right = rotateRight(node.right!);
    return rotateLeft(node);
  }
  return node;
}

/** Accepted intervals are disjoint; AVL balancing bounds lookup depth for any input order. */
function insert(node: IntervalNode | undefined, start: number, end: number): IntervalNode {
  if (!node) return { start, end, height: 1 };
  if (start < node.start) node.left = insert(node.left, start, end);
  else node.right = insert(node.right, start, end);
  return balance(node);
}

function overlaps(node: IntervalNode | undefined, start: number, end: number): boolean {
  while (node) {
    // VS Code treats a shared endpoint as an intersection, including empty ranges.
    if (end < node.start) node = node.left;
    else if (start > node.end) node = node.right;
    else return true;
  }
  return false;
}

/**
 * Consume candidates in input order: the first accepted interval wins within each key.
 * Keys and ranges retain their insertion order, with the first eligible configuration per key.
 */
export function assembleRanges(
  document: vscode.TextDocument,
  candidates: readonly RangeCandidate[]
): Map<string, RangeEntry> {
  const groups = new Map<string, RangeGroup>();

  for (const candidate of candidates) {
    if (!candidate.rangeKey || !candidate.config) continue;
    let group = groups.get(candidate.rangeKey);
    if (!group) {
      group = { ranges: [], config: candidate.config };
      groups.set(candidate.rangeKey, group);
    }

    const startPosition = document.positionAt(candidate.start);
    const endPosition = document.positionAt(candidate.end);
    // Round-trip UTF-16 offsets through document positions to clamp bounds and CRLF terminators.
    const startOffset = document.offsetAt(startPosition);
    const endOffset = document.offsetAt(endPosition);
    const start = Math.min(startOffset, endOffset);
    const end = Math.max(startOffset, endOffset);
    if (overlaps(group.root, start, end)) continue;

    group.root = insert(group.root, start, end);
    group.ranges.push(new vscode.Range(startPosition, endPosition));
  }

  return new Map([...groups].map(([key, { ranges, config }]) => [key, { ranges, config }]));
}
