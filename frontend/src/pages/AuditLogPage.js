import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, History } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACTION_COLORS = {
    create: 'bg-emerald-100 text-emerald-800',
    update: 'bg-sky-100 text-sky-800',
    delete: 'bg-rose-100 text-rose-800',
    lock: 'bg-amber-100 text-amber-800',
    unlock: 'bg-violet-100 text-violet-800',
    convert: 'bg-indigo-100 text-indigo-800',
};

const ENTITY_TYPES = ['', 'student', 'gradebook', 'enrollment', 'admission', 'discipline', 'health', 'report_card', 'user', 'school'];

export default function AuditLogPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState([]);
    const [entityType, setEntityType] = useState('');

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityType]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', '500');
            if (entityType) params.set('entity_type', entityType);
            const res = await axios.get(`${API}/audit-logs?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEntries(res.data);
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Failed to load audit log');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6" data-testid="audit-log-page">
            <div>
                <h1 className="text-3xl font-bold">Audit Log</h1>
                <p className="text-muted-foreground">Who changed what, and when. Newest first.</p>
            </div>

            <Card className="rounded-2xl">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <CardTitle>Activity</CardTitle>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Filter by type:</span>
                            <Select value={entityType || 'all'} onValueChange={(v) => setEntityType(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-[180px] rounded-lg" data-testid="audit-entity-filter"><SelectValue placeholder="All" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    {ENTITY_TYPES.filter(Boolean).map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-12">
                            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <h3 className="text-lg font-medium">No audit entries yet</h3>
                            <p className="text-muted-foreground">Activity will appear here as users make changes.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm" data-testid="audit-log-table">
                                <thead className="bg-muted/50 sticky top-0">
                                    <tr>
                                        <th className="text-left p-3 font-medium">When</th>
                                        <th className="text-left p-3 font-medium">Actor</th>
                                        <th className="text-left p-3 font-medium">Action</th>
                                        <th className="text-left p-3 font-medium">Entity</th>
                                        <th className="text-left p-3 font-medium">Label</th>
                                        <th className="text-left p-3 font-medium">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((row, idx) => (
                                        <tr key={row.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                            <td className="p-3 whitespace-nowrap text-xs">{new Date(row.created_at).toLocaleString()}</td>
                                            <td className="p-3">
                                                <div className="font-medium">{row.actor_name || '—'}</div>
                                                <div className="text-xs text-muted-foreground capitalize">{row.actor_role}</div>
                                            </td>
                                            <td className="p-3">
                                                <Badge className={`${ACTION_COLORS[row.action] || 'bg-slate-100 text-slate-700'} capitalize`}>
                                                    {row.action}
                                                </Badge>
                                            </td>
                                            <td className="p-3 capitalize">{row.entity_type}</td>
                                            <td className="p-3">{row.entity_label || row.entity_id?.slice(0, 8) || '—'}</td>
                                            <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                                                {row.details && Object.keys(row.details).length > 0
                                                    ? JSON.stringify(row.details)
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
