import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ResidentialComplex } from '../types';
import { INITIAL_USERS, INITIAL_COMPLEXES } from '../lib/initialData';
import { soundEngine } from '../lib/sound';

export interface AuthContextType {
  currentUser: User | null;
  currentComplex: ResidentialComplex | null;
  isLoading: boolean;
  login: (email: string, pass: string) => { success: boolean; message?: string; user?: User };
  loginAsRole: (roleSlug: string) => void;
  registerWithCode: (data: {
    name: string;
    email: string;
    phone?: string;
    code: string;
    apartmentNumber: string;
  }) => { success: boolean; message?: string };
  registerWithoutCode: (data: {
    name: string;
    email: string;
    phone?: string;
    complexId: number;
    requestedBlockOrApt: string;
    facePhoto: string;
  }) => { success: boolean; message?: string };
  logout: () => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentComplex: React.Dispatch<React.SetStateAction<ResidentialComplex | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'conjuntos_app_current_user';
const LOCAL_STORAGE_COMPLEX_KEY = 'conjuntos_app_current_complex';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentComplex, setCurrentComplex] = useState<ResidentialComplex | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage or default to Admin demo account
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
          const complex = INITIAL_COMPLEXES.find((c) => c.id === parsedUser.residential_complex_id) || INITIAL_COMPLEXES[0];
          setCurrentComplex(complex);
        }
      } else {
        // Default to Admin
        const defaultAdmin = INITIAL_USERS.find((u) => u.email.toLowerCase() === 'admin@lp.app') || INITIAL_USERS[1];
        setCurrentUser(defaultAdmin);
        setCurrentComplex(INITIAL_COMPLEXES[0]);
      }
    } catch {
      setCurrentUser(INITIAL_USERS[1]);
      setCurrentComplex(INITIAL_COMPLEXES[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const login = (email: string, _pass: string) => {
    // Check saved or initial users
    const allUsers: User[] = JSON.parse(localStorage.getItem('conjuntos_users') || 'null') || INITIAL_USERS;
    const user = allUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return { success: false, message: 'Credenciales inválidas. Por favor verifica tu correo y contraseña.' };
    }

    if (user.status === 'blocked') {
      return { success: false, message: 'Tu cuenta ha sido bloqueada. Por favor contacta a la administración.' };
    }

    if (user.status === 'pending') {
      const complexes: ResidentialComplex[] = JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
      const reqComplex = complexes.find((c) => c.id === user.requested_complex_id);
      const complexName = reqComplex ? reqComplex.name : 'tu conjunto residencial';
      return {
        success: false,
        message: `Tu cuenta está en espera de aprobación por el administrador de ${complexName}. Te notificaremos una vez sea aprobada.`,
      };
    }

    let complex: ResidentialComplex | null = null;
    if (user.residential_complex_id) {
      const complexes: ResidentialComplex[] = JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
      complex = complexes.find((c) => c.id === user.residential_complex_id) || complexes[0];
    }

    saveSession(user, complex);
    soundEngine.playSuccessChime();
    return { success: true, user };
  };

  const loginAsRole = (roleSlug: string) => {
    const allUsers: User[] = JSON.parse(localStorage.getItem('conjuntos_users') || 'null') || INITIAL_USERS;
    const target = allUsers.find((u) => u.role === roleSlug && u.status === 'active');
    if (target) {
      const complexes: ResidentialComplex[] = JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
      const complex = target.residential_complex_id
        ? complexes.find((c) => c.id === target.residential_complex_id) || complexes[0]
        : complexes[0];
      saveSession(target, complex);
      soundEngine.playSuccessChime();
    }
  };

  const registerWithCode = (data: {
    name: string;
    email: string;
    phone?: string;
    code: string;
    apartmentNumber: string;
  }) => {
    const complexes: ResidentialComplex[] = JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
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

    saveSession(newUser, complex);
    soundEngine.playSuccessChime();
    return { success: true };
  };

  const registerWithoutCode = (data: {
    name: string;
    email: string;
    phone?: string;
    complexId: number;
    requestedBlockOrApt: string;
    facePhoto: string;
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

    // Also inject notification to admin of requested complex
    const complexes: ResidentialComplex[] = JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
    const reqComplex = complexes.find((c) => c.id === data.complexId);

    soundEngine.playNotificationBeep();
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
        loginAsRole,
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
