import type { FsDir, FsNode } from '../lib/types';

const HOME_ALIASES = ['/home/ethan', '/home/ethan/'];

export function normalizePath(path: string): string {
  let raw = path.trim();
  if (raw === '/home/ethan') {
    return '~';
  }
  if (raw.startsWith('/home/ethan/')) {
    raw = `~/${raw.slice('/home/ethan/'.length)}`;
  }
  if (raw === '/' || raw === '') {
    return '~';
  }
  if (raw.startsWith('/') && !HOME_ALIASES.some((alias) => raw === alias || raw.startsWith(`${alias}/`))) {
    raw = `~${raw}`;
  }
  const rest = raw.startsWith('~') ? raw.slice(1) : raw;
  const parts = rest.split('/').filter((part) => part.length > 0 && part !== '.');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.length === 0 ? '~' : `~/${stack.join('/')}`;
}

export function resolvePath(cwd: string, input: string): string {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '~' || trimmed === '~/') {
    return '~';
  }
  if (trimmed.startsWith('~') || trimmed.startsWith('/')) {
    return normalizePath(trimmed);
  }
  const base = cwd === '~' ? '~' : cwd;
  return normalizePath(`${base}/${trimmed}`);
}

export function getNode(root: FsDir, path: string): FsNode | null {
  const normalized = normalizePath(path);
  if (normalized === '~') {
    return root;
  }
  const parts = normalized.slice(2).split('/');
  let current: FsDir = root;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? '';
    const next: FsNode | undefined = current.children[part];
    if (!next) {
      return null;
    }
    const isLast = index === parts.length - 1;
    if (isLast) {
      return next;
    }
    if (next.kind !== 'dir') {
      return null;
    }
    current = next;
  }
  return current;
}

export function listDir(root: FsDir, path: string): string[] | null {
  const node = getNode(root, path);
  if (!node || node.kind !== 'dir') {
    return null;
  }
  return Object.keys(node.children).sort((a, b) => a.localeCompare(b));
}

export function completePath(root: FsDir, cwd: string, partial: string): string[] {
  const slash = partial.lastIndexOf('/');
  let dirPath: string;
  let prefix: string;
  if (slash === -1) {
    dirPath = cwd;
    prefix = partial;
  } else {
    const dirInput = partial.slice(0, slash);
    if (dirInput === '') {
      dirPath = partial.startsWith('/') ? '~' : cwd;
    } else {
      dirPath = resolvePath(cwd, dirInput);
    }
    prefix = partial.slice(slash + 1);
  }
  const node = getNode(root, dirPath);
  if (!node || node.kind !== 'dir') {
    return [];
  }
  return Object.keys(node.children)
    .filter((name) => name.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const child = node.children[name];
      const suffix = child.kind === 'dir' ? '/' : '';
      if (slash === -1) {
        return `${name}${suffix}`;
      }
      return `${partial.slice(0, slash + 1)}${name}${suffix}`;
    });
}
