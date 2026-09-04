import { isThemeName, type OutputPart, type SitePayload, type TermState, type ThemeName } from '../lib/types';
import type { OutputLine } from '../lib/types';
import { completePath, getNode, listDir, resolvePath } from './fs';
import { blankLine, line, splitLines, textLine } from './output';

export const PUBLIC_COMMANDS = [
  'help',
  'whoami',
  'neofetch',
  'ls',
  'cd',
  'cat',
  'clear',
  'pwd',
  'open',
  'projects',
  'about',
  'contact',
  'theme',
  'exit',
] as const;

const HIDDEN_COMMANDS = ['sudo', 'rm', 'vim', 'ssh'] as const;

type PublicCommand = (typeof PUBLIC_COMMANDS)[number];
type HiddenCommand = (typeof HIDDEN_COMMANDS)[number];
type CommandName = PublicCommand | HiddenCommand;

export type ExecuteResult = {
  state: TermState;
  lines: OutputLine[];
  clear?: boolean;
  navigate?: string;
  openUrl?: string;
  echoInput?: boolean;
};

function isPublicCommand(value: string): value is PublicCommand {
  return (PUBLIC_COMMANDS as readonly string[]).includes(value);
}

function isCommandName(value: string): value is CommandName {
  return isPublicCommand(value) || (HIDDEN_COMMANDS as readonly string[]).includes(value);
}

