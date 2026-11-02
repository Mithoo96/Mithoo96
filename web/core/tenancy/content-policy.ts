import type {OrganizationModule} from './modules';
// Policy only. Business-specific copy/templates stay server-side until authorized.
export const CREATE_TOOLS=['social','email','ad','campaign'] as const;
export type CreateTool=typeof CREATE_TOOLS[number];
export const CREATE_PRESET_POLICY:Record<string,{modules:readonly OrganizationModule[];tool:CreateTool;available:boolean}>={
 'product-promotion':{modules:['CORE','COMMERCE'],tool:'campaign',available:true},
 'tiktok-shop':{modules:['CORE','COMMERCE','TIKTOK_SHOP'],tool:'campaign',available:true},
 'product-launch':{modules:['CORE','COMMERCE'],tool:'campaign',available:true},
 'customer-follow-up':{modules:['CORE','COMMERCE'],tool:'email',available:true},
 'abandoned-cart':{modules:['CORE','COMMERCE'],tool:'email',available:false},
 'promote-tax':{modules:['CORE','CRM','CLIENTS','TAX'],tool:'campaign',available:true},
 'tax-season':{modules:['CORE','CRM','CLIENTS','TAX'],tool:'campaign',available:true},
 'promote-life':{modules:['CORE','CRM','CLIENTS','INSURANCE'],tool:'campaign',available:true},
 'life-leads':{modules:['CORE','CRM','CLIENTS','INSURANCE'],tool:'campaign',available:true},
 'reactivation':{modules:['CORE','CRM','CLIENTS'],tool:'campaign',available:true},
};
