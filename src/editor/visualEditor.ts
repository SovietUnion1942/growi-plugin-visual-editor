import { baseKeymap } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import { markdownToDoc } from '../markdown/parser';
import { veSchema } from '../markdown/schema';
import { docToMarkdown } from '../markdown/serializer';
import { buildInputRules } from './inputRules';
import { buildKeymap } from './keymap';
import { SourceBlockView } from './sourceBlockView';
import { buildToolbar } from './toolbar';

export type VisualEditorHandle = {
  destroy(): void;
  getMarkdown(): string;
  focus(): void;
};

export function createVisualEditor(
  mount: HTMLElement,
  markdown: string,
  onChange: (markdown: string) => void,
  debounceMs = 400,
): VisualEditorHandle {
  mount.classList.add('ve-root');
  mount.replaceChildren();

  const toolbar = buildToolbar(veSchema);
  const editorHost = document.createElement('div');
  editorHost.className = 've-editor-host';
  mount.append(toolbar.dom, editorHost);

  const state = EditorState.create({
    doc: markdownToDoc(markdown),
    plugins: [
      buildInputRules(veSchema),
      keymap(buildKeymap(veSchema)),
      keymap(baseKeymap),
      dropCursor(),
      gapCursor(),
      history(),
    ],
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    onChange(docToMarkdown(view.state.doc));
  };

  const view = new EditorView(editorHost, {
    state,
    nodeViews: {
      source_block: (node, v, getPos) => new SourceBlockView(node, v, getPos),
    },
    dispatchTransaction(tr) {
      const next = view.state.apply(tr);
      view.updateState(next);
      toolbar.update(view);
      if (tr.docChanged) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, debounceMs);
      }
    },
  });
  toolbar.update(view);

  return {
    destroy() {
      if (timer) clearTimeout(timer);
      view.destroy();
    },
    getMarkdown() {
      return docToMarkdown(view.state.doc);
    },
    focus() {
      view.focus();
    },
  };
}
