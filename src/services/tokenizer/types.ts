/**
 * Offsets count UTF-16 code units. Comments include their delimiters; quoted spans exclude them.
 * An incomplete quoted span reserves a closing-delimiter position and can have end before start.
 */
export interface Token {
  type: 'string' | 'template' | 'comment' | 'other';
  content: string;
  start: number;
  end: number;
  quote?: string;
}

/** A themed class fragment with document-relative UTF-16 offsets. */
export interface ClassToken {
  type: 'prefix' | 'class' | 'important';
  content: string;
  start: number;
  end: number;
  themeKey?: string;
  /** Decoration grouping can differ from the normalized theme lookup key. */
  rangeKey?: string;
  config?: ClassConfig;
}
