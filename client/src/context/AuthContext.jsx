import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const ADMIN_ROLES = [
  'ADMIN',
  'NATIONAL_SUPER_ADMIN',
  'STATE_ADMIN',
  'DISTRICT_ADMIN',
  'LOCAL_BODY_ADMIN',
  'DEPARTMENT_ADMIN',
  'FIELD_OFFICER',
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('codecivic_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize user profile from token on mount
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token invalid or expired
          logout();
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Login failed.');
    }

    localStorage.setItem('codecivic_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Registration failed.');
    }

    localStorage.setItem('codecivic_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('codecivic_token');
    setToken(null);
    setUser(null);
  };

  const setAuthSession = (sessionToken, sessionUser) => {
    localStorage.setItem('codecivic_token', sessionToken);
    setToken(sessionToken);
    setUser(sessionUser);
  };

  const authFetch = async (url, options = {}) => {
    const headers = options.headers ? { ...options.headers } : {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const isAdmin = Boolean(user && ADMIN_ROLES.includes(user.role));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin,
        isSuperAdmin: user?.role === 'ADMIN' || user?.role === 'NATIONAL_SUPER_ADMIN',
        isStateAdmin: user?.role === 'STATE_ADMIN',
        isDistrictAdmin: user?.role === 'DISTRICT_ADMIN',
        isLocalAdmin: user?.role === 'LOCAL_BODY_ADMIN',
        isDeptAdmin: user?.role === 'DEPARTMENT_ADMIN',
        isFieldOfficer: user?.role === 'FIELD_OFFICER',
        role: user?.role || 'GUEST',
        login,
        register,
        logout,
        authFetch,
        setUser,
        setAuthSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
