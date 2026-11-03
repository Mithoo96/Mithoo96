import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
it('uses the Vercel build identity for Next action and navigation version protection',async()=>{
 vi.stubEnv('VERCEL_DEPLOYMENT_ID','dpl_testbuild');const {default:config}=await import('../../next.config');
 expect(config.deploymentId).toBe('dpl_testbuild');expect(config.experimental?.serverActions).toEqual({bodySizeLimit:'16mb'});
 expect(config.outputFileTracingIncludes?.['/*']).toContain('./server/db/certs/supabase-staging-root.crt');
});
