/** Temporary, privacy-limited technical report. No credentials, identities or customer fields. */
export type OrderRenderInspection={
 revision:string;deployment:string;commit:string;authenticated:boolean;role:string;routeAllowed:boolean;
 coreEnabled:boolean;commerceEnabled:boolean;shippingEnabled:boolean;teamEnabled:boolean;
 canAssign:boolean;canOperate:boolean;ordersWrite:boolean;ordersTransition:boolean;eligibleEmployeeCount:number|null;renderOwnerActions:boolean;renderEmployeeActions:boolean;
 orderVisible:boolean;orderMatchesActiveOrganization:boolean;orderState:string|null;
};
