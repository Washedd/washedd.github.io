import type { ThemeName } from '../lib/types';

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

export function watchKonami(onToggle: (theme: ThemeName) => void, getTheme: () => ThemeName): void {
  const progress: string[] = [];
  window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const expected = SEQUENCE[progress.length];
    if (key === expected) {
      progress.push(key);
      if (progress.length === SEQUENCE.length) {
        progress.length = 0;
        onToggle(getTheme() === 'crt' ? 'dark' : 'crt');
      }
      return;
    }
    progress.length = 0;
    if (key === SEQUENCE[0]) {
      progress.push(key);
    }
  });
}
