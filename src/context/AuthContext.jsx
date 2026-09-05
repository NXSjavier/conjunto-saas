import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBaseUrl, isStandalone } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { loginDirect, registerWithCodeDirect, registerWithoutCodeDirect, resetPasswordDirect } from '../lib/supabaseRepo';
import { initPushNotifications, cleanupPushNotifications } from '../lib/pushNotifications';

const AuthContext = createContext(undefined);
const SESSION_KEY = 'conjuntos_session';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentComplex, setCurrentComplex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiBase = getApiBaseUrl();

  useEffect(() => {
    const loadProfile = async (authUser) => {
      if (!authUser?.id) return false;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, complex_id, apartment, phone, status, face_photo, fcm_token, created_at')
        .eq('auth_user_id', authUser.id)
        .single();
      if (error || !profile) return false;
      if (profile.status === 'blocked' || profile.status === 'pending') {
        await supabase.auth.signOut();
        return false;
      }
      let complex = null;
      if (profile.complex_id) {
        const { data } = await supabase.from('residential_complexes').select('*').eq('id', profile.complex_id).single();
        complex = data || null;
      }
      setCurrentUser(profile);
      setCurrentComplex(complex);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: profile, complex }));
      return true;
    };

    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) await loadProfile(data.session.user);
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentComplex(null);
      } else if (session?.user) {
        loadProfile(session.user);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const saveSession = (user, complex) => {
    setCurrentUser(user);
    setCurrentComplex(complex);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, complex }));
    // Init push notifications after login
    if (user?.auth_user_id) {
      initPushNotifications(user.auth_user_id).catch(() => {});
    }
  };

  const login = async (email, pass) => {
    // Modo standalone: consulta directa a Supabase, sin IP/servidor
    if (isStandalone() || !apiBase) {
      try {
        const { user, complex } = await loginDirect(email, pass);
        saveSession(user, complex);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message || 'Error al iniciar sesión' };
      }
    }
    // Modo web con servidor
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Error al iniciar sesión' };
      if (data.user) {
        saveSession(data.user, data.complex);
        return { success: true };
      }
      return { success: false, error: 'Usuario no encontrado' };
    } catch (err) {
      // fallback a supabase directo
      try {
        const { user, complex } = await loginDirect(email, pass);
        saveSession(user, complex);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message || err.message || 'Error de conexión' };
      }
    }
  };

  const loginAsDemo = async () => {
    await login('joelsolis17900@gmail.com', 'superadmin123');
  };

  const registerWithCode = async (data) => {
    if (isStandalone() || !apiBase) {
      try {
        const { user } = await registerWithCodeDirect(data);
        const loginRes = await login(data.email, data.password);
        if (loginRes.success) return { success: true };
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message || 'Error al registrar' };
      }
    }
    try {
      const res = await fetch(`${apiBase}/api/auth/register-with-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Error al registrar' };
      const loginRes = await login(data.email, data.password);
      if (loginRes.success) return { success: true };
      return { success: false, error: 'Registro exitoso pero error al sincronizar sesión' };
    } catch (err) {
      try {
        await registerWithCodeDirect(data);
        const r = await login(data.email, data.password);
        return r;
      } catch (e) {
        return { success: false, error: e.message || err.message || 'Error de conexión' };
      }
    }
  };

  const registerWithoutCode = async (data) => {
    if (isStandalone() || !apiBase) {
      try {
        const res = await registerWithoutCodeDirect(data);
        return { success: true, message: res.message };
      } catch (err) {
        return { success: false, error: err.message || 'Error en la solicitud' };
      }
    }
    try {
      const res = await fetch(`${apiBase}/api/auth/register-no-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Error en la solicitud' };
      return { success: true, message: resData.message };
    } catch (err) {
      try {
        const res = await registerWithoutCodeDirect(data);
        return { success: true, message: res.message };
      } catch (e) {
        return { success: false, error: e.message || err.message || 'Error de conexión' };
      }
    }
  };

  const resetPassword = async (email, newPass) => {
    if (isStandalone() || !apiBase) {
      try {
        await resetPasswordDirect(email, newPass);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message || 'Error al restablecer' };
      }
    }
    try {
      const res = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Error al restablecer' };
      return { success: true };
    } catch (err) {
      try {
        await resetPasswordDirect(email, newPass);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message || err.message || 'Error de conexión' };
      }
    }
  };

  const logout = async () => {
    try {
      cleanupPushNotifications();
      await supabase.auth.signOut();
      localStorage.removeItem(SESSION_KEY);
      setCurrentUser(null);
      setCurrentComplex(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateUserSession = (user) => {
    setCurrentUser(user);
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      const session = JSON.parse(saved);
      session.user = user;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  };

  const updateComplexSession = (complex) => {
    setCurrentComplex(complex);
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      const session = JSON.parse(saved);
      session.complex = complex;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentComplex, isLoading, login, loginAsDemo, registerWithCode, registerWithoutCode, resetPassword, logout, updateUserSession, updateComplexSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
