// src/lib/auth.ts
// Authentication helper functions

import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: 'super_admin' | 'partner_user';
  partner_code: string | null;
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in error:', error);
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Sign out error:', error);
    return { error: error.message };
  }

  return { error: null };
}

// Get current session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Get session error:', error);
    return { session: null, error: error.message };
  }

  return { session: data.session, error: null };
}

// Get current user
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Get user error:', error);
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

// Check if user is super admin
export async function isSuperAdmin(): Promise<boolean> {
  const { user } = await getCurrentUser();
  
  if (!user) return false;

  // Check user metadata for role
  const role = user.user_metadata?.role;
  return role === 'super_admin';
}

// Require authentication for a page
export async function requireAuth() {
  const { session } = await getSession();
  return session !== null;
}

// Require super admin for a page
export async function requireSuperAdmin() {
  const isAuth = await requireAuth();
  if (!isAuth) return false;
  
  return await isSuperAdmin();
}