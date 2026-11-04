const fs = require('node:fs');
const path = require('node:path');

const properties = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')).contributes
  .configuration.properties;
const defaults = Object.fromEntries(
  Object.entries(properties).map(([key, schema]) => [key.replace('tailwindRainbow.', ''), schema.default])
);
let settings = structuredClone(defaults);
const configurationListeners = new Set();
const editorListeners = new Set();
const documentListeners = new Set();
const commands = new Map();

function subscribe(listeners, listener) {
  listeners.add(listener);
  return { dispose: () => listeners.delete(listener) };
}

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
  compareTo(other) {
    return this.line - other.line || this.character - other.character;
  }
  isBefore(other) {
    return this.compareTo(other) < 0;
  }
  isEqual(other) {
    return this.compareTo(other) === 0;
  }
}

class Range {
  constructor(start, end) {
    [this.start, this.end] = start.compareTo(end) <= 0 ? [start, end] : [end, start];
  }
  intersection(other) {
    const start = this.start.compareTo(other.start) > 0 ? this.start : other.start;
    const end = this.end.compareTo(other.end) < 0 ? this.end : other.end;
    return start.compareTo(end) <= 0 ? new Range(start, end) : undefined;
  }
}

/** Document offsets and positions follow VS Code's UTF-16 and CRLF clamping contract. */
function createEditor(text, languageId = 'html', isUntitled = false) {
  const lineStarts = [0];
  const lineEnds = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\r' || text[i] === '\n') {
      lineEnds.push(i);
      if (text[i] === '\r' && text[i + 1] === '\n') i++;
      lineStarts.push(i + 1);
    }
  }
  lineEnds.push(text.length);
  const document = {
    languageId,
    isUntitled,
    uri: { scheme: isUntitled ? 'untitled' : 'file' },
    positionAt(offset) {
      offset = Math.max(0, Math.min(text.length, offset));
      let low = 0;
      let high = lineStarts.length;
      while (low + 1 < high) {
        const middle = (low + high) >>> 1;
        if (lineStarts[middle] <= offset) low = middle;
        else high = middle;
      }
      return new Position(low, Math.min(offset, lineEnds[low]) - lineStarts[low]);
    },
    offsetAt(position) {
      if (position.line < 0) return 0;
      if (position.line >= lineStarts.length) return text.length;
      return Math.max(
        lineStarts[position.line],
        Math.min(lineEnds[position.line], lineStarts[position.line] + position.character)
      );
    },
    getText(range) {
      return range ? text.slice(this.offsetAt(range.start), this.offsetAt(range.end)) : text;
    },
  };
  const decorations = new Map();
  return { document, decorations, setDecorations: (type, ranges) => decorations.set(type, ranges) };
}

const workspace = {
  getConfiguration() {
    return {
      get: (key, fallback) => settings[key] ?? fallback,
      async update(key, value) {
        configure({ [key]: value });
      },
    };
  },
  onDidChangeConfiguration: (listener) => subscribe(configurationListeners, listener),
  onDidChangeTextDocument: (listener) => subscribe(documentListeners, listener),
};

const window = {
  activeTextEditor: undefined,
  onDidChangeActiveTextEditor: (listener) => subscribe(editorListeners, listener),
  createOutputChannel: () => ({ appendLine() {}, dispose() {} }),
  createTextEditorDecorationType: (options) => ({ options, dispose() {} }),
};

function configure(values) {
  Object.assign(settings, values);
  for (const listener of configurationListeners) {
    listener({ affectsConfiguration: (section) => section === 'tailwindRainbow' });
  }
}

function reset() {
  settings = structuredClone(defaults);
  window.activeTextEditor = undefined;
}

module.exports = {
  Position,
  Range,
  workspace,
  window,
  commands: {
    registerCommand(name, callback) {
      if (commands.has(name)) throw new Error(`Command already registered: ${name}`);
      commands.set(name, callback);
      return { dispose: () => commands.delete(name) };
    },
    executeCommand: async (name, ...args) => commands.get(name)?.(...args),
  },
  createEditor,
  configure,
  reset,
};
