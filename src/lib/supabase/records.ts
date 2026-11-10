'use client';

import { getSupabaseBrowserClient } from './client';

type PathRef = { path: string[]; key: string | null; constraints?: Constraint[] };
type Constraint =
  | { kind: 'order'; field: string }
  | { kind: 'equal'; value: unknown }
  | { kind: 'limit'; count: number };
type Snapshot = {
  key: string | null;
  exists: () => boolean;
  val: () => any;
  forEach: (callback: (child: Snapshot) => boolean | void) => boolean;
};
const database = Object.freeze({ provider: 'supabase' });

function parts(path: string): string[] {
  return path.split('/').filter(Boolean);
}
function nestedGet(value: any, path: string[]): any {
  return path.reduce((current, key) => current == null ? undefined : current[key], value);
}
function nestedSet(value: any, path: string[], next: any): any {
  if (!path.length) return next;
  const root = value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
  let cursor = root;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    cursor[key] = cursor[key] && typeof cursor[key] === 'object' ? { ...cursor[key] } : {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = next;
  return root;
}
function nestedMerge(value: any, patch: any): any {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const output = value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
  for (const [key, item] of Object.entries(patch)) {
    output[key] = item && typeof item === 'object' && '__supabaseIncrement' in item
      ? Number(output[key] || 0) + Number((item as any).__supabaseIncrement || 0)
      : item && typeof item === 'object' && !Array.isArray(item)
        ? nestedMerge(output[key], item)
        : item;
  }
  return output;
}
function ownerFor(data: any): string | null {
  const candidate = data?.ownerId ?? data?.userId ?? data?.uid ?? data?.studentId ?? data?.affiliateId ?? data?.createdBy;
  return typeof candidate === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(candidate) ? candidate : null;
}
function makeSnapshot(key: string | null, value: any): Snapshot {
  const exists = value !== null && value !== undefined;
  return {
    key, exists: () => exists, val: () => exists ? value : null,
    forEach(callback) {
      if (!exists || !value || typeof value !== 'object') return false;
      for (const [childKey, childValue] of Object.entries(value)) {
        if (callback(makeSnapshot(childKey, childValue)) === true) return true;
      }
      return false;
    },
  };
}
export const db = database;
export function ref(_db: unknown, path: string): PathRef {
  return { path: parts(path), key: parts(path).at(-1) || null };
}
export function query(reference: PathRef, ...constraints: Constraint[]): PathRef {
  return { ...reference, constraints: [...(reference.constraints || []), ...constraints] };
}
export function orderByChild(field: string): Constraint { return { kind: 'order', field }; }
export function equalTo(value: unknown): Constraint { return { kind: 'equal', value }; }
export function limitToLast(count: number): Constraint { return { kind: 'limit', count }; }
export function increment(amount: number) { return { __supabaseIncrement: amount }; }
export function serverTimestamp() { return new Date().toISOString(); }

const activeListeners = new WeakMap<Function, () => void>();
export function onValue(reference: PathRef, callback: (snapshot: Snapshot) => void, errorOrOptions?: ((error: Error) => void) | { onlyOnce?: boolean }) {
  let active = true;
  const onlyOnce = typeof errorOrOptions === 'object' && Boolean(errorOrOptions.onlyOnce);
  const onError = typeof errorOrOptions === 'function' ? errorOrOptions : undefined;
  const refresh = async () => { try { const snapshot = await get(reference); if (active) callback(snapshot); } catch (error) { if (active) onError?.(error as Error); } };
  void refresh();
  if (onlyOnce) return () => { active = false; };
  const collection = reference.path[0];
  const channel = getSupabaseBrowserClient().channel('academy-records-value-' + crypto.randomUUID())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_records', filter: 'collection=eq.' + collection }, () => { void refresh(); }).subscribe();
  const unsubscribe = () => { active = false; void getSupabaseBrowserClient().removeChannel(channel); };
  activeListeners.set(callback, unsubscribe);
  return unsubscribe;
}
export function onChildAdded(reference: PathRef, callback: (snapshot: Snapshot) => void) {
  let active = true;
  const known = new Set<string>();
  const initial = async () => {
    try { const snapshot = await get(reference); const value = snapshot.val();
      if (value && typeof value === 'object') Object.entries(value).forEach(([key,item]) => { known.add(key); callback(makeSnapshot(key,item)); });
    } catch (error) { console.error('Supabase child listener initial load failed:', error); }
  };
  void initial();
  const collection = reference.path[0];
  const channel = getSupabaseBrowserClient().channel('academy-records-child-' + crypto.randomUUID())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_records', filter: 'collection=eq.' + collection }, async () => {
      if (!active) return;
      try { const snapshot = await get(reference); const value = snapshot.val();
        if (value && typeof value === 'object') Object.entries(value).forEach(([key,item]) => { if (!known.has(key)) { known.add(key); callback(makeSnapshot(key,item)); } });
      } catch (error) { console.error('Supabase child listener refresh failed:', error); }
    }).subscribe();
  const unsubscribe = () => { active = false; void getSupabaseBrowserClient().removeChannel(channel); };
  activeListeners.set(callback, unsubscribe);
  return unsubscribe;
}
export function off(_reference: PathRef, _event?: string, callback?: Function) { if (callback) activeListeners.get(callback)?.(); }
export function push(reference: PathRef): PathRef {
  const key = crypto.randomUUID();
  return { path: [...reference.path, key], key };
}

