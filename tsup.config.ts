import { defineConfig } from 'tsup';
import fs from 'fs-extra';
import path from 'path';

export default defineConfig({
  entry: ['src/cli/index.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'node18',
  async onSuccess() {
    // Copy resources to dist/ (for bundled distribution)
    const resourcesSource = path.join(process.cwd(), 'resources');
    const resourcesTarget = path.join(process.cwd(), 'dist/resources');

    if (await fs.pathExists(resourcesSource)) {
      await fs.copy(resourcesSource, resourcesTarget);
      console.log('✓ Copied resources to dist/');
    }
  },
});
