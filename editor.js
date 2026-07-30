import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export function createVisualEditor(elementId, initialContent, onUpdate) {
  const editor = new Editor({
    element: document.querySelector(elementId),
    extensions: [
      StarterKit,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      // エディタの内容が変更されたら、裏側のMarkdown（またはHTML）に変換して親に伝える
      const html = editor.getHTML();
      onUpdate(html);
    },
  });

  return editor;
}