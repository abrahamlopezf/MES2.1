import { build } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBuild() {
  try {
    await build({
      root: __dirname,
    });
    console.log('Build successful!');
  } catch (e) {
    console.error('Build failed!', e);
  }
}

runBuild();
