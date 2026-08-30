/** GROWI 編集画面の CodeMirror6 EditorView との橋渡し。 */

export type CmView = {
  state: {
    doc: { length: number; toString(): string };
    selection: unknown;
  };
  dispatch(spec: unknown): void;
  dom: HTMLElement;
  focus(): void;
};

function getCmInternal(el: Element | null): any {
  if (el == null) return null;
  const anyEl = el as any;
  return anyEl.cmTile ?? anyEl.cmView ?? null;
}

function resolveView(internal: any): any {
  if (internal == null) return null;
  const candidates = [
    internal.root?.view,
    internal.rootView?.view,
    internal.view,
    internal.editorView,
  ];
  for (const v of candidates) {
    if (v && typeof v.dispatch === 'function' && v.state?.doc) return v;
  }
  return null;
}

/** 表示中の本文エディタ(コメント欄などは除く)の EditorView を返す。 */
export function findMainCmView(): CmView | null {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('.cm-editor'));
  for (const root of roots) {
    if (root.offsetParent === null && root.getClientRects().length === 0) continue;
    // コメントエディタを避ける: ページエディタは .page-editor / .cm-editor-main 配下
    if (root.closest('.comment-form, .page-comment')) continue;
    const content = root.querySelector('.cm-content');
    const view = resolveView(getCmInternal(content)) ?? resolveView(getCmInternal(root));
    if (view) return view as CmView;
  }
  return null;
}

/** .cm-editor 要素そのもの(表示/非表示の切替対象)。 */
export function findMainCmEditorEl(): HTMLElement | null {
  return (findMainCmView()?.dom as HTMLElement) ?? null;
}

export function readMarkdown(view: CmView): string {
  return view.state.doc.toString();
}

/** 全文置換で書き戻す。内容が同じなら何もしない。 */
export function writeMarkdown(view: CmView, markdown: string): boolean {
  const current = view.state.doc.toString();
  if (current === markdown) return false;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: markdown },
  });
  return true;
}