function tokenize(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

function err(text: string): OutputLine {
  return textLine(text, 'err');
}

function dim(text: string): OutputLine {
  return textLine(text, 'dim');
}

const NEOFETCH_ART = [
  '      ███████╗██████╗',
  '      ██╔════╝██╔══██╗',
  '      █████╗  ██████╔╝',
  '      ██╔══╝  ██╔══██╗',
  '      ███████╗██████╔╝',
  '      ╚══════╝╚═════╝',
];

function helpLines(): OutputLine[] {
  return [
    textLine('available commands', 'com'),
    line({ cls: 'kw', text: '  help' }, { cls: 'dim', text: '       show this message' }),
    line({ cls: 'kw', text: '  whoami' }, { cls: 'dim', text: '     identity' }),
    line({ cls: 'kw', text: '  neofetch' }, { cls: 'dim', text: '   system summary' }),
    line({ cls: 'kw', text: '  ls' }, { cls: 'dim', text: '         list directory' }),
    line({ cls: 'kw', text: '  cd' }, { cls: 'dim', text: '         change directory' }),
    line({ cls: 'kw', text: '  cat' }, { cls: 'dim', text: '        print a file' }),
    line({ cls: 'kw', text: '  pwd' }, { cls: 'dim', text: '        print working directory' }),
    line({ cls: 'kw', text: '  open' }, { cls: 'dim', text: '       open a file or url' }),
    line({ cls: 'kw', text: '  about' }, { cls: 'dim', text: '      read about.md' }),
    line({ cls: 'kw', text: '  projects' }, { cls: 'dim', text: '   list ~/projects' }),
    line({ cls: 'kw', text: '  contact' }, { cls: 'dim', text: '    read contact.md' }),
    line({ cls: 'kw', text: '  clear' }, { cls: 'dim', text: '      clear the terminal' }),
    line({ cls: 'kw', text: '  theme' }, { cls: 'dim', text: '      theme [dark|crt]' }),
    line({ cls: 'kw', text: '  exit' }, { cls: 'dim', text: '       close overlay / return home' }),
    blankLine(),
    dim('tab completes. up/down walks history.'),
  ];
}

function neofetchLines(site: SitePayload, theme: ThemeName): OutputLine[] {
  const info = [
    `${site.user}@${site.host}`,
    '-----------',
    `OS:     ethanOS`,
    `Host:   ${site.domain}`,
    `Kernel: Astro`,
    `Shell:  tty0`,
    `Role:   ${site.role}`,
    `Theme:  ${theme === 'crt' ? 'amber CRT' : 'VS Code Dark+'}`,
  ];
  return [
    ...NEOFETCH_ART.map((row) => textLine(row, 'kw')),
    blankLine(),
    ...info.map((row, index) => textLine(row, index === 0 ? 'ok' : 'text')),
  ];
}

function catFile(site: SitePayload, cwd: string, target: string): ExecuteResult['lines'] | { error: OutputLine } {
  const path = resolvePath(cwd, target);
  const node = getNode(site.fs, path);
  if (!node) {
    return { error: err(`cat: ${target}: no such file`) };
  }
  if (node.kind === 'dir') {
    return { error: err(`cat: ${target}: is a directory`) };
  }
  return splitLines(node.content);
}

function runPublic(
  name: PublicCommand,
  args: string[],
  state: TermState,
  site: SitePayload,
): ExecuteResult {
  switch (name) {
    case 'help':
      return { state, lines: helpLines() };
    case 'whoami':
      return {
        state,
        lines: [
          textLine(site.user, 'fn'),
          textLine(site.name),
          textLine(site.role, 'dim'),
          textLine(site.github, 'str'),
        ],
      };
    case 'neofetch':
      return { state, lines: neofetchLines(site, state.theme) };
    case 'ls': {
      const target = args[0] ? resolvePath(state.cwd, args[0]) : state.cwd;
      const names = listDir(site.fs, target);
      if (!names) {
        const node = getNode(site.fs, target);
        if (node?.kind === 'file') {
          const fileName = target.split('/').pop() ?? args[0] ?? target;
          return { state, lines: [textLine(fileName)] };
        }
        return { state, lines: [err(`ls: ${args[0] ?? target}: no such directory`)] };
      }
      if (names.length === 0) {
        return { state, lines: [dim('(empty)')] };
      }
      const parts: OutputPart[] = [];
      names.forEach((entry, index) => {
        if (index > 0) {
          parts.push({ cls: 'text', text: '  ' });
        }
        const child = getNode(site.fs, resolvePath(target, entry));
        if (child?.kind === 'dir') {
          parts.push({ cls: 'kw', text: `${entry}/` });
          return;
        }
        if (entry.endsWith('.md')) {
          parts.push({ cls: 'fn', text: entry });
          return;
        }
        if (entry.endsWith('.url')) {
          parts.push({ cls: 'str', text: entry });
          return;
        }
        parts.push({ cls: 'text', text: entry });
      });
      return { state, lines: [{ parts }] };
    }
    case 'cd': {
      const target = args[0] ? resolvePath(state.cwd, args[0]) : '~';
      const node = getNode(site.fs, target);
      if (!node) {
        return { state, lines: [err(`cd: ${args[0]}: no such file or directory`)] };
      }
      if (node.kind === 'file') {
        return { state, lines: [err(`cd: ${args[0]}: not a directory`)] };
      }
      return { state: { ...state, cwd: target }, lines: [] };
    }
    case 'cat': {
      if (!args[0]) {
        return { state, lines: [err('cat: missing file operand')] };
      }
      const result = catFile(site, state.cwd, args[0]);
      if ('error' in result) {
        return { state, lines: [result.error] };
      }
      return { state, lines: result };
    }
    case 'clear':
      return { state, lines: [], clear: true };
    case 'pwd':
      return { state, lines: [textLine(state.cwd, 'kw')] };
    case 'open': {
      if (!args[0]) {
        return { state, lines: [err('open: missing file or url')] };
      }
      const token = args[0];
      if (token === 'github') {
        return { state, lines: [textLine(`opening ${site.github}`, 'dim')], openUrl: site.github };
      }
      if (token === 'linkedin') {
        return { state, lines: [textLine(`opening ${site.linkedin}`, 'dim')], openUrl: site.linkedin };
      }
      if (token === 'about' || token === 'about.md') {
        return { state, lines: [dim('opening about.md')], navigate: site.routes.about };
      }
      if (token === 'contact' || token === 'contact.md') {
        return { state, lines: [dim('opening contact.md')], navigate: site.routes.contact };
      }
      if (token === 'projects' || token === 'projects/') {
        return { state, lines: [dim('opening ~/projects')], navigate: site.routes.projects };
      }
      if (/^https?:\/\//.test(token)) {
        return { state, lines: [textLine(`opening ${token}`, 'dim')], openUrl: token };
      }
      const path = resolvePath(state.cwd, token);
      const node = getNode(site.fs, path);
      if (!node) {
        return { state, lines: [err(`open: ${token}: no such file`)] };
      }
      if (node.kind === 'dir') {
        if (path === '~/projects') {
          return { state, lines: [dim('opening ~/projects')], navigate: site.routes.projects };
        }
        return { state, lines: [err(`open: ${token}: is a directory`)] };
      }
      if (node.href) {
        if (node.href.startsWith('/')) {
          return { state, lines: [textLine(`opening ${node.href}`, 'dim')], navigate: node.href };
        }
        return { state, lines: [textLine(`opening ${node.href}`, 'dim')], openUrl: node.href };
      }
      const printed = catFile(site, state.cwd, token);
      if ('error' in printed) {
        return { state, lines: [printed.error] };
      }
      return { state, lines: printed };
    }
    case 'projects': {
      const names = listDir(site.fs, '~/projects') ?? [];
      const parts: OutputPart[] = [];
      names.forEach((entry, index) => {
        if (index > 0) {
          parts.push({ cls: 'text', text: '  ' });
        }
        parts.push({ cls: 'fn', text: entry });
      });
      return {
        state,
        lines: [
          textLine('~/projects', 'com'),
          names.length === 0 ? dim('(empty)') : { parts },
          dim('cat <file> to read · open <file> for GitHub'),
        ],
      };
    }
    case 'about': {
      const result = catFile(site, '~', 'about.md');
      if ('error' in result) {
        return { state, lines: [result.error] };
      }
      return { state, lines: result };
    }
    case 'contact': {
      const result = catFile(site, '~', 'contact.md');
      if ('error' in result) {
        return { state, lines: [result.error] };
      }
      return { state, lines: result };
    }
    case 'theme': {
      const nextArg = args[0];
      if (!nextArg) {
        const next: ThemeName = state.theme === 'dark' ? 'crt' : 'dark';
        return {
          state: { ...state, theme: next },
          lines: [line({ cls: 'dim', text: 'theme: ' }, { cls: 'fn', text: next })],
        };
      }
      if (!isThemeName(nextArg)) {
        return { state, lines: [err('theme: use dark or crt')] };
      }
      return {
        state: { ...state, theme: nextArg },
        lines: [line({ cls: 'dim', text: 'theme: ' }, { cls: 'fn', text: nextArg })],
      };
    }
    case 'exit':
      return { state, lines: [dim('returning to tty0')], navigate: site.routes.home };
    default: {
      const _exhaustive: never = name;
      return { state, lines: [err(`ethanos: unhandled command ${String(_exhaustive)}`)] };
    }
  }
}

function runHidden(
  name: HiddenCommand,
  args: string[],
  state: TermState,
  site: SitePayload,
): ExecuteResult {
  switch (name) {
    case 'sudo':
      return {
        state,
        lines: [err(`${site.user} is not in the sudoers file. This incident will be reported.`)],
      };
    case 'rm': {
      const joined = args.join(' ');
      if (joined.includes('-rf') && (joined.includes('/') || joined.includes('~') || args.length === 1)) {
        return { state, lines: [textLine("let's not. this is a portfolio, not a production cluster.", 'pn')] };
      }
      return { state, lines: [err('rm: ethanOS is mounted read-only')] };
    }
    case 'vim':
      return {
        state,
        lines: [
          textLine('~', 'dim'),
          textLine('"about.md" [readonly]', 'com'),
          blankLine(),
          textLine('this is not vim. :q still works here though — try `exit`.', 'pn'),
        ],
      };
    case 'ssh': {
      const dest = (args[0] ?? '').toLowerCase();
      const allowed = new Set([
        site.domain,
        `${site.user}@${site.host}`,
        `${site.user}@${site.domain}`,
        'origin',
        'localhost',
      ]);
      if (!dest) {
        return { state, lines: [err('usage: ssh ethanbyrne.co.uk')] };
      }
      if (!allowed.has(dest)) {
        return { state, lines: [err(`ssh: connect to host ${args[0]} port 22: connection refused`)] };
      }
      return {
        state: { ...state, cwd: '~' },
        lines: [
          textLine(`Connecting to ${site.domain}...`, 'dim'),
          textLine('authenticated. welcome back.', 'ok'),
          blankLine(),
          ...neofetchLines(site, state.theme),
        ],
      };
    }
    default: {
      const _exhaustive: never = name;
      return { state, lines: [err(`ethanos: unhandled command ${String(_exhaustive)}`)] };
    }
  }
}

export function execute(input: string, state: TermState, site: SitePayload): ExecuteResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { state, lines: [], echoInput: false };
  }
  const tokens = tokenize(trimmed);
  const rawName = tokens[0] ?? '';
  const args = tokens.slice(1);
  if (!isCommandName(rawName)) {
    return { state, lines: [err(`ethanos: ${rawName}: command not found. try \`help\`.`)] };
  }
  if (isPublicCommand(rawName)) {
    return runPublic(rawName, args, state, site);
  }
  return runHidden(rawName, args, state, site);
}

export function completeInput(input: string, cwd: string, site: SitePayload): string[] {
  const hasTrailingSpace = input.endsWith(' ');
  const tokens = tokenize(input);
  if (tokens.length === 0 || (tokens.length === 1 && !hasTrailingSpace)) {
    const prefix = tokens[0] ?? '';
    return PUBLIC_COMMANDS.filter((command) => command.startsWith(prefix));
  }
  const name = tokens[0] ?? '';
  const pathCommands = new Set(['ls', 'cd', 'cat', 'open']);
  if (!pathCommands.has(name)) {
    return [];
  }
  const partial = hasTrailingSpace ? '' : (tokens[tokens.length - 1] ?? '');
  return completePath(site.fs, cwd, partial);
}

export function commonPrefix(items: string[]): string {
  if (items.length === 0) {
    return '';
  }
  let prefix = items[0] ?? '';
  for (const item of items.slice(1)) {
    while (!item.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}
