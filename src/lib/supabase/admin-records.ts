import 'server-only';
import { getSupabaseAdminClient } from './admin';

type Snapshot = { key:string|null; exists:()=>boolean; val:()=>any };
type Ref = { path:string[]; key:string|null; orderField?:string; equalValue?:unknown };
const snapshot=(key:string|null,value:any):Snapshot=>({key,exists:()=>value!==null&&value!==undefined,val:()=>value??null});
const split=(path:string)=>path.split('/').filter(Boolean);
const getNested=(value:any,path:string[])=>path.reduce((v,k)=>v==null?undefined:v[k],value);
function merge(target:any,patch:any):any {
  if(!patch||typeof patch!=='object'||Array.isArray(patch))return patch;
  const out=target&&typeof target==='object'&&!Array.isArray(target)?{...target}:{};
  for(const [key,value] of Object.entries(patch)) out[key]=value&&typeof value==='object'&&!Array.isArray(value)?merge(out[key],value):value;
  return out;
}
function setNested(target:any,path:string[],value:any):any {
  if(!path.length)return value;
  const out=target&&typeof target==='object'&&!Array.isArray(target)?{...target}:{};
  let cursor=out;
  for(let i=0;i<path.length-1;i++){const key=path[i];cursor[key]=cursor[key]&&typeof cursor[key]==='object'?{...cursor[key]}:{};cursor=cursor[key];}
  cursor[path[path.length-1]]=value;return out;
}
function ownerId(value:any):string|null {
  const id=value?.ownerId??value?.userId??value?.uid??value?.studentId??value?.createdBy;
  return typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,28}$/i.test(id)?id:null;
}
async function load(ref:Ref) {
  const [collection,id,...child]=ref.path;
  if(!collection) return {collection:'',id:'',child,data:null};
  const admin=getSupabaseAdminClient();
  let q=admin.from('academy_records').select('collection,record_id,owner_id,data').eq('collection',collection);
  if(id)q=q.eq('record_id',id);
  const {data,error}=await q;if(error)throw error;
  let rows=data||[];
  if(ref.equalValue!==undefined) rows=rows.filter((r:any)=>ref.orderField?getNested(r.data,[ref.orderField])===ref.equalValue:r.record_id===String(ref.equalValue));
  if(ref.orderField) rows=rows.sort((a:any,b:any)=>String(getNested(a.data,[ref.orderField])??'').localeCompare(String(getNested(b.data,[ref.orderField])??'')));
  if(id)return {collection,id,child,data:rows[0]?getNested(rows[0].data,child):null,row:rows[0]};
  return {collection,id,child,data:Object.fromEntries(rows.map((r:any)=>[r.record_id,r.data])),rows};
}
async function write(ref:Ref,value:any,mode:'set'|'update') {
  const [collection,id,...child]=ref.path;
  if(!collection||!id)throw new Error('A record path is required for this write.');
  const admin=getSupabaseAdminClient();
  const {data:current,error:readError}=await admin.from('academy_records').select('data,owner_id').eq('collection',collection).eq('record_id',id).maybeSingle();
  if(readError)throw readError;
  const next=child.length?setNested(current?.data||{},child,mode==='update'?merge(getNested(current?.data||{},child),value):value):mode==='update'?merge(current?.data||{},value):value;
  const {error}=await admin.from('academy_records').upsert({collection,record_id:id,owner_id:current?.owner_id||ownerId(next),data:next,updated_at:new Date().toISOString()},{onConflict:'collection,record_id'});
  if(error)throw error;
}
class AdminRef {
  path:string[]; key:string|null; orderField?:string; equalValue?:unknown;
  constructor(path:string[],orderField?:string,equalValue?:unknown){this.path=path;this.key=path.at(-1)||null;this.orderField=orderField;this.equalValue=equalValue;}
  child(path:string){return new AdminRef([...this.path,...split(path)]);}
  orderByChild(field:string){return new AdminRef(this.path,field,this.equalValue);}
  equalTo(value:unknown){return new AdminRef(this.path,this.orderField,value);}
  push(value?:any){const child=new AdminRef([...this.path,crypto.randomUUID()]);if(value!==undefined)void child.set(value);return child;}
  async get(){const result=await load(this);if(this.path.length>=2)return snapshot(this.key,result.data);return snapshot(null,Object.keys(result.data||{}).length?result.data:null);}
  once(_event:string){return this.get();}
  async set(value:any){return write(this,value,'set');}
  async update(value:any){
    if(this.path.length===0){
      for(const [path,next] of Object.entries(value||{})){const target=split(path);const ref=new AdminRef(target);if(next===null)await ref.remove();else await ref.set(next);}
      return;
    }
    return write(this,value,'update');
  }
  async remove(){
    const [collection,id,...child]=this.path;const admin=getSupabaseAdminClient();
    if(!collection||!id)throw new Error('Collection-wide deletion is not supported.');
    if(!child.length){const {error}=await admin.from('academy_records').delete().eq('collection',collection).eq('record_id',id);if(error)throw error;return;}
    const {data:row,error:readError}=await admin.from('academy_records').select('data').eq('collection',collection).eq('record_id',id).maybeSingle();
    if(readError)throw readError;const parent=child.slice(0,-1);const key=child[child.length-1];const object=getNested(row?.data||{},parent);
    if(object&&typeof object==='object')delete object[key];
    const next=parent.length?setNested(row?.data||{},parent,object):object;
    const {error}=await admin.from('academy_records').update({data:next,updated_at:new Date().toISOString()}).eq('collection',collection).eq('record_id',id);if(error)throw error;
  }
  async transaction(updateFn:(current:any)=>any){
    const current=(await this.get()).val();const next=updateFn(current);
    if(next===undefined)return {committed:false,snapshot:snapshot(this.key,current)};
    await this.set(next);return {committed:true,snapshot:snapshot(this.key,next)};
  }
}
export const adminDb={ref:(path='')=>new AdminRef(split(path))};
