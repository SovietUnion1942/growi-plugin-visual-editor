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

## GROWI はプラグインをビルドしない

サーバ側は git clone した中の `dist/` と `dist/.vite/manifest.json` を
そのまま配信するだけ。`dist/` はコミットして push、管理画面で「更新」。
ローカル `pnpm build` だけでは反映されない。

### pnpm 11 + esbuild の ignored builds で `pnpm build` が落ちる

`pnpm-workspace.yaml` に `onlyBuiltDependencies: [esbuild]` と
`verifyDepsBeforeRun: false` を入れて回避。
