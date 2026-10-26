import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * White-label branding: set BRAND_NAME (and optionally BRAND_SHORT / BRAND_INITIALS) in .env and every
 * "Exora Prime" / "Exora" / "EXORA" in the UI is replaced at build/dev time. No source edits needed.
 */
function brandPlugin(): Plugin {
  const name = (process.env.BRAND_NAME || '').trim();
  const short = (process.env.BRAND_SHORT || name.split(/\s+/)[0] || '').trim();
  const rest = name.split(/\s+/).slice(1).join(' ').toUpperCase();
  const initials = (process.env.BRAND_INITIALS || short.slice(0, 2)).toUpperCase();
  const active = !!name && name !== 'Exora Prime';
  const apply = (code: string) =>
    code
      .replace(/>(\s*)PRIME(\s*)</g, `>$1${rest}$2<`)
      .replace(/EXORA PRIME/g, name.toUpperCase())
      .replace(/Exora Prime/g, name)
      .replace(/ExoraPrime/g, name.replace(/\s+/g, ''))
      .replace(/EXORA/g, short.toUpperCase())
      .replace(/Exora/g, short)
      .replace(/>(\s*)EX(\s*)</g, `>$1${initials}$2<`);
  return {
    name: 'brand',
    enforce: 'pre',
    transform(code, id) {
      if (!active || id.includes('node_modules') || !/\/src\/.*\.(tsx?|css)$/.test(id.split('?')[0])) return null;
      return { code: apply(code), map: null };
    },
    transformIndexHtml: (html) => (active ? apply(html) : html),
  };
}

export default defineConfig(() => {
  return {
    plugins: [brandPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
