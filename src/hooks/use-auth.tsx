'use client';

import {
  useState, useEffect, createContext, useContext, ReactNode,
  Dispatch, SetStateAction, useCallback,
} from 'react';
import type { User } from 'firebase/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RegisteredUser, Organization } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils';

type SupabaseAuthUser = import('@supabase/supabase-js').User;
type AppUser = User & {
  supabaseId: string;
  appMetadata: { role?: string; admin_expires_at?: string; organization_admin?: boolean };
  supabaseMetadata: Record<string, unknown>;
  getIdToken: () => Promise<string>;
};

interface AuthContextType {
  user: User | null;
  dbUser: RegisteredUser | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  members: RegisteredUser[];
  setMembers: Dispatch<SetStateAction<RegisteredUser[]>>;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOrganizationAdmin: boolean;
  organization: Organization | null;
  isAiConfigured: boolean;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string, name: string, organizationName?: string, inviteOrgId?: string, affiliateRef?: string) => Promise<any>;
  logout: () => Promise<any>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendVerificationEmail: (email?: string) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  fetchUserData: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const supabase = getSupabaseBrowserClient();

function toAppUser(authUser: SupabaseAuthUser): User {
  const metadata = authUser.user_metadata || {};
  const appMetadata = authUser.app_metadata || {};
  const compatible = {
    uid: authUser.id,
    supabaseId: authUser.id,
    email: authUser.email ?? null,
    displayName: String(metadata.display_name || metadata.full_name || metadata.name || ''),
    emailVerified: Boolean(authUser.email_confirmed_at),
    photoURL: String(metadata.avatar_url || metadata.picture || ''),
    metadata: {
      creationTime: authUser.created_at,
      lastSignInTime: authUser.last_sign_in_at,
    },
    appMetadata,
    supabaseMetadata: metadata,
    getIdToken: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) throw new Error('Your sign-in session has expired. Please sign in again.');
      return data.session.access_token;
    },
    reload: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('Your sign-in session has expired. Please sign in again.');
      return toAppUser(data.user) as User;
    },
  };
  return compatible as unknown as User;
}

