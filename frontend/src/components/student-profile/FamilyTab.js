import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Users, Plus, Mail, Phone, Smartphone, Pencil, X, Save, Trash2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SALUTATIONS = ['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const RELATIONSHIPS = ['', 'Mother', 'Father', 'Aunt', 'Uncle', 'Brother', 'Sister', 'Stepmother', 'Stepfather', 'Grandparent', 'Guardian', 'Other'];
const GENDERS = ['', 'Male', 'Female', 'Other'];

const buildStudentPayload = (student, overrides) => {
    const { id, school_code, age, created_at, updated_at, ...rest } = student;
    return { ...rest, ...overrides };
};

const emptyMember = () => ({
    salutation: '', first_name: '', middle_name: '', last_name: '', gender: '',
    relationship: '', email: '', home_phone: '', cell_phone: '', work_phone: '',
    address_line1: '', address_line2: '', city_state: '', country: '',
});

export default function FamilyTab({ student, canEdit, onReload }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [members, setMembers] = useState([]);

    useEffect(() => {
        setMembers(student.family_members || []);
        setEditing(false);
    }, [student.id, student.family_members]);

    const guardians = student.family_members || [];

    const startEdit = () => {
        setMembers(JSON.parse(JSON.stringify(student.family_members || [])));
        setEditing(true);
    };

    const updateMember = (idx, key, value) => {
        setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
    };

    const addMember = () => setMembers((prev) => [...prev, emptyMember()]);
    const removeMember = (idx) => setMembers((prev) => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        for (const m of members) {
            if (!m.first_name?.trim() && !m.last_name?.trim()) {
                toast.error('Each family member needs at least a first or last name');
                return;
            }
        }
        setSaving(true);
        try {
            const payload = buildStudentPayload(student, { family_members: members });
            await axios.put(`${API}/students/${student.id}`, payload);
            toast.success('Family information updated');
            setEditing(false);
            onReload?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to update family');
        } finally {
            setSaving(false);
        }
    };

    // ===== EDIT MODE =====
    if (editing) {
        return (
            <div className="lp-card" data-testid="family-edit-card">
                <div className="lp-card__header">
                    <h3 className="lp-card__title"><Users />Edit Family Members</h3>
                    <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" onClick={addMember} data-testid="family-add-member-btn">
                        <Plus size={12} /> Add Member
                    </button>
                </div>

                {members.length === 0 ? (
                    <div className="lp-empty" style={{ padding: 20 }}>
                        <p>No family members yet. Use Add Member to add one.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {members.map((m, idx) => (
                            <div key={idx} className="lp-card" style={{ background: '#FAFAFA' }} data-testid={`family-edit-member-${idx}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>Member {idx + 1}</span>
                                    <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" style={{ color: 'hsl(var(--destructive))' }} onClick={() => removeMember(idx)} data-testid={`family-remove-member-${idx}`}>
                                        <Trash2 size={12} /> Remove
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Salutation</label>
                                        <select className="lp-select" value={m.salutation || ''} onChange={(e) => updateMember(idx, 'salutation', e.target.value)}>
                                            {SALUTATIONS.map((s) => <option key={s} value={s}>{s || 'Select…'}</option>)}
                                        </select>
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Relationship</label>
                                        <select className="lp-select" value={m.relationship || ''} onChange={(e) => updateMember(idx, 'relationship', e.target.value)} data-testid={`family-rel-${idx}`}>
                                            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r || 'Select…'}</option>)}
                                        </select>
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Gender</label>
                                        <select className="lp-select" value={m.gender || ''} onChange={(e) => updateMember(idx, 'gender', e.target.value)}>
                                            {GENDERS.map((g) => <option key={g} value={g}>{g || 'Select…'}</option>)}
                                        </select>
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">First Name</label>
                                        <input className="lp-input" value={m.first_name || ''} onChange={(e) => updateMember(idx, 'first_name', e.target.value)} data-testid={`family-first-${idx}`} />
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Middle Name</label>
                                        <input className="lp-input" value={m.middle_name || ''} onChange={(e) => updateMember(idx, 'middle_name', e.target.value)} />
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Last Name</label>
                                        <input className="lp-input" value={m.last_name || ''} onChange={(e) => updateMember(idx, 'last_name', e.target.value)} data-testid={`family-last-${idx}`} />
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Email</label>
                                        <input className="lp-input" type="email" value={m.email || ''} onChange={(e) => updateMember(idx, 'email', e.target.value)} />
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Cell Phone</label>
                                        <input className="lp-input" value={m.cell_phone || ''} onChange={(e) => updateMember(idx, 'cell_phone', e.target.value)} />
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Home Phone</label>
                                        <input className="lp-input" value={m.home_phone || ''} onChange={(e) => updateMember(idx, 'home_phone', e.target.value)} />
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Work Phone</label>
                                        <input className="lp-input" value={m.work_phone || ''} onChange={(e) => updateMember(idx, 'work_phone', e.target.value)} />
                                    </div>
                                    <div className="lp-field" style={{ gridColumn: 'span 2' }}>
                                        <label className="lp-field__label">Address Line 1</label>
                                        <input className="lp-input" value={m.address_line1 || ''} onChange={(e) => updateMember(idx, 'address_line1', e.target.value)} />
                                    </div>
                                    <div className="lp-field" style={{ gridColumn: 'span 2' }}>
                                        <label className="lp-field__label">Address Line 2</label>
                                        <input className="lp-input" value={m.address_line2 || ''} onChange={(e) => updateMember(idx, 'address_line2', e.target.value)} />
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">City / State</label>
                                        <input className="lp-input" value={m.city_state || ''} onChange={(e) => updateMember(idx, 'city_state', e.target.value)} />
                                    </div>
                                    <div className="lp-field">
                                        <label className="lp-field__label">Country</label>
                                        <input className="lp-input" value={m.country || ''} onChange={(e) => updateMember(idx, 'country', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button type="button" className="lp-btn lp-btn--primary" onClick={handleSave} disabled={saving} data-testid="family-save-btn">
                        <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" className="lp-btn lp-btn--outline" onClick={() => setEditing(false)} disabled={saving} data-testid="family-cancel-btn">
                        <X size={13} /> Cancel
                    </button>
                </div>
            </div>
        );
    }

    // ===== VIEW MODE =====
    return (
        <div className="lp-card">
            <div className="lp-card__header">
                <h3 className="lp-card__title"><Users />Family Members</h3>
                {canEdit && (
                    <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" onClick={startEdit} data-testid="family-edit-btn">
                        <Pencil size={12} /> Edit
                    </button>
                )}
            </div>
            {guardians.length === 0 ? (
                <div className="lp-empty" style={{ padding: 24 }}>
                    <h4>No family on file</h4>
                    <p>{canEdit ? 'Click "Edit" to add parents, guardians, or emergency contacts.' : 'No family members have been added yet.'}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {guardians.map((g, idx) => (
                        <div
                            key={g.id || idx}
                            className="lp-card"
                            style={{ background: '#FAFAFA' }}
                            data-testid={`family-member-${idx}`}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                                <div style={{ fontWeight: 600, color: '#1565C0', fontSize: 13.5 }}>
                                    {[g.salutation, g.first_name, g.middle_name, g.last_name].filter(Boolean).join(' ')}
                                </div>
                                <span className="lp-badge lp-badge--info">{g.relationship || 'Family'}</span>
                            </div>
                            <div className="lp-kv" style={{ gridTemplateColumns: '70px 1fr', gap: '3px 8px' }}>
                                {g.email && (
                                    <>
                                        <span className="lp-kv__k"><Mail size={11} /> Email</span>
                                        <span className="lp-kv__v"><a href={`mailto:${g.email}`}>{g.email}</a></span>
                                    </>
                                )}
                                {g.cell_phone && (
                                    <>
                                        <span className="lp-kv__k"><Smartphone size={11} /> Mobile</span>
                                        <span className="lp-kv__v">{g.cell_phone}</span>
                                    </>
                                )}
                                {g.home_phone && (
                                    <>
                                        <span className="lp-kv__k"><Phone size={11} /> Home</span>
                                        <span className="lp-kv__v">{g.home_phone}</span>
                                    </>
                                )}
                                {g.work_phone && (
                                    <>
                                        <span className="lp-kv__k"><Phone size={11} /> Work</span>
                                        <span className="lp-kv__v">{g.work_phone}</span>
                                    </>
                                )}
                                {(g.address_line1 || g.city_state) && (
                                    <>
                                        <span className="lp-kv__k">Address</span>
                                        <span className="lp-kv__v">
                                            {[g.address_line1, g.address_line2, g.city_state, g.country].filter(Boolean).join(', ')}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
