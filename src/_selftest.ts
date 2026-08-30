/* 手動実行用: Markdown 往復テスト。UI に組み込む前にパイプラインを検証する。 */
import { markdownToDoc } from './markdown/parser';
import { docToMarkdown } from './markdown/serializer';

const SAMPLES: Record<string, string> = {
  prose: `# 見出し1

これは **太字** と *斜体* と ~~打ち消し~~ と \`コード\` と [リンク](https://example.com) を含む段落です。

## 見出し2

- 箇条書き1
- 箇条書き2
  - ネスト

1. 番号1
2. 番号2

> 引用文
> 続き

\`\`\`js
const x = 1;
\`\`\`

---
`,
  tasklist: `- [x] 要件定義
- [x] 設計
- [ ] 検証
- [ ] リリース
`,
  directive: `:::important
正式リリースされてやった～！

いい加減にしてほしいですね。
:::

### 新アップデート進捗

:::milestone{title="v3.1 リリース"}
- [x] 要件定義
- [x] 設計
:::

::progress[開発]{value=75 max=100}

:::wiki-gap-suggestions
:::
`,
  html: `<p class="text-bg-success">正式リリース！</p>

通常の段落。
`,
  table: `| 記法 | 見た目 |
|---|---|
| \`::progress\` | バー |
| \`:::milestone\` | チェックリスト |

あとがき。
`,
};

const norm = (s: string) => s.replace(/\s+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

let failures = 0;
for (const [name, src] of Object.entries(SAMPLES)) {
  console.log(`\n===== ${name} =====`);
  let out: string;
  try {
    const doc = markdownToDoc(src);
    out = docToMarkdown(doc);
  } catch (e) {
    console.log('THREW:', e);
    failures++;
    continue;
  }
  if (norm(src) === norm(out)) {
    console.log('OK (round-trip stable)');
  } else {
    failures++;
    console.log('DIFF:');
    const a = norm(src).split('\n');
    const b = norm(out).split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.log(`  - ${JSON.stringify(a[i] ?? '(none)')}`);
        console.log(`  + ${JSON.stringify(b[i] ?? '(none)')}`);
      }
    }
  }
}
console.log(`\n${failures === 0 ? 'ALL OK' : failures + ' sample(s) differ'}`);
