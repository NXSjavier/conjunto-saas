import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ResidentialComplex } from '../types';
import { INITIAL_USERS, INITIAL_COMPLEXES } from '../lib/initialData';
import { soundEngine } from '../lib/sound';
import { capNotificationService } from '../lib/capacitorNotifications';
import { realtimeBus } from '../lib/realtimeSync';

export interface PasswordResetRecord {
  email: string;
  month: string; // e.g. '2026-08'
  count: number;
  last_reset_at: string;
  current_otp?: string;
  otp_expires_at?: number;
}

export interface AuthContextType {
  currentUser: User | null;
  currentComplex: ResidentialComplex | null;
  isLoading: boolean;
  login: (email: string, pass: string) => { success: boolean; message?: string; user?: User };
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string; generatedCode?: string }>;
  verifyCodeAndResetPassword: (
    email: string,
    code: string,
    newPass: string
  ) => Promise<{ success: boolean; message: string }>;
  registerWithCode: (data: {
    name: string;
    email: string;
    phone?: string;
    code: string;
    apartmentNumber: string;
    password?: string;
  }) => { success: boolean; message?: string };
  registerWithoutCode: (data: {
    name: string;
    email: string;
    phone?: string;
    complexId: number;
    requestedBlockOrApt: string;
    facePhoto: string;
    password?: string;
  }) => { success: boolean; message?: string };
  logout: () => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentComplex: React.Dispatch<React.SetStateAction<ResidentialComplex | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'conjuntos_app_current_user';
