import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { MessageSquare, Loader2, Save, CheckCircle2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
    `${CURRENT_YEAR-1}-${CURRENT_YEAR}`,
    `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
    `${CURRENT_YEAR+1}-${CURRENT_YEAR+2}`
];

export default function FormTeacherCommentsPage() {
    const { isAdmin, isTeacher } = useAuth();
    const canEdit = isAdmin || isTeacher;

    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedYear, setSelectedYear] = useState(`${CURRENT_YEAR}-${CURRENT_YEAR+1}`);

    const [students, setStudents] = useState([]);
    const [comments, setComments] = useState({}); // student_id -> text
    const [dirty, setDirty] = useState({}); // student_id -> true
    const [savingId, setSavingId] = useState('');
    const [savingAll, setSavingAll] = useState(false);
    const [loading, setLoading] = useState(false);

    // initial classes
    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get(`${API}/classes`);
                setClasses(res.data || []);
                if (res.data?.length && !selectedClass) setSelectedClass(res.data[0].id);
            } catch (_e) {
                toast.error('Failed to load classes');
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchClassData = useCallback(async () => {
        if (!selectedClass || !selectedTerm || !selectedYear) return;
        setLoading(true);
        try {
            const [studentsRes, commentsRes] = await Promise.all([
                axios.get(`${API}/students`, { params: { class_id: selectedClass } }),
                axios.get(`${API}/teacher-comments/class/${selectedClass}`, {
                    params: { term: selectedTerm, academic_year: selectedYear }
                }),
            ]);
            // /students doesn't filter by class_id on server for all roles; do client-side filter to be safe.
            const inClass = (studentsRes.data || []).filter((s) => s.class_id === selectedClass);
            const sorted = [...inClass].sort((a, b) => {
                const la = (a.last_name || '').toLowerCase();
                const lb = (b.last_name || '').toLowerCase();
                if (la !== lb) return la < lb ? -1 : 1;
                return (a.first_name || '').toLowerCase().localeCompare((b.first_name || '').toLowerCase());
            });
            setStudents(sorted);
            const map = {};
            (commentsRes.data?.entries || []).forEach((e) => { map[e.student_id] = e.comment || ''; });
            setComments(map);
            setDirty({});
        } catch (_e) {
            toast.error('Failed to load class data');
        } finally {
            setLoading(false);
        }
    }, [selectedClass, selectedTerm, selectedYear]);

    useEffect(() => { fetchClassData(); }, [fetchClassData]);

    const setCommentFor = (studentId, value) => {
        setComments((prev) => ({ ...prev, [studentId]: value }));
        setDirty((prev) => ({ ...prev, [studentId]: true }));
    };

    const saveOne = async (studentId) => {
        if (!canEdit) return;
        setSavingId(studentId);
        try {
            await axios.post(`${API}/teacher-comments`, {
                student_id: studentId,
                term: selectedTerm,
                academic_year: selectedYear,
                comment: comments[studentId] || ''
            });
            setDirty((prev) => ({ ...prev, [studentId]: false }));
            toast.success('Comment saved');
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to save');
        } finally {
            setSavingId('');
        }
    };

    const saveAll = async () => {
        const dirtyIds = Object.keys(dirty).filter((id) => dirty[id]);
        if (dirtyIds.length === 0) {
            toast.info('No changes to save');
            return;
        }
        setSavingAll(true);
        let ok = 0, fail = 0;
        for (const sid of dirtyIds) {
            try {
                await axios.post(`${API}/teacher-comments`, {
                    student_id: sid,
                    term: selectedTerm,
                    academic_year: selectedYear,
                    comment: comments[sid] || ''
                });
                ok++;
            } catch (_e) {
                fail++;
            }
        }
        setDirty({});
        setSavingAll(false);
        if (fail === 0) toast.success(`Saved ${ok} comment${ok === 1 ? '' : 's'}`);
        else toast.error(`Saved ${ok}, failed ${fail}`);
    };

    const className = classes.find((c) => c.id === selectedClass)?.name || '';
    const totalWithComments = Object.values(comments).filter((c) => (c || '').trim().length > 0).length;

    return (
        <div data-testid="form-teacher-comments-page">
            <div className="page-header">
                <h1 className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-primary" />
                    Form Teacher&apos;s Comments
                </h1>
                <p>Write a personal comment for each student for the selected term. Comments appear on the generated report card.</p>
            </div>

            {/* Filter row */}
            <Card className="rounded-2xl border-border shadow-sm mb-4">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div>
                            <Label className="text-xs">Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="h-10 rounded-lg" data-testid="class-select">
                                    <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Term</Label>
                            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                                <SelectTrigger className="h-10 rounded-lg" data-testid="term-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Academic Year</Label>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="h-10 rounded-lg" data-testid="year-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACADEMIC_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end">
                            {canEdit && (
                                <Button
                                    onClick={saveAll}
                                    disabled={savingAll || Object.values(dirty).every((v) => !v)}
                                    className="gradient-primary rounded-lg shadow-md h-10"
                                    data-testid="save-all-btn"
                                >
                                    {savingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save All Changes
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats strip */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm" data-testid="stats-strip">
                <span className="px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/15">
                    <span className="text-muted-foreground text-xs">Class:</span>
                    <span className="ml-2 font-bold">{className || '—'}</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/15">
                    <span className="text-muted-foreground text-xs">Students:</span>
                    <span className="ml-2 font-bold">{students.length}</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-emerald-700 text-xs">With comments:</span>
                    <span className="ml-2 font-bold text-emerald-700">{totalWithComments} / {students.length}</span>
                </span>
            </div>

            {/* Comments grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : students.length === 0 ? (
                <Card className="rounded-2xl border-border shadow-sm">
                    <CardContent className="py-16 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-base font-semibold mb-1">No students in this class</h3>
                        <p className="text-sm text-muted-foreground">Select a different class or add students first.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="comments-grid">
                    {students.map((s) => {
                        const text = comments[s.id] || '';
                        const isDirty = !!dirty[s.id];
                        const hasContent = text.trim().length > 0;
                        return (
                            <Card key={s.id} className={`rounded-2xl shadow-sm border ${isDirty ? 'border-amber-300' : 'border-border'}`} data-testid={`comment-card-${s.id}`}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center justify-between text-base">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                                                {(s.first_name?.[0] || '') + (s.last_name?.[0] || '')}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{s.first_name} {s.last_name}</p>
                                                <p className="text-xs text-muted-foreground font-normal">{s.student_id || s.id.slice(0,6)}</p>
                                            </div>
                                        </div>
                                        {hasContent && !isDirty && (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                                            </span>
                                        )}
                                        {isDirty && (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                                                Unsaved
                                            </span>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Textarea
                                        value={text}
                                        onChange={(e) => setCommentFor(s.id, e.target.value)}
                                        disabled={!canEdit}
                                        placeholder="Write a comment about this student's progress, behavior and recommendations for next term…"
                                        rows={3}
                                        className="rounded-lg text-sm"
                                        data-testid={`comment-textarea-${s.id}`}
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[11px] text-muted-foreground">{text.length} characters</span>
                                        {canEdit && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => saveOne(s.id)}
                                                disabled={savingId === s.id || !isDirty}
                                                className="rounded-lg text-xs h-8"
                                                data-testid={`save-comment-${s.id}`}
                                            >
                                                {savingId === s.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                                                Save
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
