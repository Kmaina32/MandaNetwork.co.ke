'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction,
  useCallback,
} from 'react';
import type { User } from 'firebase/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  saveUser,
  getUserById,
  createOrganization,
  getOrganizationByOwnerId,
  getOrganizationMembers,
  logActivity,
  createReferral,
} from '@/lib/firebase-service';
import type { RegisteredUser, Organization } from '@/lib/types';
import { ref, onValue, onDisconnect, update, get, increment, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from './use-toast';
import { add } from 'date-fns';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils';

type AppMetadata = { role?: string; admin_expires_at?: string; organization_admin?: boolean };
type SupabaseAuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  created_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: AppMetadata;
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
  sendVerificationEmail: () => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  fetchUserData: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const supabase = getSupabaseBrowserClient();

function toCompatUser(authUser: SupabaseAuthUser): User {
  const metadata = authUser.user_metadata || {};
  const user = {
    uid: authUser.id,
    email: authUser.email ?? null,
    displayName: String(metadata.display_name || metadata.full_name || metadata.name || ''),
    emailVerified: Boolean(authUser.email_confirmed_at),
    photoURL: String(metadata.avatar_url || metadata.picture || ''),
    metadata: {
      creationTime: authUser.created_at,
      lastSignInTime: authUser.last_sign_in_at,
    },
    appMetadata: authUser.app_metadata || {},
    getIdToken: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        throw new Error('Your sign-in session has expired. Please sign in again.');
      }
      return data.session.access_token;
    },
    reload: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('Your sign-in session has expired. Please sign in again.');
      return toCompatUser(data.user as SupabaseAuthUser);
    },
  };
  return user as unknown as User;
}

function getTrustedRole(user: User | null): string | undefined {
  return (user as (User & { appMetadata?: AppMetadata }) | null)?.appMetadata?.role;
}

function createBypassUser(): { user: User; dbUser: RegisteredUser; organization: Organization } {
  const uid = 'local-development-admin';
  const user = {
    uid,
    email: 'developer@localhost',
    displayName: 'Local Development Admin',
    emailVerified: true,
    photoURL: '',
    appMetadata: { role: 'super_admin' },
    metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
    getIdToken: async () => '',
  } as unknown as User;
  const dbUser: RegisteredUser = {
    uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    slug: 'local-development-admin',
    isAdmin: true,
    isOrganizationAdmin: true,
    organizationId: 'local-development-org',
  };
  const organization: Organization = {
    id: 'local-development-org',
    name: 'Local Development',
    ownerId: uid,
    createdAt: new Date().toISOString(),
    subscriptionTier: 'pro',
    subscriptionExpiresAt: null,
    memberLimit: 999,
  };
  return { user, dbUser, organization };
}

