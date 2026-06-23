import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
    Search,
    Mail,
    Phone,
    Smartphone,
    Home,
    User as UserIcon,
    Shield,
    Key,
    BadgeCheck,
    Loader2,
    ChevronRight,
    Pencil,
    Save,
    X,
    Camera,
} from 'lucide-react';
import '../styles/student-profile.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_OPTIONS = ['All Staff', 'Admin', 'Teacher', 'Superuser'];
const STAFF_TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'profile',   label: 'Profile' },
    { key: 'contact',   label: 'Contact' },
    { key: 'login',     label: 'Login Management' },
];

const displayName = (u) => {
    const composed = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ').trim();
    return composed || u.name || u.username;
};

const lastFirst = (u) => {
    const first = u.first_name || (u.name ? u.name.split(' ')[0] : '') || '';
    const last = u.last_name || (u.name ? u.name.split(' ').slice(1).join(' ') : '') || u.username;
    return `${last || u.username}, ${first}`.trim();
};

export default function StaffProfilePage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { isAdmin, user: me } = useAuth();

    const [roster, setRoster] = useState([]);
    const [rosterLoading, setRosterLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('All Staff');
    const [search, setSearch] = useState('');

    const [staff, setStaff] = useState(null);
    const [staffLoading, setStaffLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return STAFF_TABS.find((t) => t.key === hash) ? hash : 'dashboard';
    });

    useEffect(() => {
        if (!window.location.hash) {
            window.history.replaceState(null, '', `${window.location.pathname}#${activeTab}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load roster (admin endpoint — non-admins blocked at route level too)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setRosterLoading(true);
            try {
                const res = await axios.get(`${API}/users`);
                if (cancelled) return;
                // Exclude parents from the Staff roster
                const staffOnly = (res.data || []).filter((u) => u.role !== 'parent');
                setRoster(staffOnly);
            } catch (e) {
                toast.error(e?.response?.data?.detail || 'Failed to load staff roster');
            } finally {
                if (!cancelled) setRosterLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const loadStaff = useCallback(async (id) => {
        if (!id) return;
        setStaffLoading(true);
        try {
            const res = await axios.get(`${API}/users/${id}`);
            setStaff(res.data);
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to load staff member');
            setStaff(null);
        } finally {
            setStaffLoading(false);
        }
    }, []);

    useEffect(() => {
        if (userId) loadStaff(userId);
    }, [userId, loadStaff]);

    useEffect(() => {
        if (!userId && roster.length > 0 && !rosterLoading) {
            navigate(`/staff/${roster[0].id}#${activeTab}`, { replace: true });
        }
    }, [userId, roster, rosterLoading, navigate, activeTab]);

    const filteredRoster = useMemo(() => {
        const term = search.trim().toLowerCase();
        const filtered = roster.filter((u) => {
            if (roleFilter !== 'All Staff') {
                const wanted = roleFilter.toLowerCase();
                if ((u.role || '').toLowerCase() !== wanted) return false;
            }
            if (term) {
                const blob = `${u.name || ''} ${u.username || ''} ${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase();
                if (!blob.includes(term)) return false;
            }
            return true;
        });
        return [...filtered].sort((a, b) => lastFirst(a).toLowerCase().localeCompare(lastFirst(b).toLowerCase()));
    }, [roster, roleFilter, search]);

    const onTabChange = useCallback((key) => {
        setActiveTab(key);
        window.history.replaceState(null, '', `${window.location.pathname}#${key}`);
    }, []);

    const selectStaff = useCallback((id) => {
        if (id === userId) return;
        setActiveTab('dashboard');
        navigate(`/staff/${id}#dashboard`);
    }, [userId, navigate]);

    const fullName = staff ? displayName(staff) : '';
    const initials = (staff ? displayName(staff) : '').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '?';

    const renderActiveTab = () => {
        if (!staff) return null;
        const canEdit = isAdmin && (me?.role === 'superuser' || staff.role !== 'superuser');
        const reload = () => loadStaff(staff.id);
        if (activeTab === 'dashboard') return <StaffDashboardTab staff={staff} initials={initials} onCardClick={onTabChange} canEdit={canEdit} onReload={reload} />;
        if (activeTab === 'profile')   return <StaffProfileTab staff={staff} canEdit={canEdit} onReload={reload} />;
        if (activeTab === 'contact')   return <StaffContactTab staff={staff} canEdit={canEdit} onReload={reload} />;
        if (activeTab === 'login')     return <StaffLoginTab staff={staff} me={me} onReload={reload} />;
        return null;
    };

    return (
        <div className="lumina-profile-page" data-testid="lumina-staff-profile">
            <div className="lumina-profile-topbar" data-testid="staff-actionbar">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="topbar-name" data-testid="staff-actionbar-name">
                        {fullName || (staffLoading ? 'Loading…' : 'No staff member selected')}
                    </span>
                    {staff && (
                        <>
                            <span
                                className="lp-badge lp-badge--info"
                                style={{ fontSize: 11, textTransform: 'capitalize' }}
                                data-testid="staff-topbar-role"
                            >
                                {staff.role}
                            </span>
                            {staff.email && (
                                <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground" data-testid="staff-topbar-email">
                                    <Mail size={12} /> {staff.email}
                                </span>
                            )}
                            {staff.phone && (
                                <span className="hidden lg:inline-flex items-center gap-1 text-xs text-muted-foreground" data-testid="staff-topbar-phone">
                                    <Phone size={12} /> {staff.phone}
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div className="topbar-actions">
                    <span
                        className="hidden md:inline-flex items-center text-xs text-muted-foreground px-2"
                        data-testid="staff-topbar-count"
                    >
                        {filteredRoster.length} {filteredRoster.length === 1 ? 'staff member' : 'staff members'}
                    </span>
                </div>
            </div>

            <div className="lumina-profile-body">
                {/* LEFT: ROSTER */}
                <aside className="lumina-profile-left" data-testid="staff-roster-panel">
                    <div className="roster-filters">
                        <div className="lp-field">
                            <label className="lp-field__label">Type</label>
                            <select className="lp-select" value="Staff" disabled data-testid="staff-filter-type">
                                <option>Student</option>
                                <option>Staff</option>
                            </select>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Role</label>
                            <select
                                className="lp-select"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                data-testid="staff-filter-role"
                            >
                                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="lp-field lp-field--full">
                            <label className="lp-field__label">Search</label>
                            <div className="lp-search">
                                <input
                                    className="lp-input"
                                    placeholder="Search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    data-testid="staff-filter-search"
                                    style={{ paddingRight: 38 }}
                                />
                                <button type="button" className="lp-search__icon" aria-label="Search">
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="roster-list" data-testid="staff-roster-list">
                        {rosterLoading ? (
                            <div className="lp-roster__empty">
                                <Loader2 className="animate-spin inline-block mr-2" size={14} />
                                Loading…
                            </div>
                        ) : filteredRoster.length === 0 ? (
                            <div className="lp-roster__empty">No staff match the current filters.</div>
                        ) : (
                            filteredRoster.map((u) => {
                                const isActive = u.id === userId;
                                return (
                                    <div
                                        key={u.id}
                                        className={`lp-roster__row ${isActive ? 'lp-roster__row--active' : ''}`}
                                        onClick={() => selectStaff(u.id)}
                                        data-testid={`staff-roster-row-${u.id}`}
                                    >
                                        <div>{lastFirst(u)}</div>
                                        <div style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2, fontWeight: 600 }}>
                                            {u.role}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="roster-footer">
                        <span data-testid="staff-roster-count">Count: {filteredRoster.length}</span>
                        <Link to="/users" className="lp-link" data-testid="staff-roster-add-link">
                            Manage
                        </Link>
                    </div>
                </aside>

                {/* CENTER */}
                <main className="lumina-profile-center" data-testid="staff-center">
                    {staffLoading ? (
                        <div className="lp-empty">
                            <Loader2 className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }} />
                            Loading profile…
                        </div>
                    ) : !staff ? (
                        <div className="lp-empty">
                            <h4>Select a staff member from the list</h4>
                        </div>
                    ) : (
                        <>
                            <h1 className="lp-center__title" data-testid="staff-name">
                                {fullName}
                                <span className="lp-badge lp-badge--info" style={{ marginLeft: 12, verticalAlign: 'middle', fontSize: 11 }}>
                                    {staff.role}
                                </span>
                            </h1>
                            {renderActiveTab()}
                        </>
                    )}
                </main>

                {/* RIGHT */}
                <nav className="lumina-profile-right" data-testid="staff-tabs">
                    {STAFF_TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className={`rnav-tab ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => onTabChange(t.key)}
                            data-testid={`staff-tab-${t.key}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
}

// ─── Tabs ─────────────────────────────────────────────────────────

function StaffDashboardTab({ staff, initials, onCardClick, canEdit, onReload }) {
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileRef = useRef(null);

    const resolvePhoto = (url) => (!url ? '' : (url.startsWith('http') ? url : `${process.env.REACT_APP_BACKEND_URL}${url}`));

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Image too large (max 5MB)'); e.target.value = ''; return; }
        setUploadingPhoto(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const up = await axios.post(`${API}/upload/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            await axios.put(`${API}/users/${staff.id}`, { photo_url: up.data.photo_url });
            toast.success('Photo updated');
            onReload?.();
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleRemovePhoto = async () => {
        if (!window.confirm('Remove this photo?')) return;
        setUploadingPhoto(true);
        try {
            await axios.put(`${API}/users/${staff.id}`, { photo_url: '' });
            toast.success('Photo removed');
            onReload?.();
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to remove photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const cardProps = (key, extraClass = '') => onCardClick
        ? { onClick: () => onCardClick(key), className: `lp-card lp-card--clickable ${extraClass}`.trim(), role: 'button', tabIndex: 0,
            onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(key); } } }
        : { className: `lp-card ${extraClass}`.trim() };
    const openHint = onCardClick
        ? <span className="lp-card__open-hint" aria-hidden="true">Open <ChevronRight size={12} /></span>
        : null;
    return (
        <div className="lp-dashboard">
            {/* Avatar card (left col, spans 2 rows) */}
            <div className="lp-card lp-card--photo" data-testid="staff-card-avatar">
                <div className="lp-photo-wrap">
                    {staff.photo_url ? (
                        <img src={resolvePhoto(staff.photo_url)} alt={staff.name} className="lp-photo" />
                    ) : (
                        <div
                            className="lp-photo"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 56, fontWeight: 700, color: 'hsl(var(--primary))',
                                background: 'hsl(var(--primary) / 0.10)', letterSpacing: '-0.04em',
                            }}
                        >
                            {initials}
                        </div>
                    )}
                    {canEdit && (
                        <button
                            type="button"
                            className="lp-photo-edit"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploadingPhoto}
                            title={staff.photo_url ? 'Change photo' : 'Upload photo'}
                            data-testid="staff-photo-upload-btn"
                        >
                            <Camera size={14} /> {uploadingPhoto ? 'Uploading…' : (staff.photo_url ? 'Change' : 'Upload')}
                        </button>
                    )}
                </div>
                {canEdit && (
                    <>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} data-testid="staff-photo-input" />
                        {staff.photo_url && (
                            <button type="button" className="lp-photo-remove" onClick={handleRemovePhoto} disabled={uploadingPhoto} data-testid="staff-photo-remove-btn">
                                <X size={11} /> Remove
                            </button>
                        )}
                    </>
                )}
                <div style={{ marginTop: 12, textAlign: 'center', width: '100%' }}>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
                        Username
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'hsl(var(--foreground))', wordBreak: 'break-all' }}>
                        {staff.username}
                    </div>
                </div>
            </div>

            {/* Identity (row 1, spans 2 cols) */}
            <div {...cardProps('profile', 'lp-card--span2')} data-testid="staff-card-identity">
                <div className="lp-card__header"><h3 className="lp-card__title"><UserIcon />Identity</h3>{openHint}</div>
                <div className="lp-kv">
                    <span className="lp-kv__k">Full Name</span>
                    <span className="lp-kv__v">{[staff.first_name, staff.middle_name, staff.last_name].filter(Boolean).join(' ') || staff.name || '—'}</span>
                    <span className="lp-kv__k">Salutation</span>
                    <span className="lp-kv__v">{staff.salutation || '—'}</span>
                    <span className="lp-kv__k">Gender</span>
                    <span className="lp-kv__v">{staff.gender || '—'}</span>
                    <span className="lp-kv__k">School</span>
                    <span className="lp-kv__v">{staff.school_code}</span>
                </div>
            </div>

            {/* Row 2 left: Role & Access */}
            <div className="lp-card" data-testid="staff-card-role">
                <div className="lp-card__header"><h3 className="lp-card__title"><Shield />Role &amp; Access</h3></div>
                <div className="lp-kv">
                    <span className="lp-kv__k">Role</span>
                    <span className="lp-kv__v">
                        <span className="lp-badge lp-badge--info">{staff.role}</span>
                    </span>
                    <span className="lp-kv__k">Permissions</span>
                    <span className="lp-kv__v">
                        {(staff.permissions && staff.permissions.length > 0)
                            ? `${staff.permissions.length} granted`
                            : '—'}
                    </span>
                    <span className="lp-kv__k">Created</span>
                    <span className="lp-kv__v">{staff.created_at ? new Date(staff.created_at).toLocaleDateString() : '—'}</span>
                </div>
            </div>

            {/* Row 2 right: Contact summary */}
            <div {...cardProps('contact')} data-testid="staff-card-contact-summary">
                <div className="lp-card__header"><h3 className="lp-card__title"><Mail />Contact</h3>{openHint}</div>
                <div className="lp-kv">
                    <span className="lp-kv__k">Email</span>
                    <span className="lp-kv__v">
                        {staff.email ? <a href={`mailto:${staff.email}`} onClick={(e) => e.stopPropagation()}>{staff.email}</a> : <span className="lp-muted">—</span>}
                    </span>
                    <span className="lp-kv__k">Phone</span>
                    <span className="lp-kv__v">{staff.phone || '—'}</span>
                </div>
            </div>

            {/* Row 3: Permissions list (full width) */}
            <div className="lp-card lp-card--span3" data-testid="staff-card-permissions">
                <div className="lp-card__header"><h3 className="lp-card__title"><BadgeCheck />Granted Permissions</h3></div>
                {(!staff.permissions || staff.permissions.length === 0) ? (
                    <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', padding: '4px 0' }}>
                        No explicit permissions granted.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {staff.permissions.map((p) => (
                            <span key={p} className="lp-badge lp-badge--info" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
                                {p.replace(/_/g, ' ')}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StaffContactTab({ staff, canEdit, onReload }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});

    const initForm = () => ({
        email: staff.email || '',
        phone: staff.phone || '',
        address_line1: staff.address_line1 || '',
        address_line2: staff.address_line2 || '',
        city_state: staff.city_state || '',
        country: staff.country || '',
    });

    useEffect(() => { setForm(initForm()); setEditing(false);  }, [staff.id]);

    const startEdit = () => { setForm(initForm()); setEditing(true); };
    const handleChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${API}/users/${staff.id}`, form);
            toast.success('Contact information updated');
            setEditing(false);
            onReload?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to update contact');
        } finally {
            setSaving(false);
        }
    };

    const address = [staff.address_line1, staff.address_line2, staff.city_state, staff.country].filter(Boolean).join(', ') || '—';

    if (editing) {
        return (
            <div className="lp-card" data-testid="staff-contact-edit-card">
                <div className="lp-card__header"><h3 className="lp-card__title"><Mail />Edit Contact</h3></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div className="lp-field">
                        <label className="lp-field__label">Email</label>
                        <input className="lp-input" type="email" value={form.email || ''} onChange={(e) => handleChange('email', e.target.value)} data-testid="staff-contact-input-email" />
                    </div>
                    <div className="lp-field">
                        <label className="lp-field__label">Phone</label>
                        <input className="lp-input" value={form.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} data-testid="staff-contact-input-phone" />
                    </div>
                    <div className="lp-field" style={{ gridColumn: '1 / -1' }}>
                        <label className="lp-field__label">Address Line 1</label>
                        <input className="lp-input" value={form.address_line1 || ''} onChange={(e) => handleChange('address_line1', e.target.value)} data-testid="staff-contact-input-address1" />
                    </div>
                    <div className="lp-field" style={{ gridColumn: '1 / -1' }}>
                        <label className="lp-field__label">Address Line 2</label>
                        <input className="lp-input" value={form.address_line2 || ''} onChange={(e) => handleChange('address_line2', e.target.value)} data-testid="staff-contact-input-address2" />
                    </div>
                    <div className="lp-field">
                        <label className="lp-field__label">City / State</label>
                        <input className="lp-input" value={form.city_state || ''} onChange={(e) => handleChange('city_state', e.target.value)} data-testid="staff-contact-input-city" />
                    </div>
                    <div className="lp-field">
                        <label className="lp-field__label">Country</label>
                        <input className="lp-input" value={form.country || ''} onChange={(e) => handleChange('country', e.target.value)} data-testid="staff-contact-input-country" />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="lp-btn lp-btn--primary" onClick={handleSave} disabled={saving} data-testid="staff-contact-save-btn">
                        <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" className="lp-btn lp-btn--outline" onClick={() => setEditing(false)} disabled={saving} data-testid="staff-contact-cancel-btn">
                        <X size={13} /> Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="lp-card" style={{ marginBottom: 16 }} data-testid="staff-contact-card">
                <div className="lp-card__header">
                    <h3 className="lp-card__title"><Mail />Email &amp; Phones</h3>
                    {canEdit && (
                        <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" onClick={startEdit} data-testid="staff-contact-edit-btn">
                            <Pencil size={12} /> Edit
                        </button>
                    )}
                </div>
                <div className="lp-kv">
                    <span className="lp-kv__k"><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />Email</span>
                    <span className="lp-kv__v">
                        {staff.email ? <a href={`mailto:${staff.email}`}>{staff.email}</a> : <span className="lp-muted">—</span>}
                    </span>
                    <span className="lp-kv__k"><Phone size={11} style={{ display: 'inline', marginRight: 4 }} />Phone</span>
                    <span className="lp-kv__v">{staff.phone || '—'}</span>
                </div>
            </div>
            <div className="lp-card" data-testid="staff-address-card">
                <div className="lp-card__header"><h3 className="lp-card__title"><Home />Address</h3></div>
                <div className="lp-kv">
                    <span className="lp-kv__k">Address</span>
                    <span className="lp-kv__v">{address}</span>
                    <span className="lp-kv__k">City / State</span>
                    <span className="lp-kv__v">{staff.city_state || '—'}</span>
                    <span className="lp-kv__k">Country</span>
                    <span className="lp-kv__v">{staff.country || '—'}</span>
                </div>
            </div>
        </>
    );
}

function StaffProfileTab({ staff, canEdit, onReload }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});

    const initForm = () => ({
        salutation: staff.salutation || '',
        first_name: staff.first_name || '',
        middle_name: staff.middle_name || '',
        last_name: staff.last_name || '',
        gender: staff.gender || '',
    });

    useEffect(() => { setForm(initForm()); setEditing(false);  }, [staff.id]);

    const startEdit = () => { setForm(initForm()); setEditing(true); };
    const handleChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

    const handleSave = async () => {
        if (!form.first_name?.trim() || !form.last_name?.trim()) {
            toast.error('First and last name are required');
            return;
        }
        setSaving(true);
        try {
            await axios.put(`${API}/users/${staff.id}`, form);
            toast.success('Profile updated');
            setEditing(false);
            onReload?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const fullName = [staff.first_name, staff.middle_name, staff.last_name].filter(Boolean).join(' ') || staff.name || '—';

    if (editing) {
        return (
            <div className="lp-card" data-testid="staff-profile-edit-card">
                <div className="lp-card__header"><h3 className="lp-card__title"><UserIcon />Edit Profile</h3></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div className="lp-field">
                        <label className="lp-field__label">Salutation</label>
                        <select className="lp-select" value={form.salutation || ''} onChange={(e) => handleChange('salutation', e.target.value)} data-testid="staff-profile-input-salutation">
                            {['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'].map((s) => <option key={s} value={s}>{s || 'Select…'}</option>)}
                        </select>
                    </div>
                    <div className="lp-field">
                        <label className="lp-field__label">Gender</label>
                        <select className="lp-select" value={form.gender || ''} onChange={(e) => handleChange('gender', e.target.value)} data-testid="staff-profile-input-gender">
                            {['', 'Male', 'Female', 'Other'].map((g) => <option key={g} value={g}>{g || 'Select…'}</option>)}
                        </select>
                    </div>
                    <div className="lp-field">
                        <label className="lp-field__label">First Name *</label>
                        <input className="lp-input" value={form.first_name || ''} onChange={(e) => handleChange('first_name', e.target.value)} data-testid="staff-profile-input-first_name" />
                    </div>
                    <div className="lp-field">
                        <label className="lp-field__label">Middle Name</label>
                        <input className="lp-input" value={form.middle_name || ''} onChange={(e) => handleChange('middle_name', e.target.value)} data-testid="staff-profile-input-middle_name" />
                    </div>
                    <div className="lp-field">
                        <label className="lp-field__label">Last Name *</label>
                        <input className="lp-input" value={form.last_name || ''} onChange={(e) => handleChange('last_name', e.target.value)} data-testid="staff-profile-input-last_name" />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="lp-btn lp-btn--primary" onClick={handleSave} disabled={saving} data-testid="staff-profile-save-btn">
                        <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" className="lp-btn lp-btn--outline" onClick={() => setEditing(false)} disabled={saving} data-testid="staff-profile-cancel-btn">
                        <X size={13} /> Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="lp-card" data-testid="staff-profile-card">
            <div className="lp-card__header">
                <h3 className="lp-card__title"><UserIcon />Identity</h3>
                {canEdit && (
                    <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" onClick={startEdit} data-testid="staff-profile-edit-btn">
                        <Pencil size={12} /> Edit
                    </button>
                )}
            </div>
            <div className="lp-kv">
                <span className="lp-kv__k">Full Name</span>
                <span className="lp-kv__v">{fullName}</span>
                <span className="lp-kv__k">Salutation</span>
                <span className="lp-kv__v">{staff.salutation || '—'}</span>
                <span className="lp-kv__k">Gender</span>
                <span className="lp-kv__v">{staff.gender || '—'}</span>
                <span className="lp-kv__k">Role</span>
                <span className="lp-kv__v"><span className="lp-badge lp-badge--info">{staff.role}</span></span>
                <span className="lp-kv__k">School</span>
                <span className="lp-kv__v">{staff.school_code}</span>
            </div>
        </div>
    );
}

function StaffLoginTab({ staff, me, onReload }) {
    const [showPwd, setShowPwd] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const canManage = me?.role === 'superuser' || (me?.role === 'admin' && staff.role !== 'superuser');

    const submit = async () => {
        if (!newUsername && !newPassword) {
            toast.info('Enter a new username or password.');
            return;
        }
        setSaving(true);
        try {
            const body = {};
            if (newUsername) body.username = newUsername.trim();
            if (newPassword) body.password = newPassword;
            await axios.put(`${API}/users/${staff.id}/credentials`, body);
            toast.success('Credentials updated');
            setNewUsername('');
            setNewPassword('');
            setShowPwd(false);
            onReload?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to update credentials');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="lp-card" style={{ marginBottom: 16 }} data-testid="staff-login-summary">
                <div className="lp-card__header"><h3 className="lp-card__title"><Key />Login Details</h3></div>
                <div className="lp-kv">
                    <span className="lp-kv__k">Username</span>
                    <span className="lp-kv__v" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5 }}>{staff.username}</span>
                    <span className="lp-kv__k">Role</span>
                    <span className="lp-kv__v">
                        <span className="lp-badge lp-badge--info">{staff.role}</span>
                    </span>
                    <span className="lp-kv__k">School</span>
                    <span className="lp-kv__v">{staff.school_code}</span>
                </div>
            </div>

            {canManage ? (
                <div className="lp-card" data-testid="staff-reset-card">
                    <div className="lp-card__header"><h3 className="lp-card__title"><Key />Reset Credentials</h3></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                        <div className="lp-field">
                            <label className="lp-field__label">New Username (optional)</label>
                            <input
                                className="lp-input"
                                placeholder={staff.username}
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                data-testid="staff-new-username"
                            />
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">New Password (optional)</label>
                            <input
                                className="lp-input"
                                type={showPwd ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                data-testid="staff-new-password"
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            type="button"
                            className="lp-btn lp-btn--primary"
                            onClick={submit}
                            disabled={saving}
                            data-testid="staff-save-credentials"
                        >
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                            <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} />
                            Show password
                        </label>
                    </div>
                </div>
            ) : (
                <div className="lp-empty">
                    <h4>Read-only</h4>
                    <p>Only superusers can modify a superuser&apos;s credentials.</p>
                </div>
            )}
        </>
    );
}
