/** Safe Auth outcomes: never display upstream messages, identities or transport details. */
export function signupFailure(error:{code?:string;status?:number}){
 if(error.code==='over_email_send_rate_limit')return {rateLimited:true,message:'The confirmation email limit has been reached. No workspace was created. Please wait before retrying; repeated submissions will not resolve this limit.'};
 if(error.status===429)return {rateLimited:true,message:'Signup is temporarily rate limited. Please wait before retrying.'};
 if(error.code==='email_address_invalid')return {rateLimited:false,message:'Enter a valid email address that you control.'};
 if(error.code==='weak_password')return {rateLimited:false,message:'Choose a stronger password between 12 and 128 characters.'};
 if(error.code==='user_already_exists'||error.code==='email_exists')return {rateLimited:false,message:'Sign in if you already have an account. An unconfirmed account can retry confirmation after the email limit resets.'};
 return {rateLimited:false,message:'Account setup could not be completed. Try again shortly, or sign in if you already have an account.'};
}
