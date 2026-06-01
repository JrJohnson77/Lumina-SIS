import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import '../styles/student-profile.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_OPTIONS = ['All Staff', 'Admin', 'Teacher', 'Superuser'];
const STAFF_TABS = [
    { key: 'dashboard', label: 'Dashboard' },
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
        if (activeTab === 'dashboard') return <StaffDashboardTab staff={staff} initials={initials} />;
        if (activeTab === 'contact')   return <StaffContactTab staff={staff} />;
        if (activeTab === 'login')     return <StaffLoginTab staff={staff} me={me} onReload={() => loadStaff(staff.id)} />;
        return null;
    };

    return (
        <div className="lumina-profile-page" data-testid="lumina-staff-profile">
            <div className="lumina-profile-topbar" data-testid="staff-actionbar">
                <span className="topbar-name" data-testid="staff-actionbar-name">
                    {fullName || (staffLoading ? 'Loading…' : 'No staff member selected')}
                </span>
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
                        <div className="lp-field">
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

function StaffDashboardTab({ staff, initials }) {
    return (
        <div className="lp-dashboard">
            {/* Avatar card */}
            <div className="lp-card lp-card--photo" data-testid="staff-card-avatar">
                {staff.photo_url ? (
                    <img src={staff.photo_url} alt={staff.name} className="lp-photo" />
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
            </div>

            {/* Identity */}
            <div className="lp-card lp-card--span2" data-testid="staff-card-identity">
                <div className="lp-card__header"><h3 className="lp-card__title"><UserIcon />Identity</h3></div>
                <div className="lp-kv">
                    <span className="lp-kv__k">Salutation</span>
                    <span className="lp-kv__v">{staff.salutation || '—'}</span>
                    <span className="lp-kv__k">Gender</span>
                    <span className="lp-kv__v">{staff.gender || '—'}</span>
                    <span className="lp-kv__k">Username</span>
                    <span className="lp-kv__v" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5 }}>{staff.username}</span>
                    <span className="lp-kv__k">School</span>
                    <span className="lp-kv__v">{staff.school_code}</span>
                </div>
            </div>

            {/* Role & Access */}
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

            {/* Contact summary */}
            <div className="lp-card" data-testid="staff-card-contact-summary">
                <div className="lp-card__header"><h3 className="lp-card__title"><Mail />Contact</h3></div>
                <div className="lp-kv">
                    <span className="lp-kv__k">Email</span>
                    <span className="lp-kv__v">
                        {staff.email ? <a href={`mailto:${staff.email}`}>{staff.email}</a> : <span className="lp-muted">—</span>}
                    </span>
                    <span className="lp-kv__k">Phone</span>
                    <span className="lp-kv__v">{staff.phone || '—'}</span>
                </div>
            </div>

            {/* Permissions card (full row) */}
            <div className="lp-card lp-card--span4" data-testid="staff-card-permissions">
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

function StaffContactTab({ staff }) {
    const address = [staff.address_line1, staff.address_line2, staff.city_state, staff.country].filter(Boolean).join(', ') || '—';
    return (
        <>
            <div className="lp-card" style={{ marginBottom: 16 }} data-testid="staff-contact-card">
                <div className="lp-card__header"><h3 className="lp-card__title"><Mail />Email &amp; Phones</h3></div>
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
                    <p>Only superusers can modify a superuser's credentials.</p>
                </div>
            )}
        </>
    );
}
