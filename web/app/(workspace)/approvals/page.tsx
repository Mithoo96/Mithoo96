import {notFound} from 'next/navigation';
import {getWorkspaceForRoute} from '@/server/auth/modules';
export default async function Unavailable(){await getWorkspaceForRoute('/approvals');notFound();}
