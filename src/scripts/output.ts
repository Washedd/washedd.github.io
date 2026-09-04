import type { OutputLine, OutputPart, TokenClass } from '../lib/types';

export function line(...parts: OutputPart[]): OutputLine {
  return { parts };
}

export function textLine(text: string, cls: TokenClass = 'text'): OutputLine {
  return { parts: [{ cls, text }] };
}

export function blankLine(): OutputLine {
  return { parts: [{ cls: 'text', text: ' ' }] };
}

export function splitLines(text: string, cls: TokenClass = 'text'): OutputLine[] {
  if (text.length === 0) {
    return [textLine('')];
  }
  return text.split('\n').map((row) => {
    if (row.startsWith('#')) {
      return textLine(row, 'com');
    }
    return textLine(row, cls);
  });
}