async function fetchRows(reference: PathRef) {
  const [collection, recordId, ...childPath] = reference.path;
  if (!collection) throw new Error('A collection path is required.');
  const supabase = getSupabaseBrowserClient();
  let request = supabase.from('academy_records').select('collection,record_id,owner_id,data,created_at,updated_at').eq('collection', collection);
  if (recordId) request = request.eq('record_id', recordId);
  const { data, error } = await request;
  if (error) throw error;
  let rows = (data || []).map((row: any) => ({ ...row, data: childPath.length ? nestedGet(row.data, childPath) : row.data }))
    .filter((row: any) => row.data !== undefined && row.data !== null);
  const order = reference.constraints?.find(item => item.kind === 'order') as Extract<Constraint,{kind:'order'}> | undefined;
  const equal = reference.constraints?.find(item => item.kind === 'equal') as Extract<Constraint,{kind:'equal'}> | undefined;
  if (equal) rows = rows.filter((row: any) => order ? nestedGet(row.data,[order.field]) === equal.value : row.record_id === String(equal.value));
  if (order) rows.sort((a: any,b: any) => String(nestedGet(a.data,[order.field]) ?? '').localeCompare(String(nestedGet(b.data,[order.field]) ?? '')));
  const limit = reference.constraints?.find(item => item.kind === 'limit') as Extract<Constraint,{kind:'limit'}> | undefined;
  if (limit) rows = rows.slice(-Math.max(0,limit.count));
  return { rows, childPath };
}
export async function get(reference: PathRef): Promise<Snapshot> {
  const { rows } = await fetchRows(reference);
  if (reference.path.length >= 2) {
    const row = rows[0];
    return makeSnapshot(reference.path[1] || null, row?.data ?? null);
  }
  const value: Record<string, any> = {};
  rows.forEach((row: any) => { value[row.record_id] = row.data; });
  return makeSnapshot(null, Object.keys(value).length ? value : null);
}
export async function set(reference: PathRef, value: any): Promise<void> {
  const [collection, recordId, ...childPath] = reference.path;
  if (!collection || !recordId) throw new Error('Writes must target a record.');
  const supabase = getSupabaseBrowserClient();
  if (childPath.length) {
    const { data: current, error: readError } = await supabase.from('academy_records').select('data').eq('collection',collection).eq('record_id',recordId).maybeSingle();
    if (readError) throw readError;
    const next = nestedSet(current?.data || {}, childPath, value);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('academy_records').upsert({
      collection, record_id: recordId, owner_id: current?.owner_id || ownerFor(next) || auth.user?.id || null,
      data: next, updated_at: new Date().toISOString(),
    }, { onConflict: 'collection,record_id' });
    if (error) throw error;
    return;
  }
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from('academy_records').upsert({
    collection, record_id: recordId, owner_id: ownerFor(value) || auth.user?.id || null,
    data: value, updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,record_id' });
  if (error) throw error;
}
export async function update(reference: PathRef, patch: any): Promise<void> {
  const [collection, recordId, ...childPath] = reference.path;
  if (!collection || !recordId) throw new Error('Updates must target a record.');
  const supabase = getSupabaseBrowserClient();
  const { data: current, error: readError } = await supabase.from('academy_records').select('data,owner_id').eq('collection',collection).eq('record_id',recordId).maybeSingle();
  if (readError) throw readError;
  const next = childPath.length
    ? nestedSet(current?.data || {}, childPath, nestedMerge(nestedGet(current?.data || {},childPath),patch))
    : nestedMerge(current?.data || {},patch);
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from('academy_records').upsert({
    collection, record_id: recordId, owner_id: current?.owner_id || ownerFor(next) || auth.user?.id || null,
    data: next, updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,record_id' });
  if (error) throw error;
}
export async function remove(reference: PathRef): Promise<void> {
  const [collection, recordId, ...childPath] = reference.path;
  if (!collection) throw new Error('A collection path is required.');
  const supabase = getSupabaseBrowserClient();
  if (!recordId) throw new Error('Collection-wide deletion is not supported.');
  if (!childPath.length) {
    const { error } = await supabase.from('academy_records').delete().eq('collection',collection).eq('record_id',recordId);
    if (error) throw error;
    return;
  }
  const { data: current, error: readError } = await supabase.from('academy_records').select('data').eq('collection',collection).eq('record_id',recordId).maybeSingle();
  if (readError) throw readError;
  const parent = childPath.slice(0,-1);
  const key = childPath[childPath.length-1];
  const target = nestedGet(current?.data || {},parent);
  if (target && typeof target === 'object') delete target[key];
  const next = parent.length ? nestedSet(current?.data || {},parent,target) : target;
  const { error } = await supabase.from('academy_records').update({ data: next, updated_at: new Date().toISOString() }).eq('collection',collection).eq('record_id',recordId);
  if (error) throw error;
}
