import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Save, Loader2, Plus, X, Award, User, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RATING_MAX = 6;

const RATING_LABELS = {
    0: 'Not rated',
    1: 'Poor',
    2: 'Fair',
    3: 'Average',
    4: 'Good',
    5: 'Very Good',
    6: 'Excellent',
};

/**
 * ReportFieldsTab — edit per-student report-card fields that feed into the
 * Ashcombe-style report template:
 *   • Advisor (form/homeroom teacher name)
 *   • Awards (list, dynamic add/remove)
 *   • Personal Development & Attributes:
 *       - leadership_role (text)
 *       - community_service_hours (number)
 *       - cocurricular_intra / cocurricular_inter (text)
 *       - conformity / grooming / courtesy / focus  (0-6 numeric ratings)
 *
 * Persists via PUT /api/students/{id}/report-fields (backend whitelist:
 * advisor, advisor_id, awards, personal_development).
 */
const RatingDots = ({ value, onChange, disabled }) => (
    <div className="flex items-center gap-1">
        {Array.from({ length: RATING_MAX }).map((_, i) => {
            const filled = i < (value || 0);
            return (
                <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange?.(i + 1)}
                    className={`w-4 h-4 rounded-full transition ${filled ? 'bg-indigo-600 border-indigo-600' : 'bg-white border border-slate-300 hover:border-indigo-400'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    aria-label={`Rate ${i + 1} of ${RATING_MAX}`}
                />
            );
        })}
        <span className="ml-2 text-xs text-slate-500 w-24">
            {RATING_LABELS[value || 0]}
        </span>
        {!disabled && value > 0 && (
            <button
                type="button"
                onClick={() => onChange?.(0)}
                className="ml-1 text-[10px] text-slate-400 hover:text-red-500 underline underline-offset-2"
                title="Clear rating"
            >
                clear
            </button>
        )}
    </div>
);

const ReportFieldsTab = ({ student, onReload, canEdit }) => {
    const [advisor, setAdvisor] = useState('');
    const [awards, setAwards] = useState([]);
    const [newAward, setNewAward] = useState('');
    const [pd, setPd] = useState({
        leadership_role: '',
        community_service_hours: '',
        cocurricular_intra: '',
        cocurricular_inter: '',
        conformity: 0,
        grooming: 0,
        courtesy: 0,
        focus: 0,
    });
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Populate from student
    useEffect(() => {
        if (!student) return;
        setAdvisor(student.advisor || '');
        setAwards(Array.isArray(student.awards) ? student.awards : []);
        const source = student.personal_development || {};
        setPd({
            leadership_role: source.leadership_role || '',
            community_service_hours: source.community_service_hours ?? '',
            cocurricular_intra: source.cocurricular_intra || '',
            cocurricular_inter: source.cocurricular_inter || '',
            conformity: Number(source.conformity) || 0,
            grooming: Number(source.grooming) || 0,
            courtesy: Number(source.courtesy) || 0,
            focus: Number(source.focus) || 0,
        });
        setDirty(false);
    }, [student]);

    const markDirty = () => setDirty(true);

    const addAward = () => {
        const v = newAward.trim();
        if (!v) return;
        if (awards.includes(v)) {
            toast.info('That award is already added.');
            return;
        }
        setAwards([...awards, v]);
        setNewAward('');
        markDirty();
    };

    const removeAward = (idx) => {
        setAwards(awards.filter((_, i) => i !== idx));
        markDirty();
    };

    const handleSave = async () => {
        if (!canEdit) {
            toast.error("You don't have permission to edit this.");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                advisor: advisor.trim(),
                awards,
                personal_development: {
                    leadership_role: pd.leadership_role,
                    community_service_hours: pd.community_service_hours === ''
                        ? null
                        : Number(pd.community_service_hours),
                    cocurricular_intra: pd.cocurricular_intra,
                    cocurricular_inter: pd.cocurricular_inter,
                    conformity: pd.conformity || 0,
                    grooming: pd.grooming || 0,
                    courtesy: pd.courtesy || 0,
                    focus: pd.focus || 0,
                },
            };
            await axios.put(`${API}/students/${student.id}/report-fields`, payload);
            toast.success('Report fields saved');
            setDirty(false);
            onReload?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to save report fields');
        } finally {
            setSaving(false);
        }
    };

    if (!student) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Report Card Fields</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            These values populate the Ashcombe-style report card for {student.first_name} {student.last_name}.
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={!canEdit || saving || !dirty} className="min-w-[110px]">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save</>}
                </Button>
            </div>

            {/* Advisor + summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Advisor
                    </Label>
                    <Input
                        value={advisor}
                        onChange={(e) => { setAdvisor(e.target.value); markDirty(); }}
                        placeholder="Form / homeroom teacher's name"
                        disabled={!canEdit}
                        className="mt-2"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                        Appears in the student info bar of the report card.
                    </p>
                </div>

                <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> Awards ({awards.length})
                    </Label>
                    <div className="flex gap-2 mt-2">
                        <Input
                            value={newAward}
                            onChange={(e) => setNewAward(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); addAward(); }
                            }}
                            placeholder="Type an award and press Enter"
                            disabled={!canEdit}
                        />
                        <Button type="button" onClick={addAward} disabled={!canEdit || !newAward.trim()} size="sm">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3 min-h-[36px]">
                        {awards.length === 0 && (
                            <div className="text-[11px] text-slate-400 italic">No awards yet.</div>
                        )}
                        {awards.map((a, idx) => (
                            <span
                                key={`${a}-${idx}`}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full text-xs"
                            >
                                {a}
                                {canEdit && (
                                    <button
                                        onClick={() => removeAward(idx)}
                                        className="text-indigo-400 hover:text-red-500"
                                        title="Remove"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Personal Development */}
            <div className="bg-white border rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Personal Development &amp; Attributes</h3>
                    <span className="text-[11px] text-slate-400">
                        Free-text on top · 0-6 ratings below
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-slate-500">Leadership role</Label>
                        <Input
                            value={pd.leadership_role}
                            onChange={(e) => { setPd({ ...pd, leadership_role: e.target.value }); markDirty(); }}
                            placeholder="e.g. Form prefect"
                            disabled={!canEdit}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-slate-500">Community service hours</Label>
                        <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={pd.community_service_hours}
                            onChange={(e) => { setPd({ ...pd, community_service_hours: e.target.value }); markDirty(); }}
                            placeholder="0"
                            disabled={!canEdit}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-slate-500">Co-curricular — intra-school</Label>
                        <Input
                            value={pd.cocurricular_intra}
                            onChange={(e) => { setPd({ ...pd, cocurricular_intra: e.target.value }); markDirty(); }}
                            placeholder="e.g. Chess club"
                            disabled={!canEdit}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-slate-500">Co-curricular — inter-school</Label>
                        <Input
                            value={pd.cocurricular_inter}
                            onChange={(e) => { setPd({ ...pd, cocurricular_inter: e.target.value }); markDirty(); }}
                            placeholder="e.g. Debate team"
                            disabled={!canEdit}
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="mt-6 space-y-3 border-t pt-4">
                    {[
                        ['conformity', 'Conformity to school rules'],
                        ['grooming',   'Grooming'],
                        ['courtesy',   'Courtesy'],
                        ['focus',      'Ability to stay focused'],
                    ].map(([key, label]) => (
                        <div key={key} className="grid grid-cols-[minmax(0,200px)_1fr] gap-4 items-center">
                            <Label className="text-sm text-slate-700">{label}</Label>
                            <RatingDots
                                value={pd[key]}
                                onChange={(v) => { setPd({ ...pd, [key]: v }); markDirty(); }}
                                disabled={!canEdit}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Behavioural note */}
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-3">
                💡 Behavioural counters (detentions, warnings, suspensions) are auto-calculated from the Discipline module — no data entry needed here.
            </div>
        </div>
    );
};

export default ReportFieldsTab;
