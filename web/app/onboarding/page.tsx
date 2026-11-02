import {redirect} from 'next/navigation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {resolveWorkspace} from '@/server/auth/workspace';
import {OnboardingForm} from './setup-form';
export default async function Onboarding(){const workspace=await resolveWorkspace(await createSupabaseServerClient());if(!workspace)redirect('/login?next=/onboarding');if(workspace.profile.organization.id)redirect('/');return <OnboardingForm/>;}
