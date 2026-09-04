const SESSION_KEY = 'ethanos-booted';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hideBoot(screen: HTMLElement): void {
  screen.classList.add('is-done');
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    return;
  }
}

export function runBoot(): Promise<void> {
  const screen = document.getElementById('boot-screen');
  if (!(screen instanceof HTMLElement)) {
    return Promise.resolve();
  }
  const log = document.getElementById('boot-log');
  let already = false;
  try {
    already = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    already = false;
  }
  if (prefersReducedMotion() || already) {
    hideBoot(screen);
    return Promise.resolve();
  }

  const linesRaw = log?.getAttribute('data-lines') ?? '[]';
  let lines: string[] = [];
  try {
    const parsed: unknown = JSON.parse(linesRaw);
    if (Array.isArray(parsed)) {
      lines = parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    lines = ['ethanOS v1.0'];
  }

  return new Promise((resolve) => {
    let index = 0;
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      hideBoot(screen);
      window.removeEventListener('keydown', onSkip);
      window.removeEventListener('pointerdown', onSkip);
      resolve();
    };

    const onSkip = () => {
      finish();
    };

    window.addEventListener('keydown', onSkip, { once: true });
    window.addEventListener('pointerdown', onSkip, { once: true });

    const tick = () => {
      if (finished) {
        return;
      }
      if (log && index < lines.length) {
        const next = lines[index] ?? '';
        log.textContent = `${log.textContent ?? ''}${index === 0 ? '' : '\n'}${next}`;
        index += 1;
        window.setTimeout(tick, 280);
        return;
      }
      window.setTimeout(finish, 420);
    };

    tick();
  });
}