export const AuthProvider = ({ children, isAiConfigured }: { children: ReactNode; isAiConfigured: boolean }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<RegisteredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<RegisteredUser[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const role = (user as AppUser | null)?.appMetadata?.role;
  const isSuperAdmin = role === 'super_admin' || Boolean(dbUser?.isSuperAdmin);
  const expiresAt = (user as AppUser | null)?.appMetadata?.admin_expires_at;
  const isAdmin = (role === 'admin' || isSuperAdmin || Boolean(dbUser?.isAdmin))
    && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
  const isOrganizationAdmin = Boolean(dbUser?.isOrganizationAdmin)
    || Boolean((user as AppUser | null)?.appMetadata?.organization_admin);

  const fetchUserData = useCallback(async (authUser: User) => {
    const userId = authUser.uid;
    const [profileResult, rolesResult, membershipResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('organization_members').select('organization_id,member_role,status').eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle(),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (rolesResult.error) throw rolesResult.error;
    if (membershipResult.error) throw membershipResult.error;

    const metadata = (authUser as AppUser).supabaseMetadata || {};
    const profile = profileResult.data || {};
    const roles = (rolesResult.data || []).map((item: { role: string }) => item.role);
    const membership = membershipResult.data;
    const organizationId = membership?.organization_id || undefined;
    let org: Organization | null = null;

    if (organizationId) {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', organizationId).maybeSingle();
      if (error) throw error;
      if (data) {
        const details = data.content && typeof data.content === 'object' ? data.content : {};
        org = {
          id: data.id, name: data.name, ownerId: data.owner_id, createdAt: data.created_at,
          subscriptionTier: details.subscriptionTier || 'free',
          subscriptionExpiresAt: details.subscriptionExpiresAt || null,
          memberLimit: Number(details.memberLimit || 5),
          ...details,
        } as Organization;
      }
    } else {
      const { data, error } = await supabase.from('organizations').select('*').eq('owner_id', userId).limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        const details = data.content && typeof data.content === 'object' ? data.content : {};
        org = {
          id: data.id, name: data.name, ownerId: data.owner_id, createdAt: data.created_at,
          subscriptionTier: details.subscriptionTier || 'trial',
          subscriptionExpiresAt: details.subscriptionExpiresAt || null,
          memberLimit: Number(details.memberLimit || 5),
          ...details,
        } as Organization;
      }
    }

    const displayName = profile.display_name || authUser.displayName || authUser.email?.split('@')[0] || 'Learner';
    const dbProfile: RegisteredUser = {
      uid: userId,
      email: profile.email || authUser.email || null,
      displayName,
      slug: profile.username || slugify(displayName),
      photoURL: profile.avatar_path || '',
      isAdmin: roles.includes('admin') || roles.includes('super_admin'),
      isSuperAdmin: roles.includes('super_admin'),
      isOrganizationAdmin: roles.includes('organization_admin') || membership?.member_role === 'owner' || membership?.member_role === 'admin',
      organizationId: organizationId || org?.id,
      createdAt: profile.created_at,
      affiliateId: typeof metadata.affiliate_id === 'string' ? metadata.affiliate_id : undefined,
      ...(profile.metadata && typeof profile.metadata === 'object' ? profile.metadata : {}),
    };

    setDbUser(dbProfile);
    setOrganization(org);
    if (org?.id) {
      const { data: memberRows, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id,member_role,status')
        .eq('organization_id', org.id)
        .eq('status', 'active');
      if (membersError) throw membersError;
      const ids = (memberRows || []).map((row: { user_id: string }) => row.user_id);
      if (ids.length) {
        const { data: memberProfiles, error: profilesError } = await supabase.from('profiles').select('*').in('id', ids);
        if (profilesError) throw profilesError;
        setMembers((memberProfiles || []).map((item: any) => ({
          uid: item.id, email: item.email || null, displayName: item.display_name || item.email || 'Member',
          photoURL: item.avatar_path || '',
        })));
      } else setMembers([]);
    } else setMembers([]);
  }, []);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    const applySession = async (session: import('@supabase/supabase-js').Session | null) => {
      const current = ++sequence;
      if (!session?.user) {
        if (active && current === sequence) {
          setUser(null); setDbUser(null); setOrganization(null); setMembers([]); setLoading(false);
        }
        return;
      }
      if (active && current === sequence) setLoading(true);
      const appUser = toAppUser(session.user);
      try {
        await fetchUserData(appUser);
        if (active && current === sequence) setUser(appUser);
      } catch (error) {
        console.error('Supabase account hydration failed:', error);
        if (active && current === sequence) {
          setUser(appUser);
          setDbUser(null);
          toast({ title: 'Account data could not be loaded', description: 'Your sign-in is active, but your profile could not be loaded. Please refresh or contact support.', variant: 'destructive' });
        }
      } finally {
        if (active && current === sequence) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Could not restore Supabase session:', error);
      void applySession(data.session);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [fetchUserData, toast]);

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass });
    if (error) throw error;
    return data;
  };

  const signup = async (email: string, pass: string, displayName: string, organizationName?: string, inviteOrgId?: string, affiliateRef?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail, password: pass,
      options: {
        data: { display_name: displayName.trim(), organization_name: organizationName || '', invite_org_id: inviteOrgId || '', affiliate_ref: affiliateRef || '' },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/dashboard` : undefined,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Your account could not be created. Please try again.');
    return data;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
    if (error) throw error;
  };

  const sendVerificationEmail = async (requestedEmail?: string) => {
    let email = requestedEmail?.trim().toLowerCase();
    if (!email) {
      const { data } = await supabase.auth.getUser();
      email = data.user?.email || undefined;
    }
    if (!email) throw new Error('Enter the email address you used to sign up.');
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null); setDbUser(null); setOrganization(null); setMembers([]);
    router.push('/');
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` });
    if (error) throw error;
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser?.email) throw new Error('No user is currently signed in.');
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPass });
    if (verifyError) throw new Error('Your current password is incorrect.');
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user, dbUser, setUser, members, setMembers, loading, isAdmin, isSuperAdmin,
      isOrganizationAdmin, organization, isAiConfigured, login, signup, logout,
      sendPasswordReset, signInWithGoogle, sendVerificationEmail, changePassword, fetchUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
