# 開発ログ

## 名前詐欺スパイクへの作り直し

元の `growi-plugin-visual-editor` は名前だけで、中身は
`console.log('Growi Visual Editor Plugin loaded!')` と、どこからも呼ばれない
`createVisualEditor()` があるだけだった。dist は TipTap 一式で 347KB あるのに
実行されるのはログ 1 行。

ビジュアルエディタ本体を書く前に、GROWI script プラグインの制約下で
方式が成立するか検証するスパイクに置き換えた。

## ハマった箇所

### GROWI はエントリファイル名を `client-entry.tsx` で決め打ちしている

最初 `client-entry.ts`(JSX 不使用なので x なし)で作ったら、ビルドも
プラグイン登録も通るのに **編集画面でスクリプトが一切読み込まれなかった**。
コンソールには他プラグイン(calendar)の `activated!` しか出ない。

原因は GROWI 本体:

```
apps/app/src/features/growi-plugin/server/services/growi-plugin/growi-plugin.ts
  const href = `.../dist/${manifest['client-entry.tsx'].file}`;
```

vite manifest のキーはエントリのパス(`client-entry.ts`)そのまま。
GROWI 側は `client-entry.tsx` をハードコードで引くので、`.ts` だと
`manifest['client-entry.tsx']` が undefined → `.file` で例外 → try/catch に
飲まれて "Failed to retrieve plugin manifest" の warn だけ残り、
プラグインは黙って無効化される。

→ **エントリは必ず `client-entry.tsx`**。CSS も同じキーの `.css` で引かれるので、
スタイルは JS からの `<style>` 注入ではなくエントリで CSS を import して
manifest に `css` を載せる。

## 検証結果 (2026-08-30)

実機(wiki.butsuri-kori.club、本文 1866 文字のトップページ)で 3 点を確認:

| # | 結果 | 詳細 |
|---|---|---|
| 1 CM6 到達 | **OK** | `.cm-content.cmTile.root.view` で EditorView 取得。1866 文字読めた |
| 3 書き戻し | **OK** | `view.dispatch` でプレビュー右ペインが即更新 |
| 2 Markdown 往復 | **NG(想定内)** | `prosemirror-markdown` の *デフォルト* schema が貧弱で全崩れ |

往復で壊れた内訳:
- `:::important` `:::milestone` `:::wiki-gap-suggestions` などの `:::` コンテナ記法
  (remark-directive)を理解できず、1 段落に潰す
- GFM タスクリスト `- [x]` を認識できず `* \[x\]` にエスケープ
- 箇条書き `-` を `*` に変換、行末に不要な `\` ハードブレーク付与
- `:tada:` 等の emoji ショートコードは素通り(これは実害小)

→ 往復問題は「デフォルト schema が GROWI の Markdown 方言に対応していない」
だけで、方式の否定ではない。ただし **GROWI 独自の `:::xxx` ブロックや生 HTML は
リッチノードに変換せず、不透明ブロック(表示は read-only カード + 「ソース編集」)
として byte 保存する** のが唯一安全。WYSIWYG 対象は素の散文
(見出し / 太字 / リンク / リスト / 表 / コード / 引用 / 画像)に絞る。

## 次の実装方針

- CM6 を正とし、WYSIWYG は「別ビュー」。トグルで切替
- パーサ/シリアライザは GROWI の remark 設定(GFM + directive)に合わせて自作
  もしくは `tiptap-markdown`(markdown-it ベース、GFM 対応、カスタム block 登録可)
- `:::` ブロック・未知 HTML = atomic なソース保持ノード
- 同期は full-doc replace で MVP。将来は差分置換して CM の undo 履歴を保つ

## v0.1 実装 (2026-08-30)

散文だけ WYSIWYG、GROWI 独自記法は不透明ブロック、という方針で実装。

### 構成

```
client-entry.tsx        styles 読込 + activator 登録 + initToggle()
src/toggle.ts           編集画面に「ビジュアル/ソース」切替ボタン。
                        ビジュアル中は .cm-editor を display:none にして
                        隣に WYSIWYG を挿入。CM6 を常に正とし全文置換で書き戻す
src/cmBridge.ts         CM6 EditorView 探索 / 読み書き
src/markdown/
  schema.ts             schema-basic + list + s マーク + code_block params
                        + list_item.checked + source_block(不透明ノード)
  sourceBlockRules.ts   markdown-it: :::／:: ディレクティブ・パイプテーブルを
                        ve_source トークンとして丸ごと確保
  taskListRule.ts       markdown-it core: - [ ] / - [x] を list_item.checked に
  parser.ts             MarkdownParser (veSchema 用トークンマップ)
  serializer.ts         MarkdownSerializer。箇条書きは "-"、タスクは "- [x] "、
                        source_block は生ソースをそのまま書き戻し
src/editor/
  visualEditor.ts       EditorState/View 組み立て、debounce 400ms で onChange
  toolbar.ts            H1-3/P, B/I/S/code, リスト, タスク, 引用, コード, リンク
  keymap.ts             Mod-b 等 + リスト操作 + baseKeymap
  inputRules.ts         "# " "- " "> " "1. " "``` " など
  sourceBlockView.ts    不透明ブロックのカード UI(「ソース編集」で textarea)
```

### 往復テスト結果 (src/_selftest.ts, esbuild でバンドルして node 実行)

directive / table / html / tasklist は **byte 安定**。
prose のみ差分 1 件: `> 行1\n> 行2` が `> 行1 行2` に結合される
(Markdown のソフトラップ正規化。レンダリング結果は同一)。許容。

### 既知の制約

- テーブルは source_block 編集のみ(リッチ表編集は将来)
- ソフトラップは 1 行に結合される
- ビジュアル→CM は全文置換なので CM の undo 履歴が 1 ステップに潰れる
- 協調編集(Yjs)モードは未検証
- ビジュアル中の CM 外部変更は取り込まない(入場時スナップショット)

## GROWI はプラグインをビルドしない

サーバ側は git clone した中の `dist/` と `dist/.vite/manifest.json` を
そのまま配信するだけ。`dist/` はコミットして push、管理画面で「更新」。
ローカル `pnpm build` だけでは反映されない。

### pnpm 11 + esbuild の ignored builds で `pnpm build` が落ちる

`pnpm-workspace.yaml` に `onlyBuiltDependencies: [esbuild]` と
`verifyDepsBeforeRun: false` を入れて回避。
