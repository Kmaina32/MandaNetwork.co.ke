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
import { signInWithCustomToken, signOut as signOutFirebase, type User as FirebaseUser, type User } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
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
import { ref, onValue, onDisconnect, update, get, serverTimestamp } from 'firebase/database';
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
  sendVerificationEmail: (email?: string) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  fetchUserData: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const supabase = getSupabaseBrowserClient();
let firebaseLinkedSupabaseUserId: string | null = null;

async function syncFirebaseSession(supabaseUserId: string): Promise<FirebaseUser> {
  if (firebaseLinkedSupabaseUserId === supabaseUserId && firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }
  const response = await fetch('/api/auth/firebase-token', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.token !== 'string') {
    throw new Error(payload.error || 'Could not connect your learner data session.');
  }
  const credential = await signInWithCustomToken(firebaseAuth, payload.token);
  firebaseLinkedSupabaseUserId = supabaseUserId;
  return credential.user;
}

function toCompatUser(authUser: SupabaseAuthUser, firebaseUser: FirebaseUser): User {
  const metadata = authUser.user_metadata || {};
  const user = {
    uid: firebaseUser.uid,
    supabaseId: authUser.id,
    email: authUser.email ?? firebaseUser.email,
    displayName: String(metadata.display_name || metadata.full_name || metadata.name || firebaseUser.displayName || ''),
    emailVerified: Boolean(authUser.email_confirmed_at),
    photoURL: String(metadata.avatar_url || metadata.picture || firebaseUser.photoURL || ''),
    metadata: {
      creationTime: authUser.created_at,
      lastSignInTime: authUser.last_sign_in_at,
    },
    appMetadata: authUser.app_metadata || {},
    supabaseMetadata: metadata,
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
      const refreshedFirebaseUser = await syncFirebaseSession(data.user.id);
      return toCompatUser(data.user as SupabaseAuthUser, refreshedFirebaseUser);
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
  const isSuperAdmin = role === 'super_admin' || Boolean(dbUser?.isSuperAdmin);
  const expiresAt = (user as (User & { appMetadata?: AppMetadata }) | null)?.appMetadata?.admin_expires_at;
  const legacyAdminExpiry = dbUser?.adminExpiresAt;
  const effectiveExpiry = expiresAt || legacyAdminExpiry;
  const isAdmin = (role === 'admin' || isSuperAdmin || Boolean(dbUser?.isAdmin))
    && (!effectiveExpiry || new Date(effectiveExpiry).getTime() > Date.now());
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
    let sequence = 0;
    const applySession = async (session: import('@supabase/supabase-js').Session | null) => {
      const currentSequence = ++sequence;
      if (!session?.user) {
        setDbUser(null);
        setOrganization(null);
        setMembers([]);
        await signOutFirebase(firebaseAuth).catch(() => undefined);
        firebaseLinkedSupabaseUserId = null;
        if (active && currentSequence === sequence) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const firebaseUser = await syncFirebaseSession(session.user.id);
        if (active && currentSequence === sequence) {
          setUser(toCompatUser(session.user as SupabaseAuthUser, firebaseUser));
        }
      } catch (error) {
        console.error('Could not establish the linked learner data session:', error);
        if (active && currentSequence === sequence) {
          setUser(null);
          setLoading(false);
          toast({
            title: 'Could not connect your account',
            description: 'Your sign-in succeeded, but we could not connect your learner data. Please try again.',
            variant: 'destructive',
          });
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = useCallback(async (authUser: User) => {
    let userProfile = await getUserById(authUser.uid);
    if (!userProfile) {
      const signupMetadata = (authUser as User & { supabaseMetadata?: Record<string, unknown> }).supabaseMetadata || {};
      const displayName = authUser.displayName || authUser.email?.split('@')[0] || 'Learner';
      const newProfile: Partial<RegisteredUser> = {
        uid: authUser.uid,
        email: authUser.email ?? null,
        displayName,
        slug: slugify(displayName),
      };

      const affiliateRef = typeof signupMetadata.affiliate_ref === 'string' ? signupMetadata.affiliate_ref : '';
      if (affiliateRef) {
        newProfile.referredBy = affiliateRef;
        await createReferral({
          affiliateId: affiliateRef,
          referredUserId: authUser.uid,
          referredUserName: displayName,
          purchaseAmount: 0,
          commissionAmount: 0,
          createdAt: new Date().toISOString(),
        });
      }

      const organizationName = typeof signupMetadata.organization_name === 'string' ? signupMetadata.organization_name.trim() : '';
      const inviteId = typeof signupMetadata.invite_org_id === 'string' ? signupMetadata.invite_org_id : '';
      if (inviteId) {
        const response = await fetch('/api/auth/accept-invitation', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ inviteId }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.organizationId !== 'string') {
          throw new Error(result.error || 'This organization invitation could not be accepted.');
        }
        newProfile.organizationId = result.organizationId;
      } else if (organizationName) {
        const trialExpiry = add(new Date(), { days: 30 }).toISOString();
        const orgId = await createOrganization({
          name: organizationName,
          ownerId: authUser.uid,
          createdAt: new Date().toISOString(),
          subscriptionTier: 'trial',
          subscriptionExpiresAt: trialExpiry,
          memberLimit: 5,
        });
        newProfile.organizationId = orgId;
        newProfile.isOrganizationAdmin = true;
      }

      await saveUser(authUser.uid, newProfile);
      await logActivity(authUser.uid, { type: 'signup', details: { authProvider: 'supabase' } });
      userProfile = { ...newProfile, uid: authUser.uid } as RegisteredUser;
    }

    if (userProfile && (!userProfile.email || !userProfile.displayName)) {
      const profileUpdates: Partial<RegisteredUser> = {};
      if (!userProfile.email && authUser.email) profileUpdates.email = authUser.email;
      if (!userProfile.displayName && authUser.displayName) profileUpdates.displayName = authUser.displayName;
      if (Object.keys(profileUpdates).length) {
        await saveUser(authUser.uid, profileUpdates);
        userProfile = { ...userProfile, ...profileUpdates };
      }
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
        data: {
          display_name: displayName.trim(),
          organization_name: organizationName || '',
          invite_org_id: inviteOrgId || '',
          affiliate_ref: affiliateRef || '',
        },
        emailRedirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=/dashboard`
          : undefined,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Your account could not be created. Please try again.');
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

  const sendVerificationEmail = async (requestedEmail?: string) => {
    let email = requestedEmail?.trim().toLowerCase();
    if (!email) {
      const { data } = await supabase.auth.getUser();
      email = data.user?.email || undefined;
    }
    if (!email) throw new Error('Enter the email address you used to sign up.');
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
