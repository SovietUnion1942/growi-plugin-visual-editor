import { mountPanel } from './src/panel';

// GROWI が runtime で window に生やす。型は配布されていない。
declare const growiFacade: unknown;

const PLUGIN_ID = 'growi-plugin-visual-editor';

// eslint-disable-next-line no-console
console.log(`[${PLUGIN_ID}] script loaded`);

// 編集画面(.cm-editor)が現れたら検証パネルを出す。
let started = false;
const start = (): void => {
  if (started) return;
  started = true;
  // eslint-disable-next-line no-console
  console.log(`[${PLUGIN_ID}] start`, typeof growiFacade);

  const tryMount = () => {
    if (document.querySelector('.cm-editor')) mountPanel();
  };
  tryMount();
  const mo = new MutationObserver(tryMount);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  // フォールバック: activate が呼ばれないケースに備えたポーリング
  const iv = setInterval(() => {
    tryMount();
    if (document.querySelector('.ve-spike')) clearInterval(iv);
  }, 1000);
};

const activate = (): void => start();
const deactivate = (): void => {
  document.querySelector('.ve-spike')?.remove();
};

type Activators = Record<string, { activate: () => void; deactivate: () => void }>;
const w = window as unknown as { pluginActivators?: Activators };
w.pluginActivators ??= {};
w.pluginActivators[PLUGIN_ID] = { activate, deactivate };

// activate が呼ばれない(スクリプトの読み込みが遅い等)場合の保険として、
// スクリプト評価時にも一度起動しておく。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

export {};
