import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from '../lib/firebase/client';
import { toUserFriendlyAuthError } from '../lib/firebase/authErrors';
import {
  FIRESTORE_COLLECTIONS,
  type FirestoreAdminNotificationDoc,
  type FirestoreApiCustomerDoc,
  type FirestoreUserDoc,
  type UserAccountRole,
  type UserAccountStatus,
} from '../lib/firestore/collections';
import { OperationType, handleFirestoreError } from '../lib/firestore/errors';

const ADMIN_LOGIN_EMAIL = 'g81227326@gmail.com';
const ADMIN_LOGIN_PASSWORD = 'QEwyQ8thcspn8Hr';

function isPasswordAuthenticatedAdmin(authUser: FirebaseAuthUser | null | undefined): boolean {
  if (!authUser?.email) return false;
  if (authUser.email.trim().toLowerCase() !== ADMIN_LOGIN_EMAIL) return false;
  return authUser.providerData.some((provider) => provider.providerId === 'password');
}

function ensureResellerProfileBestEffort(uid: string, name: string, email: string): void {
  const services = getFirebaseServices();
  if (!services || !uid) return;
  const customerId = `reseller-${uid}`;
  const payload: FirestoreApiCustomerDoc = {
    id: customerId,
    userId: uid,
    name: (name || 'Reseller').trim().slice(0, 120),
    email: (email || `${uid}@panel.local`).trim().toLowerCase().slice(0, 180),
    installationId: `rsw-${uid.slice(0, 12)}`,
    apiBalance: 0,
    totalSpent: 0,
    totalOrders: 0,
    rateLimitPerMinute: 60,
    customDiscountPercent: 0,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  void setDoc(doc(services.db, FIRESTORE_COLLECTIONS.apiCustomers, customerId), payload).catch(
    () => undefined
  );
}

function emitNewUserAdminAlert(uid: string, name: string, email: string): void {
  const services = getFirebaseServices();
  if (!services) return;
  const notifId = `adm-usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const payload: FirestoreAdminNotificationDoc = {
    id: notifId,
    type: 'new_user',
    title: 'New User Registered',
    message: `${name || 'New customer'} (${email}) registered on the panel.`,
    referenceId: uid,
    actorUid: uid,
    read: false,
    createdAt: serverTimestamp(),
  };
  void setDoc(doc(services.db, FIRESTORE_COLLECTIONS.adminNotifications, notifId), payload).catch(
    () => undefined
  );
}

export interface AuthenticatedUserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  role: UserAccountRole;
  balance: number;
  status: UserAccountStatus;
  memberSince: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface UpdateProfileInput {
  name: string;
  phone: string;
  photoUrl: string;
}

function formatMemberSince(ts: unknown): string {
  try {
    if (ts && typeof ts === 'object' && 'toDate' in ts) {
      const date = (ts as Timestamp).toDate();
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  } catch {
    // Fallback
  }
  return 'Recent';
}

function mapFirestoreUser(docData: FirestoreUserDoc): AuthenticatedUserProfile {
  return {
    uid: docData.uid,
    name: docData.name,
    email: docData.email,
    phone: docData.phone ?? '',
    photoUrl: docData.photoUrl ?? '',
    role: docData.role,
    balance: Number(docData.balance ?? 0),
    status: docData.status ?? 'active',
    memberSince: formatMemberSince(docData.createdAt),
  };
}

export const authService = {
  /**
   * Registers a new customer in Firebase Authentication and initializes
   * their Firestore `users/{uid}` document with role='user', balance=0, status='active'.
   * Password is NEVER written to Firestore.
   */
  async registerWithEmail(input: RegisterInput): Promise<AuthenticatedUserProfile> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase is not configured yet. Please contact the administrator.');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    if (normalizedEmail === ADMIN_LOGIN_EMAIL) {
      throw new Error('This email address is reserved and cannot be registered.');
    }

    let authUser: FirebaseAuthUser;
    try {
      const cred = await createUserWithEmailAndPassword(
        services.auth,
        input.email.trim(),
        input.password
      );
      authUser = cred.user;
      await updateProfile(authUser, { displayName: input.fullName.trim() });
    } catch (error) {
      throw new Error(toUserFriendlyAuthError(error));
    }

    const userRef = doc(services.db, FIRESTORE_COLLECTIONS.users, authUser.uid);
    const safeName = (
      input.fullName.trim() ||
      (authUser.email ?? input.email).split('@')[0]?.trim() ||
      'Customer'
    ).slice(0, 120);
    const safeEmail = (authUser.email ?? input.email).trim().slice(0, 180);

    const newProfileDoc: FirestoreUserDoc = {
      uid: authUser.uid,
      name: safeName,
      email: safeEmail,
      phone: input.phone.trim().slice(0, 32),
      photoUrl: '',
      role: 'user',
      balance: 0,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, newProfileDoc);
      emitNewUserAdminAlert(authUser.uid, newProfileDoc.name, newProfileDoc.email);
      ensureResellerProfileBestEffort(authUser.uid, newProfileDoc.name, newProfileDoc.email);
      const saved = await getDoc(userRef);
      if (saved.exists()) {
        return mapFirestoreUser(saved.data() as FirestoreUserDoc);
      }
      return {
        uid: authUser.uid,
        name: newProfileDoc.name,
        email: newProfileDoc.email,
        phone: newProfileDoc.phone ?? '',
        photoUrl: '',
        role: 'user',
        balance: 0,
        status: 'active',
        memberSince: 'Just now',
      };
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${FIRESTORE_COLLECTIONS.users}/${authUser.uid}`,
        services.auth
      );
    }
  },

  /**
   * Signs in an existing customer/admin with Email + Password and session persistence choice.
   */
  async loginWithEmail(input: LoginInput): Promise<AuthenticatedUserProfile> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase is not configured yet. Please contact the administrator.');
    }

    const trimmedEmail = input.email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    if (normalizedEmail === ADMIN_LOGIN_EMAIL && input.password !== ADMIN_LOGIN_PASSWORD) {
      throw new Error('Incorrect email or password. Please double-check your credentials and try again.');
    }

    try {
      await setPersistence(
        services.auth,
        input.rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      if (normalizedEmail === ADMIN_LOGIN_EMAIL && input.password === ADMIN_LOGIN_PASSWORD) {
        try {
          const cred = await signInWithEmailAndPassword(
            services.auth,
            normalizedEmail,
            input.password
          );
          return await this.ensureAndFetchUserProfile(cred.user);
        } catch (signInErr) {
          const code =
            typeof signInErr === 'object' && signInErr !== null && 'code' in signInErr
              ? String((signInErr as { code?: unknown }).code ?? '').toLowerCase()
              : '';
          if (
            code.includes('auth/user-not-found') ||
            code.includes('auth/invalid-credential')
          ) {
            const createdCred = await createUserWithEmailAndPassword(
              services.auth,
              normalizedEmail,
              input.password
            );
            await updateProfile(createdCred.user, { displayName: 'Super Admin' }).catch(
              () => undefined
            );
            return await this.ensureAndFetchUserProfile(createdCred.user);
          }
          throw signInErr;
        }
      }

      const cred = await signInWithEmailAndPassword(
        services.auth,
        trimmedEmail,
        input.password
      );
      return await this.ensureAndFetchUserProfile(cred.user);
    } catch (error) {
      throw new Error(toUserFriendlyAuthError(error));
    }
  },

  /**
   * Signs in via Google Popup and ensures a Firestore user profile exists.
   */
  async loginWithGoogle(): Promise<AuthenticatedUserProfile> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase is not configured yet.');
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(services.auth, provider);
      if (cred.user.email?.trim().toLowerCase() === ADMIN_LOGIN_EMAIL) {
        await signOut(services.auth);
        throw new Error('Administrator account must sign in with email and password.');
      }
      return await this.ensureAndFetchUserProfile(cred.user);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Administrator account must sign in with email and password.'
      ) {
        throw error;
      }
      throw new Error(toUserFriendlyAuthError(error));
    }
  },

  /**
   * Sends a Firebase password reset email.
   */
  async sendPasswordReset(email: string): Promise<void> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase is not configured yet.');
    }
    if (email.trim().toLowerCase() === ADMIN_LOGIN_EMAIL) {
      throw new Error('Password reset is disabled for the administrator account.');
    }
    try {
      await sendPasswordResetEmail(services.auth, email.trim());
    } catch (error) {
      throw new Error(toUserFriendlyAuthError(error));
    }
  },

  /**
   * Signs out current Firebase Auth session.
   */
  async logout(): Promise<void> {
    const services = getFirebaseServices();
    if (!services) return;
    await signOut(services.auth);
  },

  /**
   * Fetches user profile from Firestore `users/{uid}`, creating a default `user` document
   * ONLY if none exists yet (e.g., first Google login).
   */
  async ensureAndFetchUserProfile(authUser: FirebaseAuthUser): Promise<AuthenticatedUserProfile> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase is not configured.');
    }

    const userRef = doc(services.db, FIRESTORE_COLLECTIONS.users, authUser.uid);
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.GET,
        `${FIRESTORE_COLLECTIONS.users}/${authUser.uid}`,
        services.auth
      );
    }

    const isDesignatedAdmin = isPasswordAuthenticatedAdmin(authUser);

    if (snap.exists()) {
      const profile = mapFirestoreUser(snap.data() as FirestoreUserDoc);
      profile.role = isDesignatedAdmin ? 'admin' : 'user';
      if (isDesignatedAdmin) {
        profile.status = 'active';
      }
      return profile;
    }

    const safeName = (
      authUser.displayName?.trim() ||
      authUser.email?.split('@')[0]?.trim() ||
      'Customer'
    ).slice(0, 120);

    const createdDoc: FirestoreUserDoc = {
      uid: authUser.uid,
      name: safeName,
      email: (authUser.email ?? 'user@example.com').trim().slice(0, 180),
      phone: (authUser.phoneNumber ?? '').trim().slice(0, 32),
      photoUrl: (authUser.photoURL ?? '').trim().slice(0, 1000),
      role: 'user',
      balance: 0,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, createdDoc);
      emitNewUserAdminAlert(authUser.uid, createdDoc.name, createdDoc.email);
      ensureResellerProfileBestEffort(authUser.uid, createdDoc.name, createdDoc.email);
      const refreshed = await getDoc(userRef);
      const createdProfile = refreshed.exists()
        ? mapFirestoreUser(refreshed.data() as FirestoreUserDoc)
        : mapFirestoreUser(createdDoc);
      createdProfile.role = isDesignatedAdmin ? 'admin' : 'user';
      if (isDesignatedAdmin) {
        createdProfile.status = 'active';
      }
      return createdProfile;
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${FIRESTORE_COLLECTIONS.users}/${authUser.uid}`,
        services.auth
      );
    }
  },

  /**
   * Allows authenticated active users to update ONLY allowed profile fields:
   * `name`, `phone`, `photoUrl`, and `updatedAt`.
   * Strictly prohibited from modifying `role`, `balance`, or `status`.
   */
  async updateOwnProfile(uid: string, input: UpdateProfileInput): Promise<AuthenticatedUserProfile> {
    const services = getFirebaseServices();
    if (!services || !services.auth.currentUser) {
      throw new Error('You must be signed in to update your profile.');
    }

    const safeName = (input.name.trim() || 'Customer').slice(0, 120);
    const safePhone = input.phone.trim().slice(0, 32);
    const safePhotoUrl = input.photoUrl.trim().slice(0, 1000);

    const userRef = doc(services.db, FIRESTORE_COLLECTIONS.users, uid);
    try {
      await updateDoc(userRef, {
        name: safeName,
        phone: safePhone,
        photoUrl: safePhotoUrl,
        updatedAt: serverTimestamp(),
      });

      await updateProfile(services.auth.currentUser, {
        displayName: safeName,
        ...(safePhotoUrl.startsWith('http') ? { photoURL: safePhotoUrl } : {}),
      });

      const refreshed = await getDoc(userRef);
      if (!refreshed.exists()) {
        throw new Error('Profile document not found.');
      }
      return mapFirestoreUser(refreshed.data() as FirestoreUserDoc);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${FIRESTORE_COLLECTIONS.users}/${uid}`,
        services.auth
      );
    }
  },
};
