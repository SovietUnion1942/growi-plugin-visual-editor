import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

let tiptapEditor = null;
let isVisualMode = false;

// 初期化とDOM監視のメイン処理
const setupVisualEditor = () => {
  // GROWIのエディタツールバー（または親要素）を検出
  const targetArea = document.querySelector('.layout-root'); // または適切なGROWIのエディタ親要素
  if (!targetArea) return;

  // すでにボタンを追加済みの場合はスキップ
  if (document.getElementById('visual-editor-toggle-btn')) return;

  // 1. 切り替えボタンを挿入する
  injectToggleButton();
};

// 切替ボタンをUIに差し込む関数
const injectToggleButton = () => {
  // 適当なツールバーやヘッダー部分を探してボタンをねじ込む
  const toolbar = document.querySelector('.grw-editor-toolbar') || document.querySelector('header');
  if (!toolbar) return;

  const container = document.createElement('div');
  container.id = 'visual-editor-toggle-container';
  container.style.cssText = 'display: inline-flex; align-items: center; margin-left: 10px;';
  container.innerHTML = `
    <button id="visual-editor-toggle-btn" class="btn btn-sm btn-outline-secondary" type="button">
      モード切替: Markdown
    </button>
  `;
  toolbar.appendChild(container);

  document.getElementById('visual-editor-toggle-btn').addEventListener('click', toggleEditorMode);
};

// モードを切り替える本体の処理
const toggleEditorMode = () => {
  isVisualMode = !isVisualMode;
  const btn = document.getElementById('visual-editor-toggle-btn');

  // GROWI標準のMarkdownエディタ領域（Codemirror等）を取得
  const markdownEditorElem = document.querySelector('.CodeMirror') || document.querySelector('.cm-editor');
  
  // 自作のVisualエディタ用のコンテナ（なければ作成）
  let visualContainer = document.getElementById('my-tiptap-editor-root');
  if (!visualContainer) {
    visualContainer = document.createElement('div');
    visualContainer.id = 'my-tiptap-editor-root';
    visualContainer.style.cssText = 'display: none; border: 1px solid #ccc; min-height: 300px; padding: 15px; background: #fff;';
    
    // Markdownエディタのすぐ近くに差し込む
    if (markdownEditorElem && markdownEditorElem.parentNode) {
      markdownEditorElem.parentNode.insertBefore(visualContainer, markdownEditorElem.nextSibling);
    }

    // Tiptapのインスタンスを初期化
    tiptapEditor = new Editor({
      element: visualContainer,
      extensions: [StarterKit],
      content: '<p>Visual Editorへようこそ！</p>',
    });
  }

  if (isVisualMode) {
    // 【Visualモードに切り替え】
    btn.textContent = 'モード切替: Visual';
    btn.classList.remove('btn-outline-secondary');
    btn.classList.add('btn-primary');

    if (markdownEditorElem) markdownEditorElem.style.display = 'none';
    visualContainer.style.display = 'block';

    // TODO: Markdown側からテキストを取得してTiptapに流し込む処理をここに書く
  } else {
    // 【Markdownモードに戻す】
    btn.textContent = 'モード切替: Markdown';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline-secondary');

    visualContainer.style.display = 'none';
    if (markdownEditorElem) markdownEditorElem.style.display = 'block';

    // TODO: TiptapのHTMLや中身をMarkdownに変換してGROWIの入力欄に書き戻す処理をここに書く
  }
};

// GROWIはページ遷移が多いため、定期的にDOMを監視してボタンを維持する
const observer = new MutationObserver(() => {
  if (window.location.pathname.includes('/edit')) {
    setupVisualEditor();
  }
});
observer.observe(document.body, { childList: true, subtree: true });