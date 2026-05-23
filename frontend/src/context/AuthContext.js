import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LAST_PAGE_KEY = 'lumina_last_page';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [sessionExpired, setSessionExpired] = useState(false);
    const interceptorId = useRef(null);

    // Global axios 401 interceptor — set up once
    useEffect(() => {
        if (interceptorId.current !== null) return;
        interceptorId.current = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const status = error?.response?.status;
                const url = error?.config?.url || '';
                // Only flag truly expired tokens — ignore the initial 401 on /auth/me when no token
                if (status === 401 && localStorage.getItem('token') && !url.includes('/auth/login')) {
                    setSessionExpired(true);
                }
                return Promise.reject(error);
            }
        );
    }, []);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await axios.get(`${API}/auth/me`);
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            // Don't call logout() here — let the session-expired modal handle it
            if (error?.response?.status !== 401) {
                hardLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (schoolCode, username, password) => {
        const response = await axios.post(`${API}/auth/login`, {
            school_code: schoolCode.toUpperCase(),
            username,
            password,
        });
        const { access_token, user: userData } = response.data;

        localStorage.setItem('token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setToken(access_token);
        setUser(userData);
        setSessionExpired(false);

        return userData;
    };

    const hardLogout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    const logout = () => {
        hardLogout();
        setSessionExpired(false);
        // Don't clear LAST_PAGE_KEY — we want to restore it on next login
    };

    // Track last visited page (skip /login and /forgot-password)
    const rememberLastPage = (pathname) => {
        if (!pathname) return;
        if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
            return;
        }
        try {
            localStorage.setItem(LAST_PAGE_KEY, pathname);
        } catch (_e) {
            // ignore quota
        }
    };

    const getLastPage = () => {
        try {
            return localStorage.getItem(LAST_PAGE_KEY) || '/dashboard';
        } catch (_e) {
            return '/dashboard';
        }
    };

    const dismissSessionExpired = () => {
        setSessionExpired(false);
        hardLogout();
    };

    const value = {
        user,
        token,
        loading,
        sessionExpired,
        login,
        logout,
        dismissSessionExpired,
        rememberLastPage,
        getLastPage,
        isAuthenticated: !!user,
        isSuperuser: user?.role === 'superuser',
        isAdmin: user?.role === 'admin' || user?.role === 'superuser',
        isTeacher: user?.role === 'teacher',
        isParent: user?.role === 'parent',
        hasPermission: (permission) => {
            if (user?.role === 'superuser') return true;
            return user?.permissions?.includes(permission) || false;
        },
        schoolCode: user?.school_code,
    };

    return (
        <AuthContext.Provider value={value}>
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
