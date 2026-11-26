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
  return { path: parts(path), key: parts(path)[parts(path).length - 1] || null };
}
export function query(reference: PathRef, ...constraints: Constraint[]): PathRef {
  return { ...reference, constraints: [...(reference.constraints || []), ...constraints] };
}
export function orderByChild(field: string): Constraint { return { kind: 'order', field }; }
export function equalTo(value: unknown): Constraint { return { kind: 'equal', value }; }
export function limitToLast(count: number): Constraint { return { kind: 'limit', count }; }
export function increment(amount: number) { return { __supabaseIncrement: amount }; }
export function serverTimestamp() { return new Date().toISOString(); }

type ListenerRegistration = { path: string; event: 'value' | 'child_added'; callback: Function; unsubscribe: () => void };
const activeListeners = new Set<ListenerRegistration>();

function registerListener(reference: PathRef, event: ListenerRegistration['event'], callback: Function, stop: () => void) {
  let active = true;
  const registration: ListenerRegistration = {
    path: reference.path.join('/'), event, callback,
    unsubscribe: () => {
      if (!active) return;
      active = false;
      activeListeners.delete(registration);
      stop();
    },
  };
  activeListeners.add(registration);
  return registration.unsubscribe;
}
export function onValue(reference: PathRef, callback: (snapshot: Snapshot) => void, errorOrOptions?: ((error: Error) => void) | { onlyOnce?: boolean }) {
  let active = true;
  const onlyOnce = typeof errorOrOptions === 'object' && Boolean(errorOrOptions.onlyOnce);
  const onError = typeof errorOrOptions === 'function' ? errorOrOptions : undefined;
  const refresh = async () => { try { const snapshot = await get(reference); if (active) callback(snapshot); } catch (error) { if (active) onError?.(error as Error); } };
  if (onlyOnce) {
    void refresh();
    return () => { active = false; };
  }
  const collection = reference.path[0];
  const channel = getSupabaseBrowserClient().channel('academy-records-value-' + crypto.randomUUID())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_records', filter: 'collection=eq.' + collection }, () => { void refresh(); }).subscribe();
  // Subscribe before the initial read so a write during setup is not missed.
  void refresh();
  const unsubscribe = registerListener(reference, 'value', callback, () => {
    active = false;
    void getSupabaseBrowserClient().removeChannel(channel);
  });
  return unsubscribe;
}
export function onChildAdded(reference: PathRef, callback: (snapshot: Snapshot) => void) {
  let active = true;
  const known = new Set<string>();
  const refresh = async () => {
    if (!active) return;
    try {
      const snapshot = await get(reference);
      const value = snapshot.val();
      if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => {
          if (!known.has(key)) {
            known.add(key);
            callback(makeSnapshot(key, item));
          }
        });
      }
    } catch (error) {
      console.error('Supabase child listener refresh failed:', error);
    }
  };
  const collection = reference.path[0];
  const channel = getSupabaseBrowserClient().channel('academy-records-child-' + crypto.randomUUID())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_records', filter: 'collection=eq.' + collection }, () => {
      void refresh();
    }).subscribe();
  // Subscribe before the initial read so inserts between setup and the read are not missed.
  void refresh();
  return registerListener(reference, 'child_added', callback, () => {
    active = false;
    void getSupabaseBrowserClient().removeChannel(channel);
  });
}
export function off(reference: PathRef, event?: string, callback?: Function) {
  const targetPath = reference.path.join('/');
  for (const listener of Array.from(activeListeners)) {
    if (listener.path !== targetPath) continue;
    if (event && listener.event !== event) continue;
    if (callback && listener.callback !== callback && listener.unsubscribe !== callback) continue;
    listener.unsubscribe();
  }
}
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
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error('Sign-in is required to write records.');
    const { error } = await supabase.rpc('academy_record_set_path', {
      p_collection: collection,
      p_record_id: recordId,
      p_path: childPath,
      p_value: value,
      p_owner_id: ownerFor(value) || auth.user.id,
    });
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
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign-in is required to update records.');
  const { error } = await supabase.rpc('academy_record_merge', {
    p_collection: collection,
    p_record_id: recordId,
    p_path: childPath,
    p_patch: patch,
    p_owner_id: ownerFor(patch) || auth.user.id,
  });
  if (error) throw error;
}
export async function remove(reference: PathRef): Promise<void> {
  const [collection, recordId, ...childPath] = reference.path;
  if (!collection) throw new Error('A collection path is required.');
  if (!recordId) throw new Error('Collection-wide deletion is not supported.');
  const supabase = getSupabaseBrowserClient();
  if (!childPath.length) {
    const { error } = await supabase.from('academy_records').delete().eq('collection', collection).eq('record_id', recordId);
    if (error) throw error;
    return;
  }
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign-in is required to remove record fields.');
  const { error } = await supabase.rpc('academy_record_remove_path', {
    p_collection: collection,
    p_record_id: recordId,
    p_path: childPath,
  });
  if (error) throw error;
}
