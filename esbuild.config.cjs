const esbuild = require('esbuild');
const fs = require('node:fs');

// Entry points that match the package.json exports
const entryPoints = [
  'src/licit/index.ts',
  'src/core/index.ts',
  'src/commands/index.ts',
  'src/utils/index.ts',
  'src/plugins/block-control/index.ts',
  'src/plugins/capco/index.ts',
  'src/plugins/change-case/index.ts',
  'src/plugins/citation/index.ts',
  'src/plugins/copy-images/index.ts',
  'src/plugins/custom-styles/index.ts',
  'src/plugins/export-pdf/index.ts',
  'src/plugins/floating-menu/index.ts',
  'src/plugins/glossary/index.ts',
  'src/plugins/highlight/index.ts',
  'src/plugins/info-icon/index.ts',
  'src/plugins/multimedia/index.ts',
  'src/plugins/object-id/index.ts',
  'src/plugins/paste-json/index.ts',
  'src/plugins/referencing/index.ts',
  'src/plugins/table-mods/index.ts',
  'src/plugins/vignette/index.ts',
];

const external = [
  // Peer
  '@tiptap/*',
  'orderedmap',
  'pagedjs',
  'prosemirror-*',
  'react',
  'react-*',
  // non-peer
  'axios',
  'browserkeymap',
  'classnames',
  'color',
  'font-awesome',
  'moment',
  'nullthrows',
  'prop-types',
  'resize-observer-polyfill',
  'smooth-scroll-into-view-if-needed',
  'tippy.js',
  'url',
  'uuid',
  'y-indexeddb',
  'y-protocols',
  'y-webrtc',
  'yjs',
];

// Build function
async function build() {
  try {
    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.mkdirSync('dist', { recursive: true });

    await esbuild.build({
      entryPoints,
      external,
      tsconfig: 'tsconfig.prod.json',
      outdir: 'dist',
      bundle: true,
      sourcemap: 'linked',
      platform: 'node',
      target: 'es2022',
      format: 'esm',
      jsx: 'automatic',
      jsxImportSource: 'react',
      logLevel: 'info',
    });

    console.log('✓ Build completed successfully');
  } catch (error) {
    console.error('✗ Build failed:', error);
    process.exit(1);
  }
}

build();
