// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {resolvePermissions,type OrgRole} from '@/core/tenancy/permissions';
import OrderDetail from '@/app/(workspace)/orders/[id]/page';
const mock=vi.hoisted(()=>({role:'OWNER' as string,management:vi.fn(),detail:vi.fn()}));
vi.mock('@/server/auth/modules',()=>({getWorkspaceForRoute:async()=>({client:{},workspace:{profile:{viewer:{role:mock.role,userId:'viewer'},organization:{id:'org',enabledModules:['CORE','COMMERCE','SHIPPING','TEAM'],timezone:'UTC'}},extraPermissions:[]}})}));
vi.mock('@/server/adapters/fulfillment',()=>({getSessionOrderDetail:(...args:unknown[])=>mock.detail(...args),getSessionEmployees:async()=>[],fulfillmentScope:()=>({permissions:resolvePermissions(mock.role as OrgRole)})}));
vi.mock('@/server/adapters/order-management',()=>({getOrderManagement:(...args:unknown[])=>mock.management(...args)}));
vi.mock('@/server/actions/operational-orders',()=>({operationalOrderAction:vi.fn()}));
vi.mock('@/components/fulfillment/refresh-alerts',()=>({RefreshAlerts:()=>null}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()}),notFound:()=>{throw Error('NOT_FOUND');}}));
afterEach(cleanup);beforeEach(()=>{vi.resetAllMocks();mock.role='OWNER';mock.management.mockRejectedValue(Error('Optional context unavailable'));mock.detail.mockResolvedValue({order:{id:'order',order_number:'TEST ONLY',status:'NEW',channel:'MANUAL',ship_by_at:null},items:[],tasks:[],shipments:[],labels:[],exceptions:[],approvals:[],timeline:[]});});
for(const role of ['OWNER','MANAGER'])it(`${role} receives the NEW next action even when auxiliary information fails`,async()=>{mock.role=role;render(await OrderDetail({params:Promise.resolve({id:'order'})}));expect(screen.getByRole('heading',{name:'Next Action'})).toBeTruthy();expect(screen.getByRole('button',{name:'Verify Order / Start Fulfillment'})).toBeTruthy();});
it('does not give an employee owner actions or load management-only customer context',async()=>{mock.role='EMPLOYEE';render(await OrderDetail({params:Promise.resolve({id:'order'})}));expect(screen.queryByRole('button',{name:'Verify Order / Start Fulfillment'})).toBeNull();expect(mock.management).not.toHaveBeenCalled();expect(screen.getByRole('heading',{name:'Next Action'})).toBeTruthy();});
