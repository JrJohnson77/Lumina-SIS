import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
    Search,
    Trash2,
    Bell,
    Mail,
    BarChart3,
    Loader2,
} from 'lucide-react';
import '../styles/student-profile.css';

import DashboardTab from '../components/student-profile/DashboardTab';
import AcademicsTab from '../components/student-profile/AcademicsTab';
import AttendanceTab from '../components/student-profile/AttendanceTab';
import FamilyTab from '../components/student-profile/FamilyTab';
import MedicalTab from '../components/student-profile/MedicalTab';
import BehaviorTab from '../components/student-profile/BehaviorTab';
import EmptyTab from '../components/student-profile/EmptyTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = ['Enrolled', 'Inactive', 'Withdrawn', 'Graduated'];
const GRADE_OPTIONS = [
    'All Grades', 'Pre-K', 'Kindergarten',
    'Grade: 01', 'Grade: 02', 'Grade: 03', 'Grade: 04', 'Grade: 05',
    'Grade: 06', 'Grade: 07', 'Grade: 08', 'Grade: 09',
    'Grade: 10', 'Grade: 11', 'Grade: 12',
];
const SORT_OPTIONS = [
    { key: 'last',  label: 'Last Name' },
    { key: 'first', label: 'First Name' },
    { key: 'id',    label: 'Student ID' },
];

const SORT_KEYS = {
    last: (s) => [
        (s.last_name || '').toLowerCase(),
        (s.first_name || '').toLowerCase(),
        (s.middle_name || '').toLowerCase(),
    ],
    first: (s) => [
        (s.first_name || '').toLowerCase(),
        (s.last_name || '').toLowerCase(),
        (s.middle_name || '').toLowerCase(),
    ],
    id: (s) => [
        (s.student_id || '').toLowerCase() || '\uffff', // empty IDs sort last
        (s.last_name || '').toLowerCase(),
        (s.first_name || '').toLowerCase(),
    ],
};

const compareByKey = (keyFn) => (a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    for (let i = 0; i < ka.length; i++) {
        if (ka[i] < kb[i]) return -1;
        if (ka[i] > kb[i]) return 1;
    }
    return 0;
};

const TABS = [
    { key: 'dashboard',  label: 'Dashboard' },
    { key: 'academics',  label: 'Academics' },
    { key: 'alerts',     label: 'Alerts' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'behavior',   label: 'Behavior' },
    { key: 'family',     label: 'Family' },
    { key: 'interests',  label: 'Interests' },
    { key: 'login',      label: 'Login Management' },
    { key: 'medical',    label: 'Medical' },
    { key: 'schedule',   label: 'Schedule' },
    { key: 'school',     label: 'School' },
];

const matchesGradeFilter = (student, classMap, grade) => {
    if (!grade || grade === 'All Grades') return true;
    const cls = classMap.get(student.class_id);
    const gl = (cls?.grade_level || '').toLowerCase();
    const sel = grade.toLowerCase();
    if (sel === 'pre-k') return gl.includes('pre') && gl.includes('k');
    if (sel === 'kindergarten') return gl.startsWith('k') || gl.includes('kinder');
    const num = (sel.match(/\d+/) || [null])[0];
    if (!num) return true;
    const glNum = (gl.match(/\d+/) || [null])[0];
    return glNum === num || glNum === String(parseInt(num, 10));
};

// Small topbar action button — icon on top, label below
function TopBarAction({ icon: Icon, label, onClick, danger = false, disabled = false, testid }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            data-testid={testid}
            className={`topbar-action ${danger ? 'topbar-action--danger' : ''}`}
        >
            <Icon />
            <span>{label}</span>
        </button>
    );
}

