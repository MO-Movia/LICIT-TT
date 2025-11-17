// @ts-check
import * as esbuild from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('./dist', { recursive: true, force: true });
const prod = process.env.NODE_ENV === 'production';
await esbuild.build({
  entryPoints: ['src/**/index.ts'],
  external: [
    'axios',
    'classnames',
    'color',
    'pagedjs',
    'prosemirror-*',
    'smooth-scroll-into-view-if-needed',
    'resize-observer-polyfill',
    'uuid',
    '@modusoperandi/color-picker',
    '@tiptap/*',
    'prop-types',
    'react',
    'react-*',
    'y-*',
    'yjs',
    'font-awesome/*',
  ], //don't bundle any dependencies
  bundle: true,
  format: 'esm',
  loader: {
    '.ttf': 'dataurl',
  },
  minify: prod,
  outdir: 'dist',
  sourcemap: !prod,
  splitting: prod,
  target: ['chrome142', 'edge142', 'firefox144', 'safari26'],
  treeShaking: !prod,
});
