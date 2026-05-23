import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, Plus, Edit2, Trash2, Users, CheckCircle2, Clock, UserPlus, X, ArrowRightCircle } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdmissionsPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [inquiries, setInquiries] = useState([]);
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState({ inquiries: 0, applications: 0, accepted: 0, pending: 0 });
    const [showDialog, setShowDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [convertingId, setConvertingId] = useState(null);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        student_first_name: '', student_last_name: '', parent_name: '', parent_email: '',
        parent_phone: '', grade_level: '', status: 'inquiry'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [inqRes, appRes] = await Promise.all([
                axios.get(`${API}/admissions/inquiries`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API}/admissions/applications`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setInquiries(inqRes.data);
            setApplications(appRes.data);
            
            const stats = {
                inquiries: inqRes.data.length,
                applications: appRes.data.length,
                accepted: appRes.data.filter(a => a.status === 'accepted').length,
                pending: appRes.data.filter(a => a.status === 'pending').length
            };
            setStats(stats);
        } catch (error) {
            toast.error('Failed to load admissions data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            if (editingItem) {
                await axios.put(`${API}/admissions/${editingItem.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Updated successfully');
            } else {
                await axios.post(`${API}/admissions`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Created successfully');
            }
            setShowDialog(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            const msg = error?.response?.data?.detail || 'Failed to save';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await axios.delete(`${API}/admissions/${deleteTarget.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Deleted "${deleteTarget.name}"`);
            setDeleteTarget(null);
            fetchData();
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Failed to delete');
        } finally {
            setDeleting(false);
        }
    };

    const handleConvert = async (item) => {
        setConvertingId(item.id);
        try {
            const res = await axios.post(`${API}/admissions/${item.id}/convert`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Application converted to student');
            // Navigate to the new student's profile (pre-fills are already in place)
            navigate(`/students/${res.data.id}`);
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Failed to convert application');
        } finally {
            setConvertingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admissions</h1>
                    <p className="text-muted-foreground">Manage inquiries and applications</p>
                </div>
                <Button onClick={() => { setEditingItem(null); setFormData({ student_first_name: '', student_last_name: '', parent_name: '', parent_email: '', parent_phone: '', grade_level: '', status: 'inquiry' }); setShowDialog(true); }} className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    New Inquiry
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10"><Users className="w-6 h-6 text-blue-600" /></div>
                            <div>
                                <p className="text-sm text-muted-foreground">Inquiries</p>
                                <p className="text-2xl font-bold">{stats.inquiries}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-violet-500/10"><UserPlus className="w-6 h-6 text-violet-600" /></div>
                            <div>
                                <p className="text-sm text-muted-foreground">Applications</p>
                                <p className="text-2xl font-bold">{stats.applications}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-500/10"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
                            <div>
                                <p className="text-sm text-muted-foreground">Accepted</p>
                                <p className="text-2xl font-bold">{stats.accepted}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-500/10"><Clock className="w-6 h-6 text-amber-600" /></div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold">{stats.pending}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="inquiries" className="w-full">
                <TabsList>
                    <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
                    <TabsTrigger value="applications">Applications</TabsTrigger>
                </TabsList>

                <TabsContent value="inquiries">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Inquiries</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {inquiries.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                    <h3 className="text-lg font-medium mb-2">No inquiries yet</h3>
                                    <p className="text-muted-foreground mb-4">Start by adding a new inquiry</p>
                                    <Button onClick={() => { setEditingItem(null); setFormData({ student_first_name: '', student_last_name: '', parent_name: '', parent_email: '', parent_phone: '', grade_level: '', status: 'inquiry' }); setShowDialog(true); }} className="rounded-xl">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Inquiry
                                    </Button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Student Name</th>
                                                <th className="text-left p-3 font-medium">Parent</th>
                                                <th className="text-left p-3 font-medium">Contact</th>
                                                <th className="text-left p-3 font-medium">Grade</th>
                                                <th className="text-left p-3 font-medium">Date</th>
                                                <th className="text-right p-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inquiries.map((item, idx) => (
                                                <tr key={item.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                                    <td className="p-3">{item.student_first_name} {item.student_last_name}</td>
                                                    <td className="p-3">{item.parent_name}</td>
                                                    <td className="p-3">{item.parent_email}</td>
                                                    <td className="p-3">{item.grade_level}</td>
                                                    <td className="p-3">{new Date(item.created_at).toLocaleDateString()}</td>
                                                    <td className="p-3 text-right space-x-2">
                                                        <Button size="sm" variant="outline" onClick={() => { setEditingItem(item); setFormData(item); setShowDialog(true); }} className="rounded-lg">
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ id: item.id, name: `${item.student_first_name} ${item.student_last_name}` })} className="rounded-lg" data-testid={`inquiry-delete-${item.id}`}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="applications">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Applications</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {applications.length === 0 ? (
                                <div className="text-center py-12">
                                    <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                    <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                                    <p className="text-muted-foreground">Applications will appear here</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Student Name</th>
                                                <th className="text-left p-3 font-medium">Parent</th>
                                                <th className="text-left p-3 font-medium">Grade</th>
                                                <th className="text-left p-3 font-medium">Status</th>
                                                <th className="text-left p-3 font-medium">Date</th>
                                                <th className="text-right p-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {applications.map((item, idx) => (
                                                <tr key={item.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                                    <td className="p-3">{item.student_first_name} {item.student_last_name}</td>
                                                    <td className="p-3">{item.parent_name}</td>
                                                    <td className="p-3">{item.grade_level}</td>
                                                    <td className="p-3">
                                                        <Badge className={item.status === 'accepted' ? 'bg-green-500' : item.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}>
                                                            {item.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3">{new Date(item.created_at).toLocaleDateString()}</td>
                                                    <td className="p-3 text-right space-x-2">
                                                        <Button size="sm" variant="outline" onClick={() => { setEditingItem(item); setFormData(item); setShowDialog(true); }} className="rounded-lg">
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        {item.status === 'accepted' && !item.converted_student_id ? (
                                                            <Button size="sm" onClick={() => handleConvert(item)} disabled={convertingId === item.id} className="rounded-lg" data-testid={`convert-btn-${item.id}`}>
                                                                {convertingId === item.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ArrowRightCircle className="w-4 h-4 mr-1.5" />}
                                                                Convert to student
                                                            </Button>
                                                        ) : null}
                                                        {item.converted_student_id ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800" data-testid={`converted-badge-${item.id}`}>Enrolled</Badge>
                                                        ) : null}
                                                        <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ id: item.id, name: `${item.student_first_name} ${item.student_last_name}` })} className="rounded-lg" data-testid={`admission-delete-${item.id}`}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete admission record"
                recordName={deleteTarget?.name}
                message="This will permanently remove the inquiry/application."
                confirmLabel="Delete"
                destructive
                submitting={deleting}
                onConfirm={handleDelete}
                testIdPrefix="admission-delete-confirm"
            />

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="rounded-2xl max-w-2xl p-6">
                    <button onClick={() => setShowDialog(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" data-testid="admission-dialog-close">
                        <X className="h-4 w-4" />
                    </button>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit' : 'New'} Inquiry/Application</DialogTitle>
                        <DialogDescription>Capture an admission inquiry or application for prospective students.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Student First Name*</Label>
                                <Input value={formData.student_first_name} onChange={(e) => setFormData({...formData, student_first_name: e.target.value})} className="rounded-lg" />
                            </div>
                            <div>
                                <Label>Student Last Name*</Label>
                                <Input value={formData.student_last_name} onChange={(e) => setFormData({...formData, student_last_name: e.target.value})} className="rounded-lg" />
                            </div>
                        </div>
                        <div>
                            <Label>Parent Name*</Label>
                            <Input value={formData.parent_name} onChange={(e) => setFormData({...formData, parent_name: e.target.value})} className="rounded-lg" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Parent Email*</Label>
                                <Input type="email" value={formData.parent_email} onChange={(e) => setFormData({...formData, parent_email: e.target.value})} className="rounded-lg" />
                            </div>
                            <div>
                                <Label>Parent Phone*</Label>
                                <Input value={formData.parent_phone} onChange={(e) => setFormData({...formData, parent_phone: e.target.value})} className="rounded-lg" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Grade Level*</Label>
                                <Input value={formData.grade_level} onChange={(e) => setFormData({...formData, grade_level: e.target.value})} className="rounded-lg" />
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inquiry">Inquiry</SelectItem>
                                        <SelectItem value="application">Application</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="accepted">Accepted</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl" data-testid="admission-cancel-btn">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving || !formData.student_first_name || !formData.parent_email} className="rounded-xl" data-testid="admission-save-btn">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {editingItem ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
