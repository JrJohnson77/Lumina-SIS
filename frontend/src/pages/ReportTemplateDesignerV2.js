import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
    Save, Loader2, ArrowLeft, Type, Image as ImageIcon,
    Minus, Sparkles, Upload, PenTool, Trash2, Plus, Palette,
    Shield, School as SchoolIcon
} from 'lucide-react';
import AshcombeReportCard from '../components/AshcombeReportCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ---- Sample data used for the live preview ----
const SAMPLE_DATA = {
    student: {
        first_name: 'Amari', middle_name: 'Josiah', last_name: 'Grant',
        student_id: 'AA-20417', house: 'Kestrel',
    },
    class_info: { grade_level: '10', name: '10B', teacher_name: 'Mrs. L. Pinnock' },
    advisor: 'Mrs. L. Pinnock',
    grades: {
        overall_score: 84,
        subjects: [
            { subject: 'Mathematics', teacher: 'C. Bennett',    homework: 84, groupWork: 82, quiz: 92, midTerm: 88, endOfTerm: 90, project: null, score: 87, grade: 'A-' },
            { subject: 'English language', teacher: 'R. Thorpe', homework: 82, groupWork: 78, quiz: 77, midTerm: 79, endOfTerm: 75, project: null, score: 78, grade: 'B' },
            { subject: 'Integrated science', teacher: 'M. Osei', homework: 88, groupWork: 90, quiz: 95, midTerm: 91, endOfTerm: 93, project: null, score: 91, grade: 'A' },
            { subject: 'Geography', teacher: 'K. Alleyne',      homework: 77, groupWork: 75, quiz: 70, midTerm: 74, endOfTerm: 70, project: null, score: 73, grade: 'B-' },
            { subject: 'Information technology', teacher: 'J. Mercer', homework: 92, groupWork: 96, quiz: 97, midTerm: 95, endOfTerm: 89, project: null, score: 93, grade: 'A' },
            { subject: 'Visual arts', teacher: 'S. Ferreira',   homework: 80, groupWork: 82, quiz: 88, midTerm: 85, endOfTerm: 88, project: null, score: 84, grade: 'A-' },
        ],
    },
    attendance_summary: { present: 96, absent: 2, late: 1, excused: 1, total_days: 100 },
    attendance_pct: 96,
    overall_average: 84,
    gpa: 3.7,
    teacher_comment: 'Amari consistently demonstrates strong analytical thinking and a collaborative spirit in group work. Written responses in English have improved noticeably this term. Continued focus on time management under exam conditions will support even stronger results next term.',
    awards: ["Principal's honour roll", 'Information technology excellence award'],
    personal_development: {
        leadership_role: 'Form prefect',
        community_service_hours: 12.5,
        cocurricular_intra: 'Chess club',
        cocurricular_inter: 'Debate team',
        conformity: 6, grooming: 0, courtesy: 6, focus: 0,
    },
    behavioural: { detentions: 0, warnings: 0, suspensions: 0, other: 0 },
    term: 'Term 2', academic_year: '2025-2026',
    school: {
        name: 'Ashcombe Academy',
        tagline: 'Est. 1958 · Growing minds, building character',
        address: '123 Academy Road, Kingston, Jamaica',
        principal_name: 'Dr. R. Kingsley',
    },
};

