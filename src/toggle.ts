/**
 * GROWI 編集画面に「ビジュアル / ソース」切替ボタンを出し、
 * ビジュアルモード中は CodeMirror を隠して WYSIWYG を載せる。
 * CodeMirror(=Markdown 本文)を常に正とし、WYSIWYG の変更は全文置換で書き戻す。
 */

import {
  findMainCmEditorEl,
  findMainCmView,
  readMarkdown,
  writeMarkdown,
  type CmView,
} from './cmBridge';
import { createVisualEditor, type VisualEditorHandle } from './editor/visualEditor';

let button: HTMLButtonElement | null = null;
let mode: 'source' | 'visual' = 'source';
let handle: VisualEditorHandle | null = null;
let container: HTMLElement | null = null;
let cmEditorEl: HTMLElement | null = null;
let cmView: CmView | null = null;

function setLabel(): void {
  if (button == null) return;
  button.textContent = mode === 'visual' ? '📝 ソースに戻す' : '✏️ ビジュアル編集';
}

function enterVisual(): void {
  cmView = findMainCmView();
  cmEditorEl = findMainCmEditorEl();
  if (cmView == null || cmEditorEl == null) return;

  const markdown = readMarkdown(cmView);

  // 隠す前に見えているエディタの寸法を測り、同じ高さを引き継ぐ
  const rect = cmEditorEl.getBoundingClientRect();
  const h = Math.max(rect.height, Math.round(window.innerHeight * 0.6));

  container = document.createElement('div');
  container.className = 've-container';
  container.style.height = `${h}px`;
  cmEditorEl.parentElement?.insertBefore(container, cmEditorEl.nextSibling);
  cmEditorEl.style.display = 'none';

  handle = createVisualEditor(container, markdown, (md) => {
    if (cmView != null) writeMarkdown(cmView, md);
  });
  handle.focus();
  container.scrollIntoView({ block: 'nearest' });

  mode = 'visual';
  setLabel();
  // eslint-disable-next-line no-console
  console.log('[growi-plugin-visual-editor] visual mode',
    { h, containerRect: container.getBoundingClientRect(), cmHidden: cmEditorEl.style.display });
}

function exitVisual(sync = true): void {
  if (handle != null && cmView != null && sync) {
    writeMarkdown(cmView, handle.getMarkdown());
  }
  handle?.destroy();
  handle = null;
  container?.remove();
  container = null;
  if (cmEditorEl != null) {
    cmEditorEl.style.display = '';
    cmEditorEl = null;
  }
  // CM6 に再計測を促す
  try {
    (cmView as any)?.requestMeasure?.();
    cmView?.focus();
  } catch {
    /* noop */
  }
  cmView = null;

  mode = 'source';
  setLabel();
}

function ensureButton(): void {
  if (button != null) return;
  button = document.createElement('button');
  button.type = 'button';
  button.className = 've-toggle-btn';
  button.addEventListener('click', () => {
    if (mode === 'source') enterVisual();
    else exitVisual();
  });
  setLabel();
  document.body.appendChild(button);
}

function removeButton(): void {
  if (mode === 'visual') exitVisual(false);
  button?.remove();
  button = null;
}

export function initToggle(): void {
  const sync = () => {
    const hasEditor = findMainCmView() != null;
    if (hasEditor) ensureButton();
    else removeButton();
    // ビジュアル中に CM 要素が作り直された場合の保険
    if (mode === 'visual' && (container?.isConnected !== true || cmEditorEl?.isConnected !== true)) {
      exitVisual(false);
    }
  };

  sync();
  let raf = 0;
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sync);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
