import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, Loader2, Save, Settings as SettingsIcon } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
    `${CURRENT_YEAR-1}-${CURRENT_YEAR}`,
    `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
    `${CURRENT_YEAR+1}-${CURRENT_YEAR+2}`
];

const DEFAULT_SKILL_RATINGS = [
    { code: 'EX', label: 'Excellent' },
    { code: 'VG', label: 'Very Good' },
    { code: 'G',  label: 'Good' },
    { code: 'NI', label: 'Needs Improvement' }
];

const DEFAULT_SOCIAL_CATEGORIES = [
    { category_name: 'Social Skills', skills: [
        'Completes Assignments',
        'Follows Instructions',
        'Punctuality',
        'Deportment',
        'Courteous in Speech and Action',
        'Respect for Teacher',
        'Respect for Peers'
    ]}
];

const normalizeRatings = (rs) => (rs || []).map((r) =>
    typeof r === 'string' ? { code: r, label: r } : r
);

export default function SocialSkillsManagerPage() {
    const { schoolCode, isAdmin, isTeacher } = useAuth();
    const canEdit = isAdmin || isTeacher;

    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedYear, setSelectedYear] = useState(`${CURRENT_YEAR}-${CURRENT_YEAR+1}`);

    const [template, setTemplate] = useState(null);
    const [students, setStudents] = useState([]);
    // skills shape: { [student_id]: { [skill_name]: code } }
    const [skills, setSkills] = useState({});
    const [dirty, setDirty] = useState({});
    const [savingId, setSavingId] = useState('');
    const [savingAll, setSavingAll] = useState(false);
    const [loading, setLoading] = useState(false);

    const tplSkillRatings = useMemo(
        () => normalizeRatings(template?.skill_ratings) || [],
        [template?.skill_ratings]
    );
    const skillRatings = tplSkillRatings.length > 0 ? tplSkillRatings : DEFAULT_SKILL_RATINGS;

    const tplCategories = template?.social_skills_categories || [];
    const categories = tplCategories.length > 0 ? tplCategories : DEFAULT_SOCIAL_CATEGORIES;

    // flat list of all skills (used as columns)
    const allSkills = useMemo(() => {
        const out = [];
        for (const cat of categories) {
            for (const sk of (cat.skills || [])) out.push({ category: cat.category_name, skill: sk });
        }
        return out;
    }, [categories]);

    // Load initial classes + template
    useEffect(() => {
        (async () => {
            try {
                const reqs = [axios.get(`${API}/classes`)];
                if (schoolCode) reqs.push(axios.get(`${API}/report-templates/${schoolCode}`));
                const [classesRes, tplRes] = await Promise.all(reqs);
                setClasses(classesRes.data || []);
                if (tplRes?.data) setTemplate(tplRes.data);
                if (classesRes.data?.length && !selectedClass) setSelectedClass(classesRes.data[0].id);
            } catch (_e) {
                toast.error('Failed to load setup data');
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolCode]);

    const fetchClassData = useCallback(async () => {
        if (!selectedClass || !selectedTerm || !selectedYear) return;
        setLoading(true);
        try {
            const [studentsRes, skillsRes] = await Promise.all([
                axios.get(`${API}/students`, { params: { class_id: selectedClass } }),
                axios.get(`${API}/social-skills/class/${selectedClass}`, {
                    params: { term: selectedTerm, academic_year: selectedYear }
                }),
            ]);
            const inClass = (studentsRes.data || []).filter((s) => s.class_id === selectedClass);
            const sorted = [...inClass].sort((a, b) => {
                const la = (a.last_name || '').toLowerCase();
                const lb = (b.last_name || '').toLowerCase();
                if (la !== lb) return la < lb ? -1 : 1;
                return (a.first_name || '').toLowerCase().localeCompare((b.first_name || '').toLowerCase());
            });
            setStudents(sorted);
            const map = {};
            (skillsRes.data?.entries || []).forEach((e) => { map[e.student_id] = e.skills || {}; });
            setSkills(map);
            setDirty({});
        } catch (_e) {
            toast.error('Failed to load class data');
        } finally {
            setLoading(false);
        }
    }, [selectedClass, selectedTerm, selectedYear]);

    useEffect(() => { fetchClassData(); }, [fetchClassData]);

    const setRating = (studentId, skillName, code) => {
        setSkills((prev) => ({
            ...prev,
            [studentId]: { ...(prev[studentId] || {}), [skillName]: code }
        }));
        setDirty((prev) => ({ ...prev, [studentId]: true }));
    };

    const saveOne = async (studentId) => {
        if (!canEdit) return;
        setSavingId(studentId);
        try {
            await axios.post(`${API}/social-skills`, {
                student_id: studentId,
                term: selectedTerm,
                academic_year: selectedYear,
                skills: skills[studentId] || {}
            });
            setDirty((prev) => ({ ...prev, [studentId]: false }));
            toast.success('Social skills saved');
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to save');
        } finally {
            setSavingId('');
        }
    };

    const saveAll = async () => {
        const dirtyIds = Object.keys(dirty).filter((id) => dirty[id]);
        if (dirtyIds.length === 0) { toast.info('No changes to save'); return; }
        setSavingAll(true);
        let ok = 0, fail = 0;
        for (const sid of dirtyIds) {
            try {
                await axios.post(`${API}/social-skills`, {
                    student_id: sid,
                    term: selectedTerm,
                    academic_year: selectedYear,
                    skills: skills[sid] || {}
                });
                ok++;
            } catch (_e) {
                fail++;
            }
        }
        setDirty({});
        setSavingAll(false);
        if (fail === 0) toast.success(`Saved ${ok} student${ok === 1 ? '' : 's'}`);
        else toast.error(`Saved ${ok}, failed ${fail}`);
    };

    const className = classes.find((c) => c.id === selectedClass)?.name || '';
    const totalRated = students.filter((s) => Object.keys(skills[s.id] || {}).length > 0).length;

    return (
        <div data-testid="social-skills-manager-page">
            <div className="page-header flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary" />
                        Social Skills
                    </h1>
                    <p>Rate students against the school&apos;s customizable social-skill categories. Ratings appear on the generated report card.</p>
                </div>
                {isAdmin && (
                    <Link
                        to="/gradebook"
                        className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground self-start"
                        data-testid="open-settings-link"
                        title="Open Gradebook → Settings to customize categories and rating scale"
                    >
                        <SettingsIcon className="w-3.5 h-3.5" />
                        Customize in Gradebook Settings
                    </Link>
                )}
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
                                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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

            {/* Stats + rating legend */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/15">
                    <span className="text-muted-foreground text-xs">Class:</span>
                    <span className="ml-2 font-bold">{className || '—'}</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/15">
                    <span className="text-muted-foreground text-xs">Students:</span>
                    <span className="ml-2 font-bold">{students.length}</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-emerald-700 text-xs">With ratings:</span>
                    <span className="ml-2 font-bold text-emerald-700">{totalRated} / {students.length}</span>
                </span>
                <span className="hidden md:flex items-center gap-2 ml-auto px-3 py-1.5 rounded-lg bg-muted/40 border border-border" data-testid="rating-legend">
                    <span className="text-muted-foreground text-xs">Scale:</span>
                    {skillRatings.map((r) => (
                        <span key={r.code} className="text-[11px] font-semibold">
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-1">{r.code}</span>
                            <span className="text-muted-foreground font-normal">{r.label}</span>
                        </span>
                    ))}
                </span>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : students.length === 0 ? (
                <Card className="rounded-2xl border-border shadow-sm">
                    <CardContent className="py-16 text-center">
                        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-base font-semibold mb-1">No students in this class</h3>
                        <p className="text-sm text-muted-foreground">Select a different class or add students first.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="social-skills-table">
                            <thead>
                                <tr className="bg-muted/60 border-b border-border">
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/80 z-10 min-w-[200px]">Student</th>
                                    {allSkills.map((s) => (
                                        <th key={s.skill} className="px-2 py-2.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider" title={`${s.category} • ${s.skill}`}>
                                            {s.skill}
                                        </th>
                                    ))}
                                    <th className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[80px]">Save</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s) => {
                                    const studentSkills = skills[s.id] || {};
                                    const isDirty = !!dirty[s.id];
                                    return (
                                        <tr key={s.id} className={`border-b border-border last:border-b-0 hover:bg-muted/20 ${isDirty ? 'bg-amber-50/40' : ''}`} data-testid={`row-${s.id}`}>
                                            <td className="px-3 py-2 sticky left-0 bg-card z-10">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-md bg-primary/8 flex items-center justify-center text-primary font-semibold text-[11px] flex-shrink-0">
                                                        {(s.first_name?.[0] || '') + (s.last_name?.[0] || '')}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm truncate">{s.first_name} {s.last_name}</p>
                                                        <p className="text-[10.5px] text-muted-foreground">{s.student_id || s.id.slice(0,6)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {allSkills.map((sk) => {
                                                const current = studentSkills[sk.skill] || '';
                                                return (
                                                    <td key={sk.skill} className="px-2 py-2 text-center">
                                                        <select
                                                            value={current}
                                                            onChange={(e) => setRating(s.id, sk.skill, e.target.value)}
                                                            disabled={!canEdit}
                                                            className="h-8 w-full max-w-[68px] mx-auto rounded-md border border-border bg-card px-1 text-xs text-center focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                                            data-testid={`rating-${s.id}-${sk.skill.replace(/\s+/g,'-').toLowerCase()}`}
                                                            title={skillRatings.find((r) => r.code === current)?.label || 'Not rated'}
                                                        >
                                                            <option value=""></option>
                                                            {skillRatings.map((r) => (
                                                                <option key={r.code} value={r.code}>{r.code}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-2 py-2 text-center">
                                                {canEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => saveOne(s.id)}
                                                        disabled={savingId === s.id || !isDirty}
                                                        className="rounded-lg h-8 px-2"
                                                        data-testid={`save-row-${s.id}`}
                                                    >
                                                        {savingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