// ---- Small design-canvas element editor ----
const RegionDesignEditor = ({ elements, onChange }) => {
    const [selectedId, setSelectedId] = useState(elements[0]?.id || null);
    const selected = elements.find((e) => e.id === selectedId);

    const updateElement = (id, patch) => {
        onChange(elements.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    };
    const removeElement = (id) => {
        onChange(elements.filter((e) => e.id !== id));
        if (selectedId === id) setSelectedId(null);
    };
    const addElement = (type) => {
        const newEl = {
            id: `el_${Math.random().toString(36).slice(2, 9)}`,
            type,
            x: 40, y: 20,
            width: type === 'divider' ? 300 : 240,
            height: type === 'divider' ? 1 : 24,
            content: type === 'field_token' ? '{{school_name}}'
                : type === 'divider' ? ''
                : 'New text',
            font_size: 14,
            font_weight: '400',
            color: 'var(--report-primary)',
            align: 'left',
        };
        onChange([...elements, newEl]);
        setSelectedId(newEl.id);
    };

    return (
        <div className="flex gap-4">
            {/* Element list */}
            <div className="w-56 border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Elements</div>
                    <div className="flex gap-1">
                        <Button size="sm" variant="ghost" title="Add text" onClick={() => addElement('text')}>
                            <Type className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Add token" onClick={() => addElement('field_token')}>
                            <Sparkles className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Add divider" onClick={() => addElement('divider')}>
                            <Minus className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                    {elements.map((el) => (
                        <div
                            key={el.id}
                            onClick={() => setSelectedId(el.id)}
                            className={`flex items-center justify-between text-xs px-2 py-1.5 rounded cursor-pointer ${selectedId === el.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}
                        >
                            <span className="truncate flex-1">
                                <span className="text-slate-400 mr-2">{el.type}</span>
                                {el.content?.slice(0, 22) || '(empty)'}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                                className="text-slate-400 hover:text-red-500"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {elements.length === 0 && (
                        <div className="text-[11px] text-slate-400 text-center py-4">
                            No elements yet. Click + to add.
                        </div>
                    )}
                </div>
            </div>

            {/* Property editor */}
            <div className="flex-1 border rounded-lg p-3 bg-white shadow-sm">
                {selected ? (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="col-span-2">
                            <Label className="text-[11px] text-slate-500">Content</Label>
                            <Input
                                value={selected.content || ''}
                                onChange={(e) => updateElement(selected.id, { content: e.target.value })}
                                placeholder='Text or {{token}}'
                                className="mt-1"
                            />
                            {selected.type === 'field_token' && (
                                <div className="text-[10px] text-slate-400 mt-1">
                                    Tokens: <code>{'{{school_name}}'}</code>, <code>{'{{school_tagline}}'}</code>,
                                    {' '}<code>{'{{school_address}}'}</code>, <code>{'{{term_label}}'}</code>,
                                    {' '}<code>{'{{issue_date}}'}</code>, <code>{'{{principal_name}}'}</code>
                                </div>
                            )}
                        </div>
                        <div>
                            <Label className="text-[11px] text-slate-500">X</Label>
                            <Input type="number" value={selected.x} onChange={(e) => updateElement(selected.id, { x: parseInt(e.target.value, 10) || 0 })} />
                        </div>
                        <div>
                            <Label className="text-[11px] text-slate-500">Y</Label>
                            <Input type="number" value={selected.y} onChange={(e) => updateElement(selected.id, { y: parseInt(e.target.value, 10) || 0 })} />
                        </div>
                        <div>
                            <Label className="text-[11px] text-slate-500">Width</Label>
                            <Input type="number" value={selected.width} onChange={(e) => updateElement(selected.id, { width: parseInt(e.target.value, 10) || 0 })} />
                        </div>
                        <div>
                            <Label className="text-[11px] text-slate-500">Height</Label>
                            <Input type="number" value={selected.height} onChange={(e) => updateElement(selected.id, { height: parseInt(e.target.value, 10) || 0 })} />
                        </div>
                        <div>
                            <Label className="text-[11px] text-slate-500">Font size</Label>
                            <Input type="number" value={selected.font_size || 14} onChange={(e) => updateElement(selected.id, { font_size: parseInt(e.target.value, 10) || 14 })} />
                        </div>
                        <div>
                            <Label className="text-[11px] text-slate-500">Weight</Label>
                            <Select value={selected.font_weight || '400'} onValueChange={(v) => updateElement(selected.id, { font_weight: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="400">Regular</SelectItem>
                                    <SelectItem value="500">Medium</SelectItem>
                                    <SelectItem value="600">Semibold</SelectItem>
                                    <SelectItem value="700">Bold</SelectItem>
                                    <SelectItem value="800">Extra Bold</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-[11px] text-slate-500">Align</Label>
                            <Select value={selected.align || 'left'} onValueChange={(v) => updateElement(selected.id, { align: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label className="text-[11px] text-slate-500">Color (any CSS value)</Label>
                            <Input value={selected.color || 'var(--report-primary)'} onChange={(e) => updateElement(selected.id, { color: e.target.value })} placeholder="var(--report-primary) or #000" />
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-slate-400 text-center py-8">
                        Select an element to edit its properties.
                    </div>
                )}
            </div>
        </div>
    );
};

// ---- Region editor (Header or Footer) ----
const RegionEditor = ({ label, region, onChange, onUpload, uploading, canEditLayout }) => {
    const mode = region?.mode || 'design';
    const outsideBounds = region?.height_px < 60 || region?.height_px > 180;

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = await onUpload(file);
        if (url) onChange({ ...region, upload_image_url: url, mode: 'upload' });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Choose Upload for a pre-made banner, or Design to build from elements.</p>
                </div>
                {!canEditLayout && (
                    <div className="text-xs text-amber-600 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" /> Superuser only
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 border rounded-lg p-3 bg-slate-50">
                <div className="text-xs font-semibold text-slate-600">Authoring mode:</div>
                <div className="flex items-center gap-2">
                    <button
                        disabled={!canEditLayout}
                        onClick={() => onChange({ ...region, mode: 'upload' })}
                        className={`px-3 py-1.5 rounded text-xs font-medium border ${mode === 'upload' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'} ${!canEditLayout ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Upload className="w-3 h-3 inline mr-1" /> Upload Image
                    </button>
                    <button
                        disabled={!canEditLayout}
                        onClick={() => onChange({ ...region, mode: 'design' })}
                        className={`px-3 py-1.5 rounded text-xs font-medium border ${mode === 'design' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'} ${!canEditLayout ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <PenTool className="w-3 h-3 inline mr-1" /> Design Mode
                    </button>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Label className="text-xs text-slate-500">Height (px)</Label>
                    <Input
                        type="number"
                        value={region?.height_px || 120}
                        onChange={(e) => onChange({ ...region, height_px: parseInt(e.target.value, 10) || 120 })}
                        disabled={!canEditLayout}
                        className="w-20 text-xs h-8"
                    />
                </div>
            </div>
            {outsideBounds && (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                    ⚠︎ Height is outside the recommended 60–180 px range. The Body layout may look squeezed on print.
                </div>
            )}

            {mode === 'upload' ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-white">
                    {region?.upload_image_url ? (
                        <div>
                            <img src={region.upload_image_url} alt="uploaded" className="max-h-40 mx-auto mb-3 shadow-sm" />
                            <div className="text-xs text-slate-500 break-all">{region.upload_image_url}</div>
                            <Button size="sm" variant="outline" onClick={() => onChange({ ...region, upload_image_url: null })} className="mt-2" disabled={!canEditLayout}>
                                Remove
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <ImageIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 mb-3">Drop a banner image or click to upload</p>
                            <label className={`inline-block px-3 py-1.5 bg-indigo-600 text-white rounded text-xs cursor-pointer ${!canEditLayout ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleFileUpload} disabled={!canEditLayout || uploading} />
                                {uploading ? <><Loader2 className="w-3 h-3 inline animate-spin mr-1" /> Uploading…</> : <><Upload className="w-3 h-3 inline mr-1" /> Choose file</>}
                            </label>
                        </div>
                    )}
                </div>
            ) : (
                <RegionDesignEditor
                    elements={region?.design_elements || []}
                    onChange={(els) => canEditLayout && onChange({ ...region, design_elements: els })}
                />
            )}
        </div>
    );
};

// ---- Body sections + theme editor ----
const BodyEditor = ({ body, onChange, canEditLayout, canEditTheme }) => {
    const sections = body?.sections_enabled || {};
    const theme = body?.theme || {};
    const columns = body?.subject_table_columns || [];
    const allColumns = [
        { key: 'class_work', label: 'Class Work' },
        { key: 'homework',   label: 'Homework' },
        { key: 'exam',       label: 'Exam' },
        { key: 'project',    label: 'Project' },
        { key: 'overall',    label: 'Overall' },
        { key: 'grade',      label: 'Grade' },
    ];

    return (
        <div className="space-y-6">
            {/* Sections */}
            <div className={!canEditLayout ? 'opacity-50 pointer-events-none' : ''}>
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Body sections</h3>
                    {!canEditLayout && <span className="text-xs text-amber-600 flex items-center gap-1"><Shield className="w-3 h-3" /> Superuser only</span>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        ['student_info_bar', 'Student info bar'],
                        ['stats_cards', 'Stat cards (GPA / Attendance / Average)'],
                        ['subject_table', 'Subject performance table'],
                        ['teacher_comments', 'Teacher comments'],
                        ['personal_development', 'Personal development & attributes'],
                        ['awards_behavioural', 'Awards'],
                        ['behavioural_counters', 'Behavioural counters'],
                        ['grading_key', 'Grading key legend'],
                    ].map(([k, label]) => (
                        <label key={k} className="flex items-center gap-3 p-2 rounded border bg-white text-xs">
                            <Switch
                                checked={sections[k] !== false}
                                onCheckedChange={(v) => onChange({ ...body, sections_enabled: { ...sections, [k]: v } })}
                                disabled={!canEditLayout}
                            />
                            <span className="text-slate-700">{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Subject columns */}
            <div className={!canEditLayout ? 'opacity-50 pointer-events-none' : ''}>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Subject table columns</h3>
                <div className="grid grid-cols-3 gap-2">
                    {allColumns.map((c) => {
                        const active = columns.includes(c.key);
                        return (
                            <button
                                key={c.key}
                                disabled={!canEditLayout}
                                onClick={() => {
                                    if (!canEditLayout) return;
                                    const next = active ? columns.filter((x) => x !== c.key) : [...columns, c.key];
                                    onChange({ ...body, subject_table_columns: next });
                                }}
                                className={`text-xs px-3 py-2 rounded border ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'}`}
                            >
                                {c.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Theme */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Theme</h3>
                    {!canEditTheme && <span className="text-xs text-slate-500">read-only</span>}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <Label className="text-[11px] text-slate-500">Primary color</Label>
                        <div className="flex gap-2 mt-1">
                            <input type="color" value={theme.primary_color || '#0f172a'} onChange={(e) => onChange({ ...body, theme: { ...theme, primary_color: e.target.value } })} disabled={!canEditTheme} className="w-9 h-9 rounded border" />
                            <Input value={theme.primary_color || '#0f172a'} onChange={(e) => onChange({ ...body, theme: { ...theme, primary_color: e.target.value } })} disabled={!canEditTheme} />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] text-slate-500">Accent color</Label>
                        <div className="flex gap-2 mt-1">
                            <input type="color" value={theme.accent_color || '#4f46e5'} onChange={(e) => onChange({ ...body, theme: { ...theme, accent_color: e.target.value } })} disabled={!canEditTheme} className="w-9 h-9 rounded border" />
                            <Input value={theme.accent_color || '#4f46e5'} onChange={(e) => onChange({ ...body, theme: { ...theme, accent_color: e.target.value } })} disabled={!canEditTheme} />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] text-slate-500">Heading font</Label>
                        <Input value={theme.font_heading || 'Inter'} onChange={(e) => onChange({ ...body, theme: { ...theme, font_heading: e.target.value } })} disabled={!canEditTheme} />
                    </div>
                    <div>
                        <Label className="text-[11px] text-slate-500">Body font</Label>
                        <Input value={theme.font_body || 'Inter'} onChange={(e) => onChange({ ...body, theme: { ...theme, font_body: e.target.value } })} disabled={!canEditTheme} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ---- Main page ----
const ReportTemplateDesignerV2 = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isSuperuser, isAdmin } = useAuth();

    const querySchool = searchParams.get('school');
    const [schoolCode, setSchoolCode] = useState(querySchool || user?.school_code || '');
    const [schools, setSchools] = useState([]);
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('header');
    const [footerSignatures, setFooterSignatures] = useState([]);

    const canEditLayout = isSuperuser;      // Superuser only
    const canEditTheme = isAdmin;           // Admin + Superuser

    // Load schools list for superuser switcher
    useEffect(() => {
        if (!isSuperuser) return;
        (async () => {
            try {
                const res = await axios.get(`${API}/schools`);
                setSchools(res.data || []);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [isSuperuser]);

    // Load template
    const loadTemplate = useCallback(async () => {
        if (!schoolCode) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API}/report-templates/${schoolCode}`);
            setTemplate(res.data);
            setFooterSignatures(res.data?.footer?.show_signature_lines || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load template');
        } finally {
            setLoading(false);
        }
    }, [schoolCode]);

    useEffect(() => { loadTemplate(); }, [loadTemplate]);

    const uploadRegionImage = async (file) => {
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await axios.post(`${API}/upload/template-background`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data?.url || res.data?.filename ? `${API}/uploads/${res.data.filename}` : null;
        } catch (e) {
            toast.error('Upload failed');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const saveRegion = async (region, payload) => {
        if (!canEditLayout && region !== 'theme') {
            toast.error('Only a superuser can edit layout');
            return;
        }
        setSaving(true);
        try {
            const res = await axios.put(`${API}/report-templates/${schoolCode}/${region}`, payload);
            toast.success(`${region.charAt(0).toUpperCase() + region.slice(1)} saved`);
            await loadTemplate();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const resetToSystemDefault = async () => {
        if (!isSuperuser) { toast.error('Superuser only'); return; }
        if (!window.confirm('Overwrite this school\'s template with a fresh Ashcombe default? Any customizations will be lost.')) return;
        try {
            await axios.post(`${API}/report-templates/${schoolCode}/clone-system-default`);
            toast.success('Reset to system default');
            await loadTemplate();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Reset failed');
        }
    };

    const previewTemplate = useMemo(() => ({
        ...template,
        design_mode: 'ashcombe_default',
        footer: template?.footer ? { ...template.footer, show_signature_lines: footerSignatures } : undefined,
    }), [template, footerSignatures]);

    if (!isSuperuser && !isAdmin) {
        return (
            <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded-xl border shadow-sm text-center">
                <Shield className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h2 className="text-lg font-semibold text-slate-900">Restricted</h2>
                <p className="text-sm text-slate-500 mt-2">Only a Superuser or Admin can access the Report Designer.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/report-cards')}>
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Report Template Designer</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Three-region editor (Header · Body · Footer). Body is theme-driven so re-skinning takes seconds.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSuperuser && schools.length > 0 && (
                        <div className="flex items-center gap-2">
                            <SchoolIcon className="w-4 h-4 text-slate-400" />
                            <Select value={schoolCode} onValueChange={setSchoolCode}>
                                <SelectTrigger className="w-40"><SelectValue placeholder="School" /></SelectTrigger>
                                <SelectContent>
                                    {schools.map((s) => (
                                        <SelectItem key={s.school_code} value={s.school_code}>{s.school_code} — {s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {isSuperuser && (
                        <Button variant="outline" size="sm" onClick={resetToSystemDefault}>
                            <Sparkles className="w-4 h-4 mr-1" /> Reset to system default
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => navigate('/report-template/legacy')}>
                        Legacy designer
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,720px)] gap-6">
                    {/* Left: editor */}
                    <div className="bg-white rounded-xl border shadow-sm p-5 min-w-0">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="mb-4">
                                <TabsTrigger value="header">Header</TabsTrigger>
                                <TabsTrigger value="body">Body</TabsTrigger>
                                <TabsTrigger value="footer">Footer</TabsTrigger>
                            </TabsList>
                            <TabsContent value="header" className="space-y-4">
                                <RegionEditor
                                    label="Header region"
                                    region={template?.header || {}}
                                    onChange={(h) => setTemplate({ ...template, header: h })}
                                    onUpload={uploadRegionImage}
                                    uploading={uploading}
                                    canEditLayout={canEditLayout}
                                />
                                <div className="flex justify-end">
                                    <Button onClick={() => saveRegion('header', template?.header || {})} disabled={saving || !canEditLayout}>
                                        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                        Save Header
                                    </Button>
                                </div>
                            </TabsContent>
                            <TabsContent value="body" className="space-y-4">
                                <BodyEditor
                                    body={template?.body || {}}
                                    onChange={(b) => setTemplate({ ...template, body: b })}
                                    canEditLayout={canEditLayout}
                                    canEditTheme={canEditTheme}
                                />
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <p className="text-xs text-slate-500">
                                        {canEditLayout
                                            ? 'You can edit layout, sections, columns, and theme.'
                                            : 'You can edit only Theme. Layout is Superuser-only.'}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => saveRegion('theme', template?.body?.theme || {})}
                                            disabled={saving || !canEditTheme}
                                        >
                                            <Palette className="w-4 h-4 mr-1" /> Save Theme
                                        </Button>
                                        {canEditLayout && (
                                            <Button
                                                onClick={() => saveRegion('body', template?.body || {})}
                                                disabled={saving}
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                                Save Body
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="footer" className="space-y-4">
                                <RegionEditor
                                    label="Footer region"
                                    region={template?.footer || {}}
                                    onChange={(f) => setTemplate({ ...template, footer: f })}
                                    onUpload={uploadRegionImage}
                                    uploading={uploading}
                                    canEditLayout={canEditLayout}
                                />
                                <div className={!canEditLayout ? 'opacity-50 pointer-events-none' : ''}>
                                    <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Signature lines</h3>
                                    <div className="flex gap-3">
                                        {['principal', 'parent_guardian', 'form_teacher'].map((slot) => {
                                            const active = footerSignatures.includes(slot);
                                            return (
                                                <button
                                                    key={slot}
                                                    onClick={() => setFooterSignatures(active ? footerSignatures.filter((s) => s !== slot) : [...footerSignatures, slot])}
                                                    className={`text-xs px-3 py-1.5 rounded border ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'}`}
                                                >
                                                    {slot.replace(/_/g, ' ')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={() => saveRegion('footer', { ...(template?.footer || {}), show_signature_lines: footerSignatures })}
                                        disabled={saving || !canEditLayout}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                        Save Footer
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right: preview */}
                    <div className="bg-slate-100 rounded-xl border shadow-inner p-4 overflow-auto min-w-0">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" /> Live preview (sample data)
                        </div>
                        <div style={{ transform: 'scale(0.72)', transformOrigin: 'top left', width: '138%' }}>
                            {template && (
                                <AshcombeReportCard data={SAMPLE_DATA} template={previewTemplate} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportTemplateDesignerV2;
