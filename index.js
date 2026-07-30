import { createVisualEditor } from './editor.js';

// GROWIのプラグイン機構に向けたエントリーポイント
if (typeof window !== 'undefined') {
  // GROWIの画面が読み込まれたタイミングでフックする処理
  window.addEventListener('DOMContentLoaded', () => {
    console.log('Growi Visual Editor Plugin loaded!');
    
    // ※今後、GROWIのエディタ領域（テキストエリア等）を検出して
    // ここで createVisualEditor('#editor-element-id', initialContent, (html) => { ... })
    // を呼び出し、ビジュアルエディタに置き換える処理を繋ぎ込んでいきます。
  });
}