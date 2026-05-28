import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
    Search,
    Trash2,
    ExternalLink,
    Home,
    Phone,
    Smartphone,
    Mail,
    GraduationCap,
    School,
    Users,
    Plus,
    Loader2,
    User,
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

// Tabs in spec order. data-backed phase-1 tabs use real components.
const TABS = [
    { key: 'dashboard', label: 'Dashboard', component: DashboardTab },
    { key: 'academics', label: 'Academics', component: AcademicsTab },
    { key: 'alerts', label: 'Alerts', component: EmptyTab, comingSoon: true },
    { key: 'attendance', label: 'Attendance', component: AttendanceTab },
    { key: 'behavior', label: 'Behavior', component: BehaviorTab },
    { key: 'family', label: 'Family', component: FamilyTab },
    { key: 'interests', label: 'Interests', component: EmptyTab, comingSoon: true },
    { key: 'login', label: 'Login Management', component: EmptyTab, comingSoon: true },
    { key: 'medical', label: 'Medical', component: MedicalTab },
    { key: 'schedule', label: 'Schedule', component: EmptyTab, comingSoon: true },
    { key: 'school', label: 'School', component: EmptyTab, comingSoon: true },
    { key: 'transcript', label: 'Transcript', component: EmptyTab, comingSoon: true },
    { key: 'user-defined', label: 'User Defined', component: EmptyTab, comingSoon: true },
];

const matchesGradeFilter = (student, classMap, grade) => {
    if (!grade || grade === 'All Grades') return true;
    const cls = classMap.get(student.class_id);
    const gl = (cls?.grade_level || '').toLowerCase();
    const sel = grade.toLowerCase();
    if (sel === 'pre-k') return gl.includes('pre') && gl.includes('k');
    if (sel === 'kindergarten') return gl.startsWith('k') || gl.includes('kinder');
    // sel is like "grade: 01" → extract number, compare to grade_level number
    const num = (sel.match(/\d+/) || [null])[0];
    if (!num) return true;
    const glNum = (gl.match(/\d+/) || [null])[0];
    return glNum === num || glNum === String(parseInt(num, 10));
};

