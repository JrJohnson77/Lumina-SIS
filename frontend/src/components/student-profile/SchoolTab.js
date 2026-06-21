import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { School, Pencil, X, Save } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const buildStudentPayload = (student, overrides) => {
    const { id, school_code, age, created_at, updated_at, ...rest } = student;
    return { ...rest, ...overrides };
};

const STATUS_OPTIONS = ['Enrolled', 'Inactive', 'Withdrawn', 'Graduated'];

export default function SchoolTab({ student, classMap, canEdit, onReload }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});

    const classes = useMemo(() => Array.from(classMap?.values?.() || []), [classMap]);
    const currentClass = classMap?.get?.(student.class_id);

    const initForm = () => ({
        enrollment_status: student.enrollment_status || 'Enrolled',
        class_id: student.class_id || '',
        house: student.house || '',
    });

    useEffect(() => { setForm(initForm()); setEditing(false); }, [student.id]);

    const startEdit = () => { setForm(initForm()); setEditing(true); };
    const handleChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = buildStudentPayload(student, {
                ...form,
                class_id: form.class_id || null,
            });
            await axios.put(`${API}/students/${student.id}`, payload);
            toast.success('School information updated');
            setEditing(false);
            onReload?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to update school info');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="lp-card" data-testid="school-tab-card">
            <div className="lp-card__header">
                <h3 className="lp-card__title"><School />School Information</h3>
                {canEdit && !editing && (
                    <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" onClick={startEdit} data-testid="school-edit-btn">
                        <Pencil size={12} /> Edit
                    </button>
                )}
            </div>

            {!editing ? (
                <div className="lp-kv">
                    <span className="lp-kv__k">Status</span>
                    <span className="lp-kv__v">
                        <span className={`lp-badge lp-badge--${(student.enrollment_status || 'enrolled').toLowerCase()}`}>
                            {student.enrollment_status || 'Enrolled'}
                        </span>
                    </span>
                    <span className="lp-kv__k">Current Class</span>
                    <span className="lp-kv__v">
                        {currentClass ? `${currentClass.grade_level} · ${currentClass.name}` : <span className="lp-muted">—</span>}
                    </span>
                    <span className="lp-kv__k">Academic Year</span>
                    <span className="lp-kv__v">{currentClass?.academic_year || '—'}</span>
                    <span className="lp-kv__k">House</span>
                    <span className="lp-kv__v">{student.house || '—'}</span>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div className="lp-field">
                            <label className="lp-field__label">Status</label>
                            <select className="lp-select" value={form.enrollment_status || 'Enrolled'} onChange={(e) => handleChange('enrollment_status', e.target.value)} data-testid="school-input-status">
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">House</label>
                            <input className="lp-input" value={form.house || ''} onChange={(e) => handleChange('house', e.target.value)} data-testid="school-input-house" />
                        </div>
                        <div className="lp-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="lp-field__label">Class</label>
                            <select className="lp-select" value={form.class_id || ''} onChange={(e) => handleChange('class_id', e.target.value)} data-testid="school-input-class">
                                <option value="">Unassigned</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.grade_level} · {c.name}{c.academic_year ? ` (${c.academic_year})` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="lp-btn lp-btn--primary" onClick={handleSave} disabled={saving} data-testid="school-save-btn">
                            <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button type="button" className="lp-btn lp-btn--outline" onClick={() => setEditing(false)} disabled={saving} data-testid="school-cancel-btn">
                            <X size={13} /> Cancel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
