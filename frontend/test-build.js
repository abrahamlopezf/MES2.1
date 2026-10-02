import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    await build({
      entryPoints: [path.resolve(__dirname, 'src/main.jsx')],
      bundle: true,
      outdir: 'dist',
      external: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'lucide-react', 'axios', 'sonner', 'zustand', 'react-hook-form', '@hookform/resolvers/zod', 'zod', 'clsx', 'tailwind-merge', 'date-fns'],
      loader: { '.jsx': 'jsx', '.tsx': 'tsx', '.js': 'jsx', '.ts': 'ts' },
      logLevel: 'info',
    });
    console.log('ESBuild successful');
  } catch (err) {
    console.error('ESBuild failed', err);
  }
}

run();
