# growi-plugin-visual-editor

GROWI にビジュアル(WYSIWYG)エディタを載せられるか検証するための **技術検証スパイク**。
まだビジュアルエディタ本体は入っていない。

## なぜスパイクから始めるか

GROWI の script プラグインが触れるのは `window.growiFacade`(`markdownRenderer` と `react` のみ)
と `window.pluginActivators` だけ。エディタを差し替える公式フックは無い。
そのため「編集画面の CodeMirror6 に DOM 経由で割り込み、Markdown を相互変換して同期する」
方式しか取れず、その方式が実機で成立するかを先に確かめる。

## 検証したい 3 点

| # | 確認内容 | 崩れたら |
|---|---|---|
| 1 | 編集画面の CM6 `EditorView` に DOM 経由で到達できる（`.cm-content` の expando 経由） | 別の同期手段(input イベント模倣等)を検討 |
| 2 | Markdown → ProseMirror doc → Markdown の往復で本文が壊れない | ビジュアル対応記法を絞る / 独自記法はロック |
| 3 | CM6 へ書き戻した変更を GROWI(プレビュー・自動保存)が拾う | dispatch 以外の反映経路が必要 |

## 使い方

```bash
pnpm install
pnpm build   # dist/ に出力
```

`dist/` を GROWI の管理画面からプラグイン登録 → 編集画面を開くと右下に検証パネルが出る。
「1. CM6検出」「2. Markdown往復」「3. 書き戻し」を順に押し、結果を DEVLOG に記録する。
書き戻しテストは無害な HTML コメント行を追記するだけで、もう一度押せば取り消せる。

## 構成

```
client-entry.ts   activator 登録 + 編集画面検出でパネルをマウント
src/panel.ts      検証用フローティングパネル(素の DOM、React 非依存)
src/spike.ts      3 点の検証ロジック本体
```