export default function StudentProfilePage() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // roster state
    const [roster, setRoster] = useState([]);
    const [rosterLoading, setRosterLoading] = useState(true);
    const [classMap, setClassMap] = useState(new Map());
    const [typeFilter] = useState('Student'); // disabled in phase 1
    const [statusFilter, setStatusFilter] = useState('Enrolled');
    const [substatusFilter, setSubstatusFilter] = useState('All Grades');
    const [sortBy, setSortBy] = useState('last');
    const [nextYearFilter, setNextYearFilter] = useState(false);
    const [search, setSearch] = useState('');

    // active profile
    const [student, setStudent] = useState(null);
    const [studentLoading, setStudentLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return TABS.find((t) => t.key === hash) ? hash : 'dashboard';
    });

    // Persist hash on first paint
    useEffect(() => {
        if (!window.location.hash) {
            window.history.replaceState(null, '', `${window.location.pathname}#${activeTab}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initial load: roster + classes
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setRosterLoading(true);
            try {
                const [studentsRes, classesRes] = await Promise.all([
                    axios.get(`${API}/students`),
                    axios.get(`${API}/classes`),
                ]);
                if (cancelled) return;
                setRoster(studentsRes.data || []);
                const map = new Map();
                (classesRes.data || []).forEach((c) => map.set(c.id, c));
                setClassMap(map);
            } catch (e) {
                toast.error('Failed to load roster');
            } finally {
                if (!cancelled) setRosterLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Load active student detail
    const loadStudent = useCallback(async (id) => {
        if (!id) return;
        setStudentLoading(true);
        try {
            const res = await axios.get(`${API}/students/${id}`);
            setStudent(res.data);
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to load student');
            setStudent(null);
        } finally {
            setStudentLoading(false);
        }
    }, []);

    useEffect(() => {
        if (studentId) loadStudent(studentId);
    }, [studentId, loadStudent]);

    // Auto-select first roster student if URL has no id
    useEffect(() => {
        if (!studentId && roster.length > 0 && !rosterLoading) {
            navigate(`/students/${roster[0].id}#${activeTab}`, { replace: true });
        }
    }, [studentId, roster, rosterLoading, navigate, activeTab]);

    // Filter + sort roster
    const filteredRoster = useMemo(() => {
        const term = search.trim().toLowerCase();
        const filtered = roster.filter((s) => {
            const st = (s.enrollment_status || 'enrolled').toLowerCase();
            if (st !== statusFilter.toLowerCase()) return false;
            if (!matchesGradeFilter(s, classMap, substatusFilter)) return false;
            if (term) {
                const blob = `${s.last_name || ''} ${s.first_name || ''} ${s.middle_name || ''} ${s.student_id || ''}`.toLowerCase();
                if (!blob.includes(term)) return false;
            }
            return true;
        });
        const keyFn = SORT_KEYS[sortBy] || SORT_KEYS.last;
        return [...filtered].sort(compareByKey(keyFn));
    }, [roster, statusFilter, substatusFilter, search, classMap, sortBy]);

    const onTabChange = useCallback((key) => {
        setActiveTab(key);
        window.history.replaceState(null, '', `${window.location.pathname}#${key}`);
    }, []);

    const selectStudent = useCallback((id) => {
        if (id === studentId) return;
        // Always reset to Dashboard tab on new selection (per spec)
        setActiveTab('dashboard');
        navigate(`/students/${id}#dashboard`);
    }, [studentId, navigate]);

    const handleDelete = async () => {
        if (!student || !isAdmin) return;
        const name = `${student.first_name} ${student.last_name}`;
        if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
        try {
            await axios.delete(`${API}/students/${student.id}`);
            toast.success(`${name} deleted`);
            const newRoster = roster.filter((s) => s.id !== student.id);
            setRoster(newRoster);
            if (newRoster.length > 0) {
                setActiveTab('dashboard');
                navigate(`/students/${newRoster[0].id}#dashboard`);
            } else {
                navigate('/students/manage');
            }
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to delete student');
        }
    };

    const handleAlerts = () => onTabChange('alerts');
    const handleReports = () => navigate('/reports');
    const handleEmailInstructors = () => {
        // Best-effort: open mailto with the homeroom teacher's email if class is mapped
        const cls = student ? classMap.get(student.class_id) : null;
        if (cls?.teacher_email) {
            window.location.href = `mailto:${cls.teacher_email}?subject=Re: ${student.first_name} ${student.last_name}`;
        } else {
            toast.info('No instructor email on file for this class.');
        }
    };

    const fullName = student
        ? `${student.first_name || ''} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name || ''}`.trim()
        : '';

    const renderActiveTab = () => {
        if (!student) return null;
        const props = { student, classMap, onReload: () => loadStudent(student.id) };
        switch (activeTab) {
            case 'dashboard':  return <DashboardTab {...props} />;
            case 'academics':  return <AcademicsTab {...props} />;
            case 'attendance': return <AttendanceTab {...props} />;
            case 'family':     return <FamilyTab {...props} />;
            case 'behavior':   return <BehaviorTab {...props} />;
            case 'medical':    return <MedicalTab {...props} />;
            case 'alerts':     return <EmptyTab tabLabel="Alerts" comingSoon />;
            case 'interests':  return <EmptyTab tabLabel="Interests" comingSoon />;
            case 'login':      return <EmptyTab tabLabel="Login Management" comingSoon />;
            case 'schedule':   return <EmptyTab tabLabel="Schedule" comingSoon />;
            case 'school':     return <EmptyTab tabLabel="School" comingSoon />;
            default:           return <DashboardTab {...props} />;
        }
    };

    return (
        <div className="lumina-profile-page" data-testid="lumina-student-profile">

            {/* ===== TOP ACTION BAR ===== */}
            <div className="lumina-profile-topbar" data-testid="profile-actionbar">
                <span className="topbar-name" data-testid="profile-actionbar-name">
                    {fullName || (studentLoading ? 'Loading…' : 'No student selected')}
                </span>
                <div className="topbar-actions">
                    {isAdmin && (
                        <TopBarAction
                            icon={Trash2}
                            label="Delete"
                            onClick={handleDelete}
                            disabled={!student}
                            danger
                            testid="profile-delete-btn"
                        />
                    )}
                    <TopBarAction
                        icon={Bell}
                        label="Alerts"
                        onClick={handleAlerts}
                        disabled={!student}
                        testid="profile-alerts-btn"
                    />
                    <TopBarAction
                        icon={Mail}
                        label="Email Instructors"
                        onClick={handleEmailInstructors}
                        disabled={!student}
                        testid="profile-email-btn"
                    />
                    <TopBarAction
                        icon={BarChart3}
                        label="Reports"
                        onClick={handleReports}
                        disabled={!student}
                        testid="profile-reports-btn"
                    />
                </div>
            </div>

            {/* ===== 3-PANEL BODY ===== */}
            <div className="lumina-profile-body">

                {/* LEFT: ROSTER */}
                <aside className="lumina-profile-left" data-testid="roster-panel">
                    <div className="roster-filters">
                        <div className="lp-field">
                            <label className="lp-field__label">Type</label>
                            <select className="lp-select" value={typeFilter} disabled data-testid="filter-type">
                                <option>Student</option>
                                <option>Staff</option>
                            </select>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Status</label>
                            <select
                                className="lp-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                data-testid="filter-status"
                            >
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Substatus</label>
                            <select
                                className="lp-select"
                                value={substatusFilter}
                                onChange={(e) => setSubstatusFilter(e.target.value)}
                                data-testid="filter-grade"
                            >
                                {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Sort by</label>
                            <select
                                className="lp-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                data-testid="filter-sort"
                            >
                                {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="roster-nextyear">
                            <input
                                type="checkbox"
                                id="ny-filter"
                                checked={nextYearFilter}
                                onChange={(e) => setNextYearFilter(e.target.checked)}
                                data-testid="filter-nextyear"
                            />
                            <label htmlFor="ny-filter">Next year filter</label>
                            <a href="#adv" onClick={(e) => { e.preventDefault(); toast.info('Advanced filters coming soon.'); }}>
                                Adv. Filter
                            </a>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Search</label>
                            <div className="lp-search">
                                <input
                                    className="lp-input"
                                    placeholder="Search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    data-testid="filter-search"
                                    style={{ paddingRight: 34 }}
                                />
                                <button type="button" className="lp-search__icon" aria-label="Search">
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="roster-list" data-testid="roster-list">
                        {rosterLoading ? (
                            <div className="lp-roster__empty">
                                <Loader2 className="animate-spin inline-block mr-2" size={14} />
                                Loading…
                            </div>
                        ) : filteredRoster.length === 0 ? (
                            <div className="lp-roster__empty">No students match the current filters.</div>
                        ) : (
                            filteredRoster.map((s) => {
                                let display;
                                if (sortBy === 'first') {
                                    display = `${s.first_name || ''}${s.middle_name ? ' ' + s.middle_name : ''} ${s.last_name || ''}`.trim();
                                } else if (sortBy === 'id') {
                                    const idStr = s.student_id || '—';
                                    display = `${idStr} · ${s.last_name || ''}, ${s.first_name || ''}`;
                                } else {
                                    display = `${s.last_name || ''}, ${s.first_name || ''}${s.middle_name ? ' ' + s.middle_name : ''}`;
                                }
                                const isActive = s.id === studentId;
                                return (
                                    <div
                                        key={s.id}
                                        className={`lp-roster__row ${isActive ? 'lp-roster__row--active' : ''}`}
                                        onClick={() => selectStudent(s.id)}
                                        data-testid={`roster-row-${s.id}`}
                                    >
                                        {display}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="roster-footer">
                        <span data-testid="roster-count">Count: {filteredRoster.length}</span>
                        <Link to="/students/manage" className="lp-link" data-testid="roster-add-link">
                            Add
                        </Link>
                    </div>
                </aside>

                {/* CENTER: PROFILE CONTENT */}
                <main className="lumina-profile-center" data-testid="profile-center">
                    {studentLoading ? (
                        <div className="lp-empty">
                            <Loader2 className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }} />
                            Loading profile…
                        </div>
                    ) : !student ? (
                        <div className="lp-empty">
                            <h4>Select a student from the list</h4>
                        </div>
                    ) : (
                        <>
                            <h1 className="lp-center__title" data-testid="profile-student-name">{fullName}</h1>
                            {renderActiveTab()}
                        </>
                    )}
                </main>

                {/* RIGHT: SECTION NAV TABS */}
                <nav className="lumina-profile-right" data-testid="profile-tabs">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className={`rnav-tab ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => onTabChange(t.key)}
                            data-testid={`profile-tab-${t.key}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>

            </div>
        </div>
    );
}
