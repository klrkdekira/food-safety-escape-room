import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { generateQuizManifest } from './tools/gen-manifest.ts';

function quizManifestPlugin(): Plugin {
  return {
    name: 'quiz-manifest-plugin',
    buildStart() {
      generateQuizManifest();
    },
    handleHotUpdate({ file }) {
      if (file.includes('public/quizzes') && !file.endsWith('index.json')) {
        generateQuizManifest();
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), quizManifestPlugin()],
  build: {
    outDir: 'docs',
    // Clear stale hashed assets. Everything in docs/ is generated: the player
    // and author bundles here, then docs/offline/ by the gen-offline step that
    // `pnpm build` runs afterwards.
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: './index.html',
        author: './author/index.html',
      },
    },
  },
});
