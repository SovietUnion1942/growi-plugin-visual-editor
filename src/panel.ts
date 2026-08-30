/** 検証用フローティングパネル（素の DOM、React 非依存） */

import { checkCmAccess, currentMarkdown, roundTripTest, writeBackTest } from './spike';

const STYLE = `
.ve-spike { position: fixed; right: 12px; bottom: 12px; z-index: 100000;
  width: 420px; max-height: 70vh; display: flex; flex-direction: column;
  font: 12px/1.5 ui-monospace, monospace; background: #1e1e1e; color: #ddd;
  border: 1px solid #555; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,.4); }
.ve-spike h4 { margin: 0; padding: 8px 10px; background: #333; font-size: 12px;
  display: flex; justify-content: space-between; align-items: center; }
.ve-spike .ve-btns { padding: 8px 10px; display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid #444; }
.ve-spike button { font: inherit; padding: 4px 8px; background: #2f6f4f; color: #fff;
  border: 0; border-radius: 4px; cursor: pointer; }
.ve-spike button.ghost { background: #444; }
.ve-spike .ve-log { padding: 8px 10px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
.ve-spike .ok { color: #6fdd8b; } .ve-spike .warn { color: #e6c07b; } .ve-spike .ng { color: #ff7b72; }
`;

export function mountPanel(): void {
  if (document.querySelector('.ve-spike')) return;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 've-spike';
  root.innerHTML = `
    <h4>visual-editor 技術検証 <button class="ghost" data-act="close">×</button></h4>
    <div class="ve-btns">
      <button data-act="cm">1. CM6検出</button>
      <button data-act="rt">2. Markdown往復</button>
      <button data-act="wb">3. 書き戻し</button>
      <button class="ghost" data-act="clear">clear</button>
    </div>
    <div class="ve-log"></div>`;
  document.body.appendChild(root);

  const log = root.querySelector('.ve-log') as HTMLElement;
  let undoWriteBack: (() => void) | undefined;

  const put = (text: string, result: 'ok' | 'warn' | 'ng' = 'ok') => {
    const el = document.createElement('div');
    el.className = result;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  };

  root.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).dataset.act;
    if (!act) return;
    if (act === 'close') { root.remove(); style.remove(); return; }
    if (act === 'clear') { log.innerHTML = ''; return; }

    put(`--- ${new Date().toLocaleTimeString()} : ${act} ---`, 'warn');

    if (act === 'cm') {
      const r = checkCmAccess();
      put(r.text, r.result);
    }
    if (act === 'rt') {
      const md = currentMarkdown();
      if (!md) { put('編集画面が開いていない / 本文が空', 'ng'); return; }
      put(`元本文 ${md.length} 文字で往復テスト`, 'ok');
      for (const line of roundTripTest(md)) put(line.text, line.result);
    }
    if (act === 'wb') {
      if (undoWriteBack) { undoWriteBack(); undoWriteBack = undefined; put('前回の書き戻しを取り消した', 'ok'); return; }
      const { lines, undo } = writeBackTest();
      for (const line of lines) put(line.text, line.result);
      if (undo) { undoWriteBack = undo; put('（もう一度「3. 書き戻し」で取り消し）', 'warn'); }
    }
  });
}