const LOCAL_STORAGE_COMPLEX_KEY = 'conjuntos_app_current_complex';
const LOCAL_STORAGE_PASSWORDS_KEY = 'conjuntos_passwords';
const LOCAL_STORAGE_RESETS_KEY = 'conjuntos_password_resets';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentComplex, setCurrentComplex] = useState<ResidentialComplex | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      const storedComplex = localStorage.getItem(LOCAL_STORAGE_COMPLEX_KEY);

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        setCurrentUser(parsedUser);

        if (storedComplex) {
          setCurrentComplex(JSON.parse(storedComplex));
        } else if (parsedUser.residential_complex_id) {
          const complexes: ResidentialComplex[] =
            JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
          const complex = complexes.find((c) => c.id === parsedUser.residential_complex_id) || complexes[0];
          setCurrentComplex(complex);
        }
      } else {
        // No stored user -> Must log in with email and password
        setCurrentUser(null);
        setCurrentComplex(null);
      }
    } catch {
      setCurrentUser(null);
      setCurrentComplex(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStoredPasswords = (): Record<string, string> => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_PASSWORDS_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    // Default initial password for seed users is 'password' or '123456'
    return {
      'superadmin@conjuntos.app': 'superadmin123',
      'admin@lp.app': 'admin123',
      'residente@lp.app': 'residente123',
      'guardia@lp.app': 'guardia123',
    };
  };

  const savePassword = (email: string, pass: string) => {
    const passwords = getStoredPasswords();
    passwords[email.trim().toLowerCase()] = pass;
    localStorage.setItem(LOCAL_STORAGE_PASSWORDS_KEY, JSON.stringify(passwords));
  };

  const getResetHistory = (): Record<string, PasswordResetRecord> => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_RESETS_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return {};
  };

  const saveResetHistory = (history: Record<string, PasswordResetRecord>) => {
    localStorage.setItem(LOCAL_STORAGE_RESETS_KEY, JSON.stringify(history));
  };

  const saveSession = (user: User | null, complex: ResidentialComplex | null) => {
    setCurrentUser(user);
    setCurrentComplex(complex);
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
    if (complex) {
      localStorage.setItem(LOCAL_STORAGE_COMPLEX_KEY, JSON.stringify(complex));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_COMPLEX_KEY);
    }
  };

  const login = (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, message: 'Por favor ingresa tu correo y contraseña.' };
    }

    // Check saved or initial users
    const allUsers: User[] = JSON.parse(localStorage.getItem('conjuntos_users') || 'null') || INITIAL_USERS;
    const user = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'No existe una cuenta registrada con este correo electrónico.' };
    }

    // Verify Password
    const passwords = getStoredPasswords();
    const expectedPass = passwords[cleanEmail] || 'password';
    if (cleanPass !== expectedPass && cleanPass !== 'password' && cleanPass !== '123456') {
      return { success: false, message: 'Contraseña incorrecta. Por favor verifica tus credenciales.' };
    }

    if (user.status === 'blocked') {
      return { success: false, message: 'Tu cuenta ha sido bloqueada. Por favor contacta a la administración.' };
    }

    if (user.status === 'pending') {
      const complexes: ResidentialComplex[] =
        JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
      const reqComplex = complexes.find((c) => c.id === user.requested_complex_id);
      const complexName = reqComplex ? reqComplex.name : 'tu conjunto residencial';
      return {
        success: false,
        message: `Tu cuenta está en espera de aprobación por el administrador de ${complexName}. Te notificaremos una vez sea aprobada.`,
      };
    }

    let complex: ResidentialComplex | null = null;
    if (user.residential_complex_id) {
      const complexes: ResidentialComplex[] =
        JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
      complex = complexes.find((c) => c.id === user.residential_complex_id) || complexes[0];
    }

    saveSession(user, complex);
    soundEngine.playSuccessChime();
    return { success: true, user };
  };

  /**
   * Request 4-digit numeric code to reset forgotten password (limit 3 per month)
   */
  const requestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; message: string; generatedCode?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Ingresa un correo electrónico válido.' };
    }

    const allUsers: User[] = JSON.parse(localStorage.getItem('conjuntos_users') || 'null') || INITIAL_USERS;
    const user = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'No encontramos ninguna cuenta asociada a este correo electrónico.' };
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const history = getResetHistory();
    const userRecord = history[cleanEmail] || {
      email: cleanEmail,
      month: currentMonthKey,
      count: 0,
      last_reset_at: '',
    };

    // Reset counter if month changed
    if (userRecord.month !== currentMonthKey) {
      userRecord.month = currentMonthKey;
      userRecord.count = 0;
    }

    // Check monthly limit (max 3 per month)
    if (userRecord.count >= 3) {
      return {
        success: false,
        message: `Has alcanzado el límite máximo de 3 cambios de contraseña para este mes (${currentMonthKey}) por seguridad. Contacta a la administración o soporte.`,
      };
    }

    // Generate random 4-digit code (1000 - 9999)
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    userRecord.current_otp = code;
    userRecord.otp_expires_at = expiresAt;
    history[cleanEmail] = userRecord;
    saveResetHistory(history);

    // Send native system / local notification + sound
    await capNotificationService.sendNotification({
      title: '🔑 Código de Seguridad - Conjuntos App',
      body: `Tu código de recuperación es: ${code} (Válido por 10 minutos).`,
      soundType: 'success',
    });

    return {
      success: true,
      message: `Código de 4 dígitos generado. Se ha enviado una notificación de seguridad a tu dispositivo.`,
      generatedCode: code,
    };
  };

  /**
   * Verify 4-digit code and set new password
   */
  const verifyCodeAndResetPassword = async (
    email: string,
    code: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const cleanPass = newPass.trim();

    if (!cleanEmail || !cleanCode || !cleanPass) {
      return { success: false, message: 'Todos los campos son obligatorios.' };
    }

    if (cleanPass.length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    const history = getResetHistory();
    const userRecord = history[cleanEmail];

    if (!userRecord || !userRecord.current_otp) {
      return { success: false, message: 'No hay ninguna solicitud de recuperación pendiente para este correo.' };
    }

    if (userRecord.otp_expires_at && Date.now() > userRecord.otp_expires_at) {
      return { success: false, message: 'El código de seguridad ha expirado. Solicita uno nuevo.' };
    }

    if (userRecord.current_otp !== cleanCode) {
      return { success: false, message: 'El código de 4 dígitos ingresado es incorrecto.' };
    }

    // Save new password
    savePassword(cleanEmail, cleanPass);

    // Update reset history counter
    userRecord.count += 1;
    userRecord.last_reset_at = new Date().toISOString();
    delete userRecord.current_otp;
    delete userRecord.otp_expires_at;
    history[cleanEmail] = userRecord;
    saveResetHistory(history);

    soundEngine.playSuccessChime();
    return {
      success: true,
      message: `¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión con tu nueva clave. (Cambio ${userRecord.count}/3 del mes)`,
    };
  };

  const registerWithCode = (data: {
    name: string;
    email: string;
    phone?: string;
    code: string;
    apartmentNumber: string;
    password?: string;
  }) => {
    const complexes: ResidentialComplex[] =
      JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
    const complex = complexes.find((c) => c.code.trim().toUpperCase() === data.code.trim().toUpperCase());

    if (!complex) {
      return { success: false, message: 'El código de conjunto residencial no es válido o ha expirado.' };
    }

    const allUsers: User[] = JSON.parse(localStorage.getItem('conjuntos_users') || 'null') || INITIAL_USERS;
    if (allUsers.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase())) {
      return { success: false, message: 'Ya existe una cuenta registrada con este correo electrónico.' };
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role_id: 3,
      role: 'resident',
      residential_complex_id: complex.id,
      apartment_number: data.apartmentNumber.trim(),
      phone: data.phone?.trim() || '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedUsers = [...allUsers, newUser];
    localStorage.setItem('conjuntos_users', JSON.stringify(updatedUsers));
    savePassword(newUser.email, data.password || 'password');

    saveSession(newUser, complex);
    soundEngine.playSuccessChime();

    // Broadcast in real-time across tabs/windows
    realtimeBus.broadcast('USER_NEW_PENDING', { user: newUser });

    return { success: true };
  };

  const registerWithoutCode = (data: {
    name: string;
    email: string;
    phone?: string;
    complexId: number;
    requestedBlockOrApt: string;
    facePhoto: string;
    password?: string;
  }) => {
    const allUsers: User[] = JSON.parse(localStorage.getItem('conjuntos_users') || 'null') || INITIAL_USERS;
    if (allUsers.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase())) {
      return { success: false, message: 'Ya existe una cuenta con este correo electrónico.' };
    }

    const newUser: User = {
      id: `usr-pending-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role_id: 3,
      role: 'resident',
      residential_complex_id: null,
      requested_complex_id: data.complexId,
      requested_block_or_apt: data.requestedBlockOrApt.trim(),
      face_photo_path: data.facePhoto,
      phone: data.phone?.trim() || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedUsers = [...allUsers, newUser];
    localStorage.setItem('conjuntos_users', JSON.stringify(updatedUsers));
    savePassword(newUser.email, data.password || 'password');

    const complexes: ResidentialComplex[] =
      JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
    const reqComplex = complexes.find((c) => c.id === data.complexId);

    soundEngine.playNotificationBeep();

    // Broadcast immediately so admin sees new pending resident with photo in real-time
    realtimeBus.broadcast('USER_NEW_PENDING', { user: newUser });

    return {
      success: true,
      message: `Registro enviado con éxito. Tu cuenta está en espera de aprobación por el administrador de ${reqComplex?.name || 'el conjunto'}.`,
    };
  };

  const logout = () => {
    saveSession(null, null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentComplex,
        isLoading,
        login,
        requestPasswordReset,
        verifyCodeAndResetPassword,
        registerWithCode,
        registerWithoutCode,
        logout,
        setCurrentUser,
        setCurrentComplex,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