export const AuthProvider = ({ children, isAiConfigured }: { children: ReactNode; isAiConfigured: boolean }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<RegisteredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<RegisteredUser[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const role = getTrustedRole(user);
  const isSuperAdmin = role === 'super_admin';
  const expiresAt = (user as (User & { appMetadata?: AppMetadata }) | null)?.appMetadata?.admin_expires_at;
  const isAdmin = (role === 'admin' || isSuperAdmin)
    && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
  const isOrganizationAdmin = Boolean(dbUser?.isOrganizationAdmin)
    || Boolean((user as (User & { appMetadata?: AppMetadata }) | null)?.appMetadata?.organization_admin);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      console.warn('AUTH BYPASS ACTIVE — local development only');
      const bypass = createBypassUser();
      setUser(bypass.user);
      setDbUser(bypass.dbUser);
      setOrganization(bypass.organization);
      setMembers([]);
      setLoading(false);
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ? toCompatUser(session.user as SupabaseAuthUser) : null);
      setLoading(Boolean(session?.user));
      if (!session?.user) {
        setDbUser(null);
        setOrganization(null);
        setMembers([]);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('Could not restore Supabase session:', error.message);
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(data.session?.user ? toCompatUser(data.session.user as SupabaseAuthUser) : null);
      if (!data.session) setLoading(false);
    }).catch((error) => {
      if (active) {
        console.error('Could not restore Supabase session:', error);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = useCallback(async (authUser: User) => {
    let userProfile = await getUserById(authUser.uid);
    if (!userProfile) {
      userProfile = {
        uid: authUser.uid,
        email: authUser.email ?? null,
        displayName: authUser.displayName ?? null,
        slug: slugify(authUser.displayName || authUser.email?.split('@')[0] || 'learner'),
      };
      await saveUser(authUser.uid, userProfile);
    }

    if (!userProfile.affiliateId) {
      const newAffiliateId = Array.from(crypto.getRandomValues(new Uint8Array(4)), byte => byte.toString(16).padStart(2, '0')).join('');
      await saveUser(authUser.uid, { affiliateId: newAffiliateId });
      userProfile.affiliateId = newAffiliateId;
    }

    setDbUser(userProfile);
    let orgData: Organization | null = null;
    if (userProfile.organizationId) {
      const snapshot = await get(ref(db, `organizations/${userProfile.organizationId}`));
      if (snapshot.exists()) orgData = { id: userProfile.organizationId, ...snapshot.val() };
    } else {
      orgData = await getOrganizationByOwnerId(authUser.uid);
    }

    setOrganization(orgData);
    if (orgData?.id) setMembers(await getOrganizationMembers(orgData.id));
    else setMembers([]);
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') return;
    if (!user) {
      setDbUser(null);
      setOrganization(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    let active = true;
    fetchUserData(user)
      .catch((error) => {
        console.error('Failed to hydrate authenticated user profile:', error);
        if (active) {
          setDbUser(null);
          setOrganization(null);
          setMembers([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const userStatusRef = ref(db, `/users/${user.uid}`);
    const connectedRef = ref(db, '.info/connected');
    const presenceUnsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        update(userStatusRef, { isOnline: true });
        onDisconnect(userStatusRef).update({
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      }
    });

    return () => {
      active = false;
      presenceUnsubscribe();
    };
  }, [user, fetchUserData]);

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });
    if (error) throw error;
    if (data.user) setUser(toCompatUser(data.user as SupabaseAuthUser));
    return data;
  };

  const signup = async (
    email: string,
    pass: string,
    displayName: string,
    organizationName?: string,
    inviteOrgId?: string,
    affiliateRef?: string,
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: pass,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=/dashboard`
          : undefined,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Your account could not be created. Please try again.');

    const uid = data.user.id;
    const userSlug = slugify(displayName);
    const userData: Partial<RegisteredUser> = { slug: userSlug, email: normalizedEmail, displayName: displayName.trim() };

    if (affiliateRef) {
      userData.referredBy = affiliateRef;
      await createReferral({
        affiliateId: affiliateRef,
        referredUserId: uid,
        referredUserName: displayName,
        purchaseAmount: 0,
        commissionAmount: 0,
        createdAt: new Date().toISOString(),
      });
      const affiliateSnapshot = await get(ref(db, `users/${affiliateRef}`));
      if (affiliateSnapshot.exists()) {
        await update(ref(db, `users/${affiliateRef}/affiliateStats`), {
          clicks: increment(1),
          referrals: increment(1),
        });
      }
    }

    await saveUser(uid, userData);
    await logActivity(uid, { type: 'signup', details: { authProvider: 'supabase' } });

    if (organizationName && !inviteOrgId) {
      const trialExpiry = add(new Date(), { days: 30 }).toISOString();
      const orgId = await createOrganization({
        name: organizationName,
        ownerId: uid,
        createdAt: new Date().toISOString(),
        subscriptionTier: 'trial',
        subscriptionExpiresAt: trialExpiry,
        memberLimit: 5,
      });
      await saveUser(uid, { isOrganizationAdmin: true, organizationId: orgId });
    } else if (inviteOrgId) {
      await saveUser(uid, { organizationId: inviteOrgId, isOrganizationAdmin: false });
    }

    if (data.session?.user) setUser(toCompatUser(data.session.user as SupabaseAuthUser));
    return data;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      toast({
        title: 'Google sign-in failed',
        description: error.message || 'Could not sign in with Google. Please try again.',
        variant: 'destructive',
        duration: 10000,
      });
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) throw new Error('Please return to sign up and enter your email address.');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) throw error;
  };

  const logout = async () => {
    if (user) {
      try {
        await update(ref(db, `/users/${user.uid}`), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (error) {
        console.warn('Could not update learner presence during sign-out:', error);
      }
    }
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      console.warn('Cannot log out when the local development auth bypass is active.');
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    router.push('/');
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    if (error) throw error;
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    if (!user?.email) throw new Error('No user is currently signed in.');
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPass,
    });
    if (verifyError) throw new Error('Your current password is incorrect.');
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  };

  const value: AuthContextType = {
    user,
    dbUser,
    setUser,
    members,
    setMembers,
    loading,
    isAdmin,
    isSuperAdmin,
    isOrganizationAdmin,
    organization,
    isAiConfigured,
    login,
    signup,
    logout,
    sendPasswordReset,
    signInWithGoogle,
    sendVerificationEmail,
    changePassword,
    fetchUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
