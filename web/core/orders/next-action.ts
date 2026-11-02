import type {OrderStatus} from './state-machine';

/** Presentation of the existing lifecycle; never authorizes or executes transitions. */
export function orderNextAction(status:OrderStatus){
 switch(status){
 case 'NEW':return {instruction:'Review the products and recorded order details, then verify the order to prepare fulfillment.',responsibility:'Owner or manager'};
 case 'VERIFIED':return {instruction:'Record the genuine shipping label and matching tracking, then choose who will pack this order. Saving creates the existing fulfillment task.',responsibility:'Owner or manager'};
 case 'READY_TO_PACK':return {instruction:'Assign an eligible employee, then have them open their guided packing task in Work.',responsibility:'Assigned packer'};
 case 'PACKING':case 'LABEL_READY':return {instruction:'The assigned packer must count the items and scan the matching label in the guided workflow. Required package evidence cannot be skipped.',responsibility:'Assigned packer'};
 case 'PACKED':return {instruction:'The assigned packer must upload the required genuine package photo, confirm the package and submit for verification.',responsibility:'Assigned packer'};
 case 'AWAITING_VERIFICATION':return {instruction:'Complete the independent package review. The person who packed the order cannot approve their own work.',responsibility:'Independent owner or manager'};
 case 'READY_TO_SHIP':return {instruction:'The verified package is ready for handoff. Shipment requires recorded carrier proof or the existing authorized manual confirmation.',responsibility:'Owner or manager'};
 case 'SHIPPED':return {instruction:'Monitor recorded tracking. Delivery requires genuine provider proof or the existing authorized manual confirmation.',responsibility:'Owner or manager'};
 case 'DELIVERED':return {instruction:'Delivery is recorded. Review the operational timeline for its provenance.',responsibility:'No further packing action'};
 case 'CANCELLED':return {instruction:'This order is cancelled. No fulfillment action is available.',responsibility:'No further packing action'};
 }
}
