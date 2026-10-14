import { useEffect, useState } from 'react';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export function setToken(token: string, user: object) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}

export function clearToken() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('admin_user');
  return u ? JSON.parse(u) : null;
}

export function isSuperAdmin(): boolean {
  const u = getUser();
  return u?.role === 'super_admin';
}

/**
 * The signed-in user, but only once the browser has taken over.
 *
 * The session lives in localStorage, which the server cannot read, so calling
 * getUser() while rendering makes the server and the first client render
 * disagree — React throws the server markup away and hydration fails. This
 * returns null until mounted, so both renders start from the same place and
 * role-gated UI simply appears a tick later.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setReady(true);
  }, []);

  return {
    user,
    ready,
    role: user?.role ?? '',
    isSuperAdmin: user?.role === 'super_admin',
    isAdmin: ['super_admin', 'admin'].includes(user?.role),
    isProfessor: user?.role === 'professor',
  };
}
