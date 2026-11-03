// @vitest-environment jsdom
import {createElement} from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {OrderOperations} from '@/components/fulfillment/order-operations';
import {orderNextAction} from '@/core/orders/next-action';
import {ORDER_STATUSES} from '@/core/orders/state-machine';
import type {OrderManagement} from '@/server/adapters/order-management';
const mock=vi.hoisted(()=>({action:vi.fn(),refresh:vi.fn()}));
vi.mock('@/server/actions/operational-orders',()=>({operationalOrderAction:mock.action}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:mock.refresh})}));
afterEach(cleanup);beforeEach(()=>vi.resetAllMocks());
const base={orderId:'order-1',userId:'owner-1',employees:[{id:'employee-1',display_name:'Test packer',full_name:null}],tasks:[]};
const data:OrderManagement={details:{test_only:'false',external_order_id:'MANUAL-1',total_amount:null,currency:null,notes:null,intake_shipping_method:null,intake_tracking:null},customer:null,confirmations:[]};
it('shows a primary NEW action for an ordinary manual order, without a test-only flag',async()=>{
 mock.action.mockResolvedValue({ok:true,data:{}});render(createElement(OrderOperations,{...base,status:'NEW',data}));
 expect(screen.getByRole('heading',{name:'Next Action'})).toBeTruthy();expect(screen.getByText('Current state: NEW')).toBeTruthy();expect(screen.getByText('Responsible: Owner or manager')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Verify Order / Start Fulfillment'}));await waitFor(()=>expect(mock.action).toHaveBeenCalledWith({orderId:'order-1',action:'verifyOrder'}));await waitFor(()=>expect(mock.refresh).toHaveBeenCalled());
});
it('never hides the primary action when optional customer/approval context is unavailable',()=>{render(createElement(OrderOperations,{...base,status:'NEW',data:null}));expect(screen.getByRole('button',{name:'Verify Order / Start Fulfillment'})).toBeTruthy();expect(screen.getByRole('alert').textContent).toContain('Additional order details');});
it('exposes real employee selection only at the verified shipping setup step and supplies no invented tracking',()=>{
 const ui=render(createElement(OrderOperations,{...base,status:'NEW',data}));expect(screen.queryByRole('combobox',{name:'Assign fulfillment'})).toBeNull();
 ui.rerender(createElement(OrderOperations,{...base,status:'VERIFIED',data}));expect(screen.getByRole('option',{name:'Test packer'})).toHaveProperty('value','employee-1');expect(screen.getByLabelText('Label tracking')).toHaveProperty('value','');expect(screen.getByLabelText('Label tracking')).toHaveProperty('required',true);expect(screen.queryByRole('button',{name:'Verify Order / Start Fulfillment'})).toBeNull();
});
it('points the assigned packer to the existing guided task without a completion shortcut',()=>{render(createElement(OrderOperations,{...base,userId:'employee-1',status:'PACKED',tasks:[{id:'task-1',status:'IN_PROGRESS',assigned_to:'employee-1',type:'PACK_ORDER'}],data}));expect(screen.getByRole('link',{name:'Open guided packing task'}).getAttribute('href')).toBe('/work/tasks/task-1');expect(screen.getByText(/genuine package photo/)).toBeTruthy();expect(screen.queryByRole('button',{name:/Complete|Mark shipped/})).toBeNull();});
it('does not show shipping confirmation before READY_TO_SHIP',()=>{render(createElement(OrderOperations,{...base,status:'PACKING',data}));expect(screen.queryByRole('button',{name:'Request manual confirmation'})).toBeNull();});
it('describes every existing lifecycle state without authorizing additional transitions',()=>{for(const status of ORDER_STATUSES){const next=orderNextAction(status);expect(next.instruction.length).toBeGreaterThan(10);expect(next.responsibility.length).toBeGreaterThan(3);}});

it('requires a fresh page after an interrupted/stale action and never retries the mutation',async()=>{
 mock.action.mockRejectedValue(new Error('Server Action was not found'));render(createElement(OrderOperations,{...base,status:'NEW',data}));
 const verify=screen.getByRole('button',{name:'Verify Order / Start Fulfillment'});fireEvent.click(verify);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Refresh order page'})).toBeTruthy());
 expect(screen.getByRole('status').textContent).toContain('No success is assumed');expect(verify).toHaveProperty('disabled',true);
 fireEvent.click(verify);expect(mock.action).toHaveBeenCalledTimes(1);expect(mock.refresh).not.toHaveBeenCalled();expect(screen.getByText('Current state: NEW')).toBeTruthy();
});
it('keeps structured validation failures distinct from a missing action response',async()=>{
 mock.action.mockResolvedValue({ok:false,error:{code:'GUARD_FAILED',message:'Order details need review'}});render(createElement(OrderOperations,{...base,status:'NEW',data}));
 fireEvent.click(screen.getByRole('button',{name:'Verify Order / Start Fulfillment'}));await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('Order details need review'));
 expect(screen.queryByRole('button',{name:'Refresh order page'})).toBeNull();expect(mock.refresh).not.toHaveBeenCalled();
});
