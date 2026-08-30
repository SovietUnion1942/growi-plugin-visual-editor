/**
 * markdown-it プラグイン。
 * GROWI 独自の `:::`/`::` ディレクティブ、パイプテーブル、ブロック HTML を
 * リッチにパースせず「生ソースの塊」= `ve_source` トークンとして拾う。
 * これらは編集ビューで不透明ブロック(source_block)になる。
 */

import type MarkdownIt from 'markdown-it';
import type { RuleBlock } from 'markdown-it/lib/parser_block.mjs';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';

const TABLE_SEP = /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

function emit(state: StateBlock, from: number, to: number, kind: string): void {
  const raw = state.getLines(from, to, state.blkIndent, false).replace(/\n+$/, '');
  const token = state.push('ve_source', '', 0);
  token.content = raw;
  token.map = [from, to];
  token.block = true;
  token.meta = { kind };
  state.line = to;
}

/** `:::name` ... `:::` （3 個以上のコロン）。閉じが無ければ本文末まで。 */
const container: RuleBlock = (state, startLine, endLine, silent) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;

  const line = state.src.slice(pos, max).trimEnd();
  const open = /^(:{3,})(.*)$/.exec(line);
  if (open == null) return false;
  if (silent) return true;

  const fence = open[1];
  let next = startLine + 1;
  for (; next < endLine; next++) {
    const p = state.bMarks[next] + state.tShift[next];
    const m = state.eMarks[next];
    const l = state.src.slice(p, m).trimEnd();
    if (new RegExp(`^:{${fence.length},}\\s*$`).test(l)) {
      next++; // 閉じ行を含める
      break;
    }
  }
  emit(state, startLine, Math.min(next, endLine), 'container');
  return true;
};

/** `::name[...]{...}` 単行のリーフディレクティブ。 */
const leafDirective: RuleBlock = (state, startLine, _endLine, silent) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;

  const line = state.src.slice(pos, max).trimEnd();
  if (!/^::[A-Za-z][A-Za-z0-9-]*/.test(line)) return false;
  if (/^:::/.test(line)) return false;
  if (silent) return true;

  emit(state, startLine, startLine + 1, 'directive');
  return true;
};

/** GFM パイプテーブル。2 行目が区切り行なら塊ごと拾う。 */
const pipeTable: RuleBlock = (state, startLine, endLine, silent) => {
  if (startLine + 1 >= endLine) return false;
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;

  const head = state.src.slice(
    state.bMarks[startLine] + state.tShift[startLine],
    state.eMarks[startLine],
  );
  if (!head.includes('|')) return false;

  const sep = state.src.slice(
    state.bMarks[startLine + 1] + state.tShift[startLine + 1],
    state.eMarks[startLine + 1],
  );
  if (!TABLE_SEP.test(sep) || !sep.includes('|')) return false;
  if (silent) return true;

  let next = startLine + 2;
  for (; next < endLine; next++) {
    if (state.isEmpty(next)) break;
    const l = state.src.slice(
      state.bMarks[next] + state.tShift[next],
      state.eMarks[next],
    );
    if (!l.includes('|')) break;
  }
  emit(state, startLine, next, 'table');
  return true;
};

export default function sourceBlockPlugin(md: MarkdownIt): void {
  md.block.ruler.before('fence', 've_container', container, {
    alt: ['paragraph', 'blockquote', 'list'],
  });
  md.block.ruler.before('fence', 've_leaf_directive', leafDirective, {
    alt: ['paragraph', 'blockquote', 'list'],
  });
  md.block.ruler.before('table', 've_pipe_table', pipeTable, {
    alt: ['paragraph', 'blockquote', 'list'],
  });
}
