import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Home, Phone, Mail, Pencil, X, Save } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Build a clean StudentCreate payload from a loaded student + overrides.
const buildStudentPayload = (student, overrides) => {
    const { id, school_code, age, created_at, updated_at, ...rest } = student;
    return { ...rest, ...overrides };
};

const FIELDS = [
    { key: 'address_line1', label: 'Address Line 1' },
    { key: 'address_line2', label: 'Address Line 2' },
    { key: 'city_state', label: 'City / State' },
    { key: 'country', label: 'Country' },
    { key: 'student_phone', label: 'Phone' },
    { key: 'student_email', label: 'Email', type: 'email' },
];

export default function ContactTab({ student, canEdit, onReload }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});

    useEffect(() => {
        const init = {};
        FIELDS.forEach((f) => { init[f.key] = student[f.key] || ''; });
        setForm(init);
        setEditing(false);
    }, [student.id]); // reset when switching students

    const startEdit = () => {
        const init = {};
        FIELDS.forEach((f) => { init[f.key] = student[f.key] || ''; });
        setForm(init);
        setEditing(true);
    };

    const handleChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = buildStudentPayload(student, form);
            await axios.put(`${API}/students/${student.id}`, payload);
            toast.success('Contact information updated');
            setEditing(false);
            onReload?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to update contact');
        } finally {
            setSaving(false);
        }
    };

    const address = [student.address_line1, student.address_line2, student.city_state, student.country]
        .filter(Boolean).join(', ') || '—';

    return (
        <div className="lp-card" data-testid="contact-tab-card">
            <div className="lp-card__header">
                <h3 className="lp-card__title"><Home />Contact Information</h3>
                {canEdit && !editing && (
                    <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" onClick={startEdit} data-testid="contact-edit-btn">
                        <Pencil size={12} /> Edit
                    </button>
                )}
            </div>

            {!editing ? (
                <div className="lp-kv">
                    <span className="lp-kv__k"><Home size={11} style={{ display: 'inline', marginRight: 4 }} />Address</span>
                    <span className="lp-kv__v">{address}</span>
                    <span className="lp-kv__k">City / State</span>
                    <span className="lp-kv__v">{student.city_state || '—'}</span>
                    <span className="lp-kv__k">Country</span>
                    <span className="lp-kv__v">{student.country || '—'}</span>
                    <span className="lp-kv__k"><Phone size={11} style={{ display: 'inline', marginRight: 4 }} />Phone</span>
                    <span className="lp-kv__v">{student.student_phone || '—'}</span>
                    <span className="lp-kv__k"><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />Email</span>
                    <span className="lp-kv__v">
                        {student.student_email
                            ? <a href={`mailto:${student.student_email}`}>{student.student_email}</a>
                            : <span className="lp-muted">—</span>}
                    </span>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        {FIELDS.map((f) => (
                            <div className="lp-field" key={f.key} style={f.key === 'address_line1' || f.key === 'address_line2' ? { gridColumn: '1 / -1' } : undefined}>
                                <label className="lp-field__label">{f.label}</label>
                                <input
                                    className="lp-input"
                                    type={f.type || 'text'}
                                    value={form[f.key] || ''}
                                    onChange={(e) => handleChange(f.key, e.target.value)}
                                    data-testid={`contact-input-${f.key}`}
                                />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="lp-btn lp-btn--primary" onClick={handleSave} disabled={saving} data-testid="contact-save-btn">
                            <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button type="button" className="lp-btn lp-btn--outline" onClick={() => setEditing(false)} disabled={saving} data-testid="contact-cancel-btn">
                            <X size={13} /> Cancel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
