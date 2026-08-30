import MarkdownIt from 'markdown-it';
import { MarkdownParser } from 'prosemirror-markdown';
import type Token from 'markdown-it/lib/token.mjs';

import { veSchema } from './schema';
import sourceBlockPlugin from './sourceBlockRules';
import taskListPlugin from './taskListRule';

const md = MarkdownIt('commonmark', { html: true, linkify: false })
  .enable(['strikethrough'])
  .disable(['table']) // パイプテーブルは ve_pipe_table が source_block として拾う
  .use(sourceBlockPlugin)
  .use(taskListPlugin);

// インライン HTML はリッチ化せず素のテキストとして残す
md.inline.ruler.disable('html_inline');

const listItemAttrs = (tok: Token) => {
  const v = tok.attrGet('data-checked');
  return { checked: v == null ? null : v === 'true' };
};

export const parser = new MarkdownParser(veSchema, md, {
  blockquote: { block: 'blockquote' },
  paragraph: { block: 'paragraph' },
  list_item: { block: 'list_item', getAttrs: listItemAttrs },
  bullet_list: { block: 'bullet_list', getAttrs: (tok) => ({ tight: tok.hidden }) },
  ordered_list: {
    block: 'ordered_list',
    getAttrs: (tok) => ({
      order: +(tok.attrGet('start') ?? 1),
      tight: tok.hidden,
    }),
  },
  heading: {
    block: 'heading',
    getAttrs: (tok) => ({ level: +tok.tag.slice(1) }),
  },
  code_block: { block: 'code_block', noCloseToken: true },
  fence: {
    block: 'code_block',
    getAttrs: (tok) => ({ params: tok.info || '' }),
    noCloseToken: true,
  },
  hr: { node: 'horizontal_rule' },
  image: {
    node: 'image',
    getAttrs: (tok) => ({
      src: tok.attrGet('src'),
      title: tok.attrGet('title') || null,
      alt: (tok.children?.[0] && tok.children[0].content) || null,
    }),
  },
  hardbreak: { node: 'hard_break' },

  ve_source: {
    node: 'source_block',
    getAttrs: (tok) => ({ source: tok.content, kind: tok.meta?.kind ?? 'raw' }),
    noCloseToken: true,
  },
  html_block: {
    node: 'source_block',
    getAttrs: (tok) => ({ source: tok.content.replace(/\n$/, ''), kind: 'html' }),
    noCloseToken: true,
  },

  em: { mark: 'em' },
  strong: { mark: 'strong' },
  s: { mark: 's' },
  link: {
    mark: 'link',
    getAttrs: (tok) => ({
      href: tok.attrGet('href'),
      title: tok.attrGet('title') || null,
    }),
  },
  code_inline: { mark: 'code', noCloseToken: true },
});

export function markdownToDoc(markdown: string) {
  return parser.parse(markdown) ?? veSchema.node('doc', null, [veSchema.node('paragraph')]);
}
