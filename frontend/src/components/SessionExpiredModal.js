import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Clock } from 'lucide-react';

export const SessionExpiredModal = () => {
    const { sessionExpired, dismissSessionExpired } = useAuth();
    const navigate = useNavigate();

    const handleConfirm = () => {
        dismissSessionExpired();
        navigate('/login', { replace: true });
    };

    return (
        <Dialog open={sessionExpired} onOpenChange={(open) => { if (!open) handleConfirm(); }}>
            <DialogContent className="rounded-2xl p-6 max-w-md" data-testid="session-expired-modal">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <DialogTitle>Your session has expired</DialogTitle>
                    </div>
                    <DialogDescription>
                        For security, you've been signed out. Please log in again to continue.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex justify-end gap-2 mt-4">
                    <Button onClick={handleConfirm} className="rounded-xl" data-testid="session-expired-login-btn">
                        Log in again
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
