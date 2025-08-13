import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: 'content.js',
    output: {
      file: 'dist/content.js',
      format: 'iife',
    },
    plugins: [
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs(),
      copy({
        targets: [
          {
            src: [
              'manifest.json', 
              'background.js', 
              'popup.html', 
              'popup.js', 
              'popup.css',
              'content-styles.css',
              'test.html',
              'test.js',
              'icons'
            ],
            dest: 'dist'
          }
        ]
      })
    ]
  },
  {
    input: 'popup.js',
    output: {
      file: 'dist/popup.js',
      format: 'iife',
    },
    plugins: [
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs()
    ]
  }
];