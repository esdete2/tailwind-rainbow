/** Protect grouped/quoted delimiters while walking source UTF-16 code units. */
export class GroupState {
  private closers: string[] = [];
  private quote = '';
  private escaped = false;
  invalid = false;

  reset(): void {
    this.closers.length = 0;
    this.quote = '';
    this.escaped = false;
    this.invalid = false;
  }

  advance(char: string): boolean {
    if (this.escaped) {
      this.escaped = false;
      return true;
    }
    if (char === '\\') {
      this.escaped = true;
      return true;
    }
    if (this.quote) {
      if (char === this.quote) this.quote = '';
      return true;
    }
    if (this.closers.length && (char === '"' || char === "'")) {
      this.quote = char;
      return true;
    }
    if (char === '[' || char === '(') {
      this.closers.push(char === '[' ? ']' : ')');
      return true;
    }
    if (char === ']' || char === ')') {
      if (this.closers.pop() !== char) this.invalid = true;
      return true;
    }
    return this.closers.length > 0;
  }
}

interface ClassPart {
  start: number;
  end: number;
}

export interface ClassSyntax {
  parts: ClassPart[];
  marker?: number;
}

/** Split top-level variants and locate a single important modifier without rewriting source offsets. */
export function readClassSyntax(content: string): ClassSyntax | undefined {
  const groups = /[()[\]\\]/.test(content) ? new GroupState() : undefined;
  const parts: ClassPart[] = [];
  let start = 0;
  let marker: number | undefined;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (groups?.advance(char)) continue;
    if (char === ':') {
      parts.push({ start, end: i });
      start = i + 1;
    } else if (char === '!') {
      if (marker !== undefined) return undefined;
      marker = i;
    }
  }
  if (groups?.invalid || start === content.length || parts[0]?.end === 0) return undefined;
  parts.push({ start, end: content.length });
  if (marker === 0 && parts.length > 1 && parts[0].end === 1) return undefined;
  // A leading marker before variants is accepted as an extension compatibility form.
  if (marker !== undefined && marker !== 0 && marker !== start && marker !== content.length - 1) return undefined;
  return { parts, marker };
}
