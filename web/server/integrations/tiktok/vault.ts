import 'server-only';
import type {Db} from '@/server/db/client';
/** Only Vault operations elevate the server connection role. All business queries resume mbos_app with the verified user's claims; never grant Vault access to API roles. */
async function vault<T>(db:Db,fn:()=>Promise<T>):Promise<T>{await db.query('SET LOCAL ROLE NONE');try{return await fn();}finally{await db.query('SET LOCAL ROLE mbos_app');}}
export async function putPrivateSecret(db:Db,name:string,value:string){return vault(db,async()=>{
 await db.query("delete from vault.secrets where name like 'MBOS_TIKTOK_STATE_%' and created_at < now()-interval '10 minutes'");
 await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[name]);
 const existing=await db.maybeOne<{id:string}>('select id from vault.secrets where name=$1 for update',[name]);
 if(existing){await db.query('select vault.update_secret($1::uuid,$2::text)',[existing.id,value]);return existing.id;}
 return (await db.one<{id:string}>('select vault.create_secret($1::text,$2::text,$3::text) id',[value,name,'Mithoo server-only TikTok authorization'])).id;
 });}
export async function takePrivateState(db:Db,name:string){return vault(db,async()=>{
 const row=await db.maybeOne<{id:string}>('select id from vault.secrets where name=$1 for update',[name]);if(!row)return null;
 const value=await db.one<{decrypted_secret:string}>('select decrypted_secret from vault.decrypted_secrets where id=$1',[row.id]);
 await db.query('delete from vault.secrets where id=$1',[row.id]);return value.decrypted_secret;
 });}
