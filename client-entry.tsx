import './src/styles.css';
import { initToggle } from './src/toggle';

declare const growiFacade: unknown;

const PLUGIN_ID = 'growi-plugin-visual-editor';

// eslint-disable-next-line no-console
console.log(`[${PLUGIN_ID}] script loaded`);

let started = false;
const start = (): void => {
  if (started) return;
  started = true;
  // eslint-disable-next-line no-console
  console.log(`[${PLUGIN_ID}] start`, typeof growiFacade);
  initToggle();
};

const activate = (): void => start();
const deactivate = (): void => {
  document.querySelector('.ve-toggle-btn')?.remove();
  document.querySelector('.ve-container')?.remove();
};

type Activators = Record<string, { activate: () => void; deactivate: () => void }>;
const w = window as unknown as { pluginActivators?: Activators };
w.pluginActivators ??= {};
w.pluginActivators[PLUGIN_ID] = { activate, deactivate };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

export {};
