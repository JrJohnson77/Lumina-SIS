import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AppFooter
 * Reusable application footer displayed across the entire app.
 * Provides quick access to Privacy Policy and Terms of Use, plus copyright.
 *
 * Variants:
 *  - variant="app"  (default) : used inside the authenticated Layout (main content area)
 *  - variant="auth" : used on full-screen auth pages (login / forgot-password)
 */
export const AppFooter = ({ variant = 'app', className = '' }) => {
    const year = new Date().getFullYear();

    const base =
        variant === 'auth'
            ? 'w-full px-6 py-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/60 bg-background/70 backdrop-blur'
            : 'mt-8 pt-4 pb-2 px-1 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/60';

    return (
        <footer className={`${base} ${className}`} data-testid="app-footer">
            <div className="flex items-center gap-2">
                <span>&copy; {year} Lumina-SIS. All rights reserved.</span>
            </div>
            <nav className="flex items-center gap-4" aria-label="Legal">
                <Link
                    to="/privacy"
                    className="hover:text-foreground hover:underline transition-colors"
                    data-testid="footer-privacy-link"
                >
                    Privacy Policy
                </Link>
                <span className="text-border">|</span>
                <Link
                    to="/terms"
                    className="hover:text-foreground hover:underline transition-colors"
                    data-testid="footer-terms-link"
                >
                    Terms of Use
                </Link>
            </nav>
        </footer>
    );
};

export default AppFooter;
