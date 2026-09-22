import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await authService.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          } else {
            const currentUser = authService.getCurrentUser();
            if (currentUser) setUser(currentUser);
          }
        }
      } catch (error) {
        const currentUser = authService.getCurrentUser();
        if (currentUser) setUser(currentUser);
      } finally {
        setLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const login = async (username, password) => {
    try {
      // authService.login คืน response.data (ของ axios)
      // ซึ่งมีโครงสร้าง: { success: true, data: { token, user } }
      // ดังนั้น user อยู่ที่ response.data.data.user
      const response = await authService.login(username, password);
      const userData = response?.data?.user;
      if (userData) {
        setUser(userData);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      setUser(response.data.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (updatedUserData) => {
    setUser(prev => {
      const newUser = { ...prev, ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  };

  const value = {
    user,
    setUser,
    updateUser,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user || !!localStorage.getItem('token'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
