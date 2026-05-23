import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

/**
 * Reusable confirmation dialog with the record name baked into the message.
 *
 * Usage:
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete student"
 *   recordName="John Smith"
 *   message={"This will permanently delete John Smith and all related records."}
 *   confirmLabel="Delete"
 *   onConfirm={async () => { ... }}
 *   destructive
 * />
 */
export const ConfirmDialog = ({
    open,
    onOpenChange,
    title = 'Are you sure?',
    recordName,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    destructive = false,
    submitting = false,
    testIdPrefix = 'confirm',
}) => {
    const handleConfirm = async () => {
        if (submitting) return;
        await onConfirm?.();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-2xl p-6 max-w-md" data-testid={`${testIdPrefix}-dialog`}>
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${destructive ? 'bg-rose-100' : 'bg-amber-100'}`}>
                            <AlertTriangle className={`w-5 h-5 ${destructive ? 'text-rose-600' : 'text-amber-600'}`} />
                        </div>
                        <DialogTitle>
                            {title}
                            {recordName ? <span className="font-normal"> &mdash; {recordName}?</span> : '?'}
                        </DialogTitle>
                    </div>
                    {message ? (
                        <DialogDescription>{message}</DialogDescription>
                    ) : (
                        <DialogDescription>
                            This action cannot be undone.
                        </DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange?.(false)}
                        className="rounded-xl"
                        disabled={submitting}
                        data-testid={`${testIdPrefix}-cancel`}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="rounded-xl"
                        data-testid={`${testIdPrefix}-ok`}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
