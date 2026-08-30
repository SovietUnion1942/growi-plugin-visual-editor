/** 検証用フローティングパネル（素の DOM、React 非依存） */

import './panel.css';
import { checkCmAccess, currentMarkdown, diagnose, roundTripTest, writeBackTest } from './spike';

export function mountPanel(): void {
  if (document.querySelector('.ve-spike')) return;

  const root = document.createElement('div');
  root.className = 've-spike';
  root.innerHTML = `
    <h4>visual-editor 技術検証 <button class="ghost" data-act="close">×</button></h4>
    <div class="ve-btns">
      <button data-act="cm">1. CM6検出</button>
      <button data-act="rt">2. Markdown往復</button>
      <button data-act="wb">3. 書き戻し</button>
      <button class="ghost" data-act="diag">diag</button>
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
    if (act === 'close') { root.remove(); return; }
    if (act === 'clear') { log.innerHTML = ''; return; }

    put(`--- ${new Date().toLocaleTimeString()} : ${act} ---`, 'warn');

    if (act === 'cm') {
      const r = checkCmAccess();
      put(r.text, r.result);
    }
    if (act === 'diag') {
      for (const line of diagnose()) put(line.text, line.result);
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
