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

### GROWI はプラグインをビルドしない

サーバ側は git clone した中の `dist/` と `dist/.vite/manifest.json` を
そのまま配信するだけ。`dist/` はコミットして push、管理画面で「更新」。
ローカル `pnpm build` だけでは反映されない。

### pnpm 11 + esbuild の ignored builds で `pnpm build` が落ちる

`pnpm-workspace.yaml` に `onlyBuiltDependencies: [esbuild]` と
`verifyDepsBeforeRun: false` を入れて回避。
