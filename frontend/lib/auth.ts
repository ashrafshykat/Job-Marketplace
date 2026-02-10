export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'buyer' | 'problem_solver';
  profile?: {
    bio?: string;
    skills?: string[];
    experience?: string;
    portfolio?: string;
  };
}

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setStoredUser = (user: User) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const setStoredToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

export const clearAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};

export const hasRole = (role: 'admin' | 'buyer' | 'problem_solver'): boolean => {
  const user = getStoredUser();
  return user?.role === role;
};

