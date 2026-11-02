import 'server-only';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {resolveWorkspace} from '@/server/auth/workspace';
import {DomainError} from '@/core/errors';
export async function authorizationWorkspace(){const client=await createSupabaseServerClient();const workspace=await resolveWorkspace(client,(await cookies()).get('mithoo_workspace')?.value);if(!workspace?.profile.organization.id)throw new DomainError('UNAUTHENTICATED','Sign in to an active workspace');return {userId:workspace.profile.viewer.userId,organizationId:workspace.profile.organization.id};}
export function privateResponse(response:NextResponse){response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');response.headers.set('X-Content-Type-Options','nosniff');return response;}