export default function StudentProfilePage() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // roster state
    const [roster, setRoster] = useState([]);
    const [rosterLoading, setRosterLoading] = useState(true);
    const [classMap, setClassMap] = useState(new Map());
    const [status, setStatus] = useState('Enrolled');
    const [grade, setGrade] = useState('All Grades');
    const [search, setSearch] = useState('');

    // active profile
    const [student, setStudent] = useState(null);
    const [studentLoading, setStudentLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return TABS.find((t) => t.key === hash) ? hash : 'dashboard';
    });

    // ---- Initial load: roster + classes ----
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

    // ---- Load active student detail ----
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

    // ---- Auto-select first student if none in URL ----
    useEffect(() => {
        if (!studentId && roster.length > 0 && !rosterLoading) {
            navigate(`/students/${roster[0].id}${window.location.hash || '#dashboard'}`, { replace: true });
        }
    }, [studentId, roster, rosterLoading, navigate]);

    // ---- Filter roster ----
    const filteredRoster = useMemo(() => {
        const term = search.trim().toLowerCase();
        return roster.filter((s) => {
            // status filter
            const st = (s.enrollment_status || 'enrolled').toLowerCase();
            if (st !== status.toLowerCase()) return false;
            // grade filter via class
            if (!matchesGradeFilter(s, classMap, grade)) return false;
            // search
            if (term) {
                const blob = `${s.last_name || ''} ${s.first_name || ''} ${s.middle_name || ''} ${s.student_id || ''}`.toLowerCase();
                if (!blob.includes(term)) return false;
            }
            return true;
        });
    }, [roster, status, grade, search, classMap]);

    // Switch tab updates URL hash
    const onTabChange = useCallback((key) => {
        setActiveTab(key);
        const newUrl = `${window.location.pathname}#${key}`;
        window.history.replaceState(null, '', newUrl);
    }, []);

    const selectStudent = useCallback((id) => {
        if (id === studentId) return;
        navigate(`/students/${id}#${activeTab}`);
    }, [studentId, navigate, activeTab]);

    const handleDelete = async () => {
        if (!student || !isAdmin) return;
        const name = `${student.first_name} ${student.last_name}`;
        if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
        try {
            await axios.delete(`${API}/students/${student.id}`);
            toast.success(`${name} deleted`);
            // refetch roster, jump to first remaining
            const newRoster = roster.filter((s) => s.id !== student.id);
            setRoster(newRoster);
            if (newRoster.length > 0) navigate(`/students/${newRoster[0].id}#${activeTab}`);
            else navigate('/students');
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to delete student');
        }
    };

    const fullName = student
        ? `${student.first_name || ''} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name || ''}`.trim()
        : '';

    const activeTabConfig = TABS.find((t) => t.key === activeTab) || TABS[0];
    const TabComponent = activeTabConfig.component;

    return (
        <div className="lumina-profile" data-testid="lumina-student-profile">
            <div className="lp-shell">
                {/* ===== LEFT PANEL — Roster ===== */}
                <aside className="lp-left" data-testid="roster-panel">
                    <div className="lp-left__filters">
                        <div className="lp-field">
                            <label className="lp-field__label">Type</label>
                            <select className="lp-select" value="Student" disabled data-testid="filter-type">
                                <option>Student</option>
                                <option>Staff</option>
                            </select>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Status</label>
                            <select
                                className="lp-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                data-testid="filter-status"
                            >
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="lp-field">
                            <label className="lp-field__label">Substatus</label>
                            <select
                                className="lp-select"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                data-testid="filter-grade"
                            >
                                {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
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
                                    data-testid="filter-search"
                                    style={{ paddingRight: 34 }}
                                />
                                <button type="button" className="lp-search__icon" aria-label="Search">
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lp-roster" data-testid="roster-list">
                        {rosterLoading ? (
                            <div className="lp-roster__empty">
                                <Loader2 className="animate-spin inline-block mr-2" size={14} />
                                Loading…
                            </div>
                        ) : filteredRoster.length === 0 ? (
                            <div className="lp-roster__empty">No students match the current filters.</div>
                        ) : (
                            filteredRoster.map((s) => {
                                const display = `${s.last_name || ''}, ${s.first_name || ''}${s.middle_name ? ' ' + s.middle_name : ''}`;
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

                    <div className="lp-left__footer">
                        <span className="lp-left__count" data-testid="roster-count">
                            Count: {filteredRoster.length}
                        </span>
                        <Link to="/students" className="lp-link" data-testid="roster-add-link">
                            Add
                        </Link>
                    </div>
                </aside>

                {/* ===== ACTION BAR ===== */}
                <header className="lp-actionbar" data-testid="profile-actionbar">
                    <div className="lp-actionbar__name" data-testid="profile-actionbar-name">
                        {fullName || (studentLoading ? 'Loading…' : 'No student selected')}
                    </div>
                    <div className="lp-actionbar__actions">
                        {isAdmin && student && (
                            <button
                                type="button"
                                className="lp-iconbtn lp-iconbtn--danger"
                                onClick={handleDelete}
                                data-testid="profile-delete-btn"
                            >
                                <Trash2 size={16} />
                                <span>Delete</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* ===== CENTER PANEL ===== */}
                <main className="lp-center" data-testid="profile-center">
                    {studentLoading ? (
                        <div className="lp-empty">
                            <Loader2 className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }} />
                            Loading profile…
                        </div>
                    ) : !student ? (
                        <div className="lp-empty">
                            <h4>No student selected</h4>
                            <p>Pick a student from the left to view their profile.</p>
                        </div>
                    ) : (
                        <TabComponent
                            student={student}
                            classMap={classMap}
                            onReload={() => loadStudent(student.id)}
                            comingSoon={activeTabConfig.comingSoon}
                            tabLabel={activeTabConfig.label}
                        />
                    )}
                </main>

                {/* ===== RIGHT PANEL — Tabs ===== */}
                <nav className="lp-right" data-testid="profile-tabs">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className={`lp-right__tab ${activeTab === t.key ? 'lp-right__tab--active' : ''}`}
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

// Re-export small helpers for tab components
export { GraduationCap, School, Users, Plus, ExternalLink, Home, Phone, Smartphone, Mail, User };
