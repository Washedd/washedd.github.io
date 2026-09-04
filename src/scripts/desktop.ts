import type { SitePayload } from '../lib/types';
import { runBoot } from './boot';
import { watchKonami } from './konami';
import { applyTheme, readTheme } from './theme';
import { createTerminal } from './terminal';

function readPayload(): SitePayload | null {
  const node = document.getElementById('ethanos-data');
  if (!node?.textContent) {
    return null;
  }
  try {
    return JSON.parse(node.textContent) as SitePayload;
  } catch {
    return null;
  }
}

function formatClock(now: Date): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
}

function batteryPercent(now: Date): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.max(18, Math.min(97, 96 - Math.floor((minutes / 1440) * 40)));
}

function tickStatus(): void {
  const now = new Date();
  const clock = document.getElementById('os-clock');
  if (clock instanceof HTMLTimeElement) {
    clock.dateTime = now.toISOString();
    clock.textContent = formatClock(now);
  } else if (clock) {
    clock.textContent = formatClock(now);
  }
  const battery = document.getElementById('os-battery');
  if (battery) {
    battery.textContent = `${batteryPercent(now)}%`;
  }
}

export async function initDesktop(): Promise<void> {
  const site = readPayload();
  if (!site) {
    return;
  }

  const theme = readTheme();
  applyTheme(theme);
  tickStatus();
  window.setInterval(tickStatus, 15_000);

  await runBoot();

  const cwdLabel = document.getElementById('os-cwd');
  const terminal = createTerminal({
    site,
    initialTheme: theme,
    onCwd: (cwd) => {
      if (cwdLabel) {
        cwdLabel.textContent = cwd;
      }
    },
    onTheme: (next) => {
      applyTheme(next);
    },
  });
  if (!terminal) {
    return;
  }

  document.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((button) => {
    button.addEventListener('click', () => {
      const command = button.dataset.cmd;
      if (command) {
        terminal.run(command);
        terminal.focus();
      }
    });
  });

  watchKonami((next) => {
    terminal.setTheme(next);
  }, () => terminal.getTheme());

  const focusInput = () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLButtonElement) {
      return;
    }
    terminal.focus();
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
      event.preventDefault();
      terminal.focus();
    }
  });

  document.querySelector('.terminal-window')?.addEventListener('click', focusInput);
  window.setTimeout(() => terminal.focus(), 0);
}

void initDesktop();
