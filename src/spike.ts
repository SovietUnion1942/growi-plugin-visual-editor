/**
 * 技術検証スパイク。
 *
 * ビジュアルエディタを実装する前に、GROWI の script プラグインという制約下で
 * 以下 3 点が成立するかを実機で確認する:
 *
 *   1. 編集画面の CodeMirror6 EditorView インスタンスに DOM 経由で到達できるか
 *   2. Markdown -> ProseMirror doc -> Markdown の往復で本文が壊れないか
 *   3. CM6 に書き戻した変更を GROWI 本体(プレビュー / 自動保存)が拾うか
 *
 * どれも本実装の前提。ここが崩れるなら方式ごと考え直す。
 */

import { defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown';

type CmView = {
  state: { doc: { length: number; toString(): string } };
  dispatch(spec: unknown): void;
  dom: HTMLElement;
};

type Line = { text: string; result: 'ok' | 'warn' | 'ng' };

/** DOM 要素から CodeMirror6 の内部オブジェクト(Tile / ContentView)を得る */
function getCmInternal(el: Element | null): any {
  if (el == null) return null;
  const anyEl = el as any;
  // CM 6.40+ は cmTile、それ以前は cmView
  return anyEl.cmTile ?? anyEl.cmView ?? null;
}

/** 内部オブジェクトから EditorView 本体を掘り出す */
function resolveView(internal: any): any {
  if (internal == null) return null;
  const candidates = [
    internal.root?.view, // Tile: root(DocTile).view
    internal.rootView?.view, // 旧 ContentView.rootView.view
    internal.view, // DocView.view
    internal.editorView,
  ];
  for (const v of candidates) {
    if (v && typeof v.dispatch === 'function' && v.state?.doc) return v;
  }
  return null;
}

/** .cm-editor / .cm-content の expando を辿って EditorView を得る */
export function findCmView(): CmView | null {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('.cm-editor'));
  for (const root of roots) {
    // 非表示はスキップ
    if (root.offsetParent === null && root.getClientRects().length === 0) continue;
    const content = root.querySelector('.cm-content');
    const view =
      resolveView(getCmInternal(content)) ?? resolveView(getCmInternal(root));
    if (view) return view as CmView;
  }
  return null;
}

/** 検出できなかったとき用の DOM ダンプ */
export function diagnose(): Line[] {
  const out: Line[] = [];
  const editors = document.querySelectorAll('.cm-editor');
  out.push({ text: `.cm-editor: ${editors.length} 個`, result: editors.length ? 'ok' : 'ng' });
  editors.forEach((ed, i) => {
    const content = ed.querySelector('.cm-content');
    const expandos = content
      ? Object.getOwnPropertyNames(content).filter((k) => k.startsWith('cm'))
      : [];
    out.push({
      text: `  [${i}] visible=${(ed as HTMLElement).offsetParent != null} .cm-content=${!!content} expando(cm*)=[${expandos.join(',')}]`,
      result: 'warn',
    });
    const internal = getCmInternal(content);
    if (internal) {
      out.push({
        text: `      internal keys: ${Object.keys(internal).slice(0, 12).join(',')}`,
        result: 'warn',
      });
    }
  });
  const withMd = document.querySelectorAll('.CodeMirror, [class*="cm-"]').length;
  out.push({ text: `cm-* を含む要素: ${withMd}`, result: 'warn' });
  return out;
}

export function checkCmAccess(): Line {
  const view = findCmView();
  if (view == null) {
    return { text: 'CM6 EditorView: 見つからない（.cm-editor が無い / expando 名が変わった）', result: 'ng' };
  }
  const len = view.state.doc.length;
  return { text: `CM6 EditorView: 取得OK（本文 ${len} 文字）`, result: 'ok' };
}

/** md -> pm doc -> md をして差分行を返す */
export function roundTripTest(source: string): Line[] {
  const lines: Line[] = [];
  let doc;
  try {
    doc = defaultMarkdownParser.parse(source);
  } catch (e) {
    return [{ text: `Markdown パース失敗: ${String(e)}`, result: 'ng' }];
  }
  if (doc == null) return [{ text: 'Markdown パース結果が null', result: 'ng' }];

  const roundtripped = defaultMarkdownSerializer.serialize(doc);

  const norm = (s: string) => s.replace(/\s+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  const a = norm(source).split('\n');
  const b = norm(roundtripped).split('\n');

  if (norm(source) === norm(roundtripped)) {
    lines.push({ text: '往復: 完全一致（空白正規化後）', result: 'ok' });
    return lines;
  }

  lines.push({ text: '往復: 差分あり ↓（左:元 / 右:往復後）', result: 'warn' });
  const max = Math.max(a.length, b.length);
  let shown = 0;
  for (let i = 0; i < max && shown < 20; i++) {
    if (a[i] !== b[i]) {
      lines.push({ text: `  - 元 : ${JSON.stringify(a[i] ?? '(なし)')}`, result: 'warn' });
      lines.push({ text: `  + 後 : ${JSON.stringify(b[i] ?? '(なし)')}`, result: 'warn' });
      shown++;
    }
  }
  return lines;
}

/** CM6 に無害なコメント行を追記して dispatch が通るか見る（元に戻せる） */
export function writeBackTest(): { lines: Line[]; undo?: () => void } {
  const view = findCmView();
  if (view == null) return { lines: [{ text: '書き戻し: EditorView が無いので不可', result: 'ng' }] };

  const before = view.state.doc.toString();
  const marker = `\n\n<!-- visual-editor spike ${Date.now()} -->`;
  try {
    view.dispatch({
      changes: { from: view.state.doc.length, to: view.state.doc.length, insert: marker },
    });
  } catch (e) {
    return { lines: [{ text: `書き戻し: dispatch 例外 ${String(e)}`, result: 'ng' }] };
  }

  const after = view.state.doc.toString();
  const ok = after === before + marker;
  const lines: Line[] = [
    {
      text: ok
        ? '書き戻し: dispatch 反映OK。GROWI のプレビュー右ペインが更新されたか目視確認して。'
        : '書き戻し: dispatch したが doc が想定通りに変化していない',
      result: ok ? 'warn' : 'ng',
    },
  ];
  const undo = () => {
    const cur = view.state.doc.toString();
    const idx = cur.lastIndexOf(marker);
    if (idx >= 0) {
      view.dispatch({ changes: { from: idx, to: idx + marker.length, insert: '' } });
    }
  };
  return { lines, undo };
}

export function currentMarkdown(): string {
  return findCmView()?.state.doc.toString() ?? '';
}
