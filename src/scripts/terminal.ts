import type { OutputLine, SitePayload, TermState, ThemeName } from '../lib/types';
import { commonPrefix, completeInput, execute } from './commands';
import { line, textLine } from './output';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLine(output: HTMLElement, entry: OutputLine): void {
  const row = document.createElement('p');
  row.className = 'term-line';
  row.innerHTML = entry.parts
    .map((part) => `<span class="tok-${part.cls}">${escapeHtml(part.text)}</span>`)
    .join('');
  output.appendChild(row);
}

function promptLine(user: string, host: string, cwd: string, command: string): OutputLine {
  return line(
    { cls: 'ok', text: `${user}@${host}` },
    { cls: 'dim', text: ':' },
    { cls: 'kw', text: cwd },
    { cls: 'dim', text: '$ ' },
    { cls: 'text', text: command },
  );
}

function replaceLastToken(input: string, next: string): string {
  const match = input.match(/^(.*?)(\S*)$/);
  if (!match) {
    return next;
  }
  return `${match[1] ?? ''}${next}`;
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => (value.replace(/\/$/, '') || '/');
  return normalize(left) === normalize(right);
}

export type TerminalApi = {
  run: (command: string) => void;
  focus: () => void;
  getTheme: () => ThemeName;
  setTheme: (theme: ThemeName) => void;
};

export function createTerminal(options: {
  site: SitePayload;
  initialTheme: ThemeName;
  onCwd: (cwd: string) => void;
  onTheme: (theme: ThemeName) => void;
}): TerminalApi | null {
  const output = document.getElementById('term-output');
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-input');
  const prompt = document.getElementById('term-prompt');
  if (
    !(output instanceof HTMLElement) ||
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLInputElement) ||
    !(prompt instanceof HTMLElement)
  ) {
    return null;
  }

  let state: TermState = { cwd: '~', theme: options.initialTheme };
  const history: string[] = [];
  let historyIndex = -1;
  let draft = '';

  const syncPrompt = () => {
    prompt.textContent = `${options.site.user}@${options.site.host}:${state.cwd}$`;
    options.onCwd(state.cwd);
  };

  const print = (lines: OutputLine[]) => {
    for (const entry of lines) {
      renderLine(output, entry);
    }
    output.scrollTop = output.scrollHeight;
  };

  const applyResult = (command: string, echo: boolean) => {
    const result = execute(command, state, options.site);
    const previousTheme = state.theme;
    if (echo) {
      print([promptLine(options.site.user, options.site.host, state.cwd, command)]);
    }
    if (result.clear) {
      output.replaceChildren();
    }
    state = result.state;
    syncPrompt();
    if (previousTheme !== state.theme) {
      options.onTheme(state.theme);
    }
    print(result.lines);
    if (result.openUrl) {
      window.open(result.openUrl, '_blank', 'noopener,noreferrer');
    }
    if (result.navigate && !samePath(window.location.pathname, result.navigate)) {
      window.location.assign(result.navigate);
    }
  };

  const run = (command: string) => {
    const trimmed = command.trim();
    if (trimmed.length > 0) {
      history.push(trimmed);
    }
    historyIndex = -1;
    draft = '';
    applyResult(command, true);
  };

  print([
    textLine('welcome to ethanOS.', 'ok'),
    line(
      { cls: 'dim', text: 'type ' },
      { cls: 'kw', text: 'help' },
      { cls: 'dim', text: ' to look around.' },
    ),
  ]);
  syncPrompt();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = '';
    run(value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length === 0) {
        return;
      }
      if (historyIndex === -1) {
        draft = input.value;
        historyIndex = history.length - 1;
      } else if (historyIndex > 0) {
        historyIndex -= 1;
      }
      input.value = history[historyIndex] ?? '';
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === -1) {
        return;
      }
      if (historyIndex >= history.length - 1) {
        historyIndex = -1;
        input.value = draft;
        return;
      }
      historyIndex += 1;
      input.value = history[historyIndex] ?? '';
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const matches = completeInput(input.value, state.cwd, options.site);
      if (matches.length === 0) {
        return;
      }
      if (matches.length === 1) {
        input.value = replaceLastToken(input.value, matches[0] ?? '');
        return;
      }
      const prefix = commonPrefix(matches);
      if (prefix.length > 0) {
        input.value = replaceLastToken(input.value, prefix);
      }
      print([
        promptLine(options.site.user, options.site.host, state.cwd, input.value),
        { parts: matches.flatMap((match, index) => [
          ...(index === 0 ? [] : [{ cls: 'text' as const, text: '  ' }]),
          { cls: 'fn' as const, text: match },
        ]) },
      ]);
    }
  });

  return {
    run,
    focus: () => {
      input.focus();
    },
    getTheme: () => state.theme,
    setTheme: (theme: ThemeName) => {
      state = { ...state, theme };
      options.onTheme(theme);
    },
  };
}
