# growi-plugin-visual-editor

GROWI の編集画面に **ビジュアル(WYSIWYG)編集** を追加する script プラグイン。

編集画面の左下に出る「✏️ ビジュアル編集」ボタンで、CodeMirror の Markdown 編集と
ProseMirror ベースのビジュアル編集を行き来できる。Markdown 本文(CodeMirror)を
常に正とし、ビジュアル側の変更は全文置換で書き戻すので、GROWI の保存・プレビュー・
自動保存はそのまま動く。

## 方針

- WYSIWYG で扱うのは素の散文: 見出し / 太字・斜体・打ち消し・コード / リンク /
  箇条書き・番号リスト・GFM タスクリスト / 引用 / コードブロック / 画像 / 水平線
- GROWI 独自の `:::` `::` ディレクティブ、パイプテーブル、ブロック HTML は
  **リッチ変換せず**「ソースそのまま」の不透明ブロックとして表示し、
  カードの「ソース編集」で直接編集する(= 壊さない)

## ビルド

```bash
pnpm install
pnpm build   # dist/ に出力(コミット対象)
```

GROWI 側は GitHub リポジトリの `dist/` をそのまま配信する。変更したら
コミット & push → 管理画面 → プラグイン → 「更新」。

## 構成 / 経緯

[DEVLOG.md](./DEVLOG.md) 参照。往復テストは `src/_selftest.ts`。
