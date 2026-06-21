import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { GraduationCap, Pencil, X, Save } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const buildStudentPayload = (student, overrides) => {
    const { id, school_code, age, created_at, updated_at, ...rest } = student;
    return { ...rest, ...overrides };
};

const fmtDate = (s) => {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); }
    catch { return s; }
};

const GENDER_OPTIONS = ['', 'Male', 'Female', 'Other'];

export default function ProfileTab({ student, canEdit, onReload }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});

    const initForm = () => ({
        student_id: student.student_id || '',
        first_name: student.first_name || '',
        middle_name: student.middle_name || '',
        last_name: student.last_name || '',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || '',
    });

    useEffect(() => { setForm(initForm()); setEditing(false); }, [student.id]);

    const startEdit = () => { setForm(initForm()); setEditing(true); };
    const handleChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

    const handleSave = async () => {
        if (!form.first_name?.trim() || !form.last_name?.trim()) {
            toast.error('First and last name are required');
            return;
        }
        if (!form.date_of_birth) {
            toast.error('Date of birth is required');
            return;
        }
        setSaving(true);
        try {
            const payload = buildStudentPayload(student, form);
            await axios.put(`${API}/students/${student.id}`, payload);
            toast.success('Student information updated');
            setEditing(false);
            onReload?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to update student');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="lp-card" data-testid="profile-tab-card">
            <div className="lp-card__header">
                <h3 className="lp-card__title"><GraduationCap />Student Information</h3>
                {canEdit && !editing && (
                    <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" onClick={startEdit} data-testid="profile-edit-btn-tab">
                        <Pencil size={12} /> Edit
                    </button>
                )}
            </div>

            {!editing ? (
                <div className="lp-kv">
                    <span className="lp-kv__k">Student ID</span>
                    <span className="lp-kv__v">{student.student_id || '—'}</span>
                    <span className="lp-kv__k">First Name</span>
                    <span className="lp-kv__v">{student.first_name || '—'}</span>
                    <span className="lp-kv__k">Middle Name</span>
                    <span className="lp-kv__v">{student.middle_name || '—'}</span>
                    <span className="lp-kv__k">Last Name</span>
                    <span className="lp-kv__v">{student.last_name || '—'}</span>
                    <span className="lp-kv__k">Date of Birth</span>
                    <span className="lp-kv__v">{fmtDate(student.date_of_birth)}{student.age ? ` · ${student.age} yrs` : ''}</span>
                    <span className="lp-kv__k">Gender</span>
                    <span className="lp-kv__v">{student.gender || '—'}</span>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div className="lp-field">
                            <label className="lp-field__label">Student ID</label>
                            <input className="lp-input" value={form.student_id || ''} onChange={(e) => handleChange('student_id', e.target.value)} data-testid="profile-input-student_id" />
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Gender</label>
                            <select className="lp-select" value={form.gender || ''} onChange={(e) => handleChange('gender', e.target.value)} data-testid="profile-input-gender">
                                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g || 'Select…'}</option>)}
                            </select>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">First Name *</label>
                            <input className="lp-input" value={form.first_name || ''} onChange={(e) => handleChange('first_name', e.target.value)} data-testid="profile-input-first_name" />
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Middle Name</label>
                            <input className="lp-input" value={form.middle_name || ''} onChange={(e) => handleChange('middle_name', e.target.value)} data-testid="profile-input-middle_name" />
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Last Name *</label>
                            <input className="lp-input" value={form.last_name || ''} onChange={(e) => handleChange('last_name', e.target.value)} data-testid="profile-input-last_name" />
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Date of Birth *</label>
                            <input className="lp-input" type="date" value={(form.date_of_birth || '').slice(0, 10)} onChange={(e) => handleChange('date_of_birth', e.target.value)} data-testid="profile-input-dob" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="lp-btn lp-btn--primary" onClick={handleSave} disabled={saving} data-testid="profile-save-btn-tab">
                            <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button type="button" className="lp-btn lp-btn--outline" onClick={() => setEditing(false)} disabled={saving} data-testid="profile-cancel-btn-tab">
                            <X size={13} /> Cancel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
