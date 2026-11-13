// Story 029: the build the end-to-end suite runs against (vite preview of dist-e2e/). It is the production build
// plus DUMMY account settings, so the account screens show; the suite answers every Supabase call itself
// (tests/integration/fixtures.ts). These are not real credentials and reach no real project.
import { execSync } from 'node:child_process';

execSync('npx vite build --outDir dist-e2e --emptyOutDir', {
  stdio: 'inherit',
  env: { ...process.env, VITE_SUPABASE_URL: 'https://e2etest.supabase.co', VITE_SUPABASE_ANON_KEY: 'e2e-dummy-anon-key-not-a-real-project' },
});
