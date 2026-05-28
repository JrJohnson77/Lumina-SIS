import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
    Home, Phone, Smartphone, Mail, GraduationCap, School,
    Users, Plus, ExternalLink, User,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ageFromDob = (dob) => {
    if (!dob) return '';
    try {
        const d = new Date(dob);
        const diff = Date.now() - d.getTime();
        return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    } catch { return ''; }
};

const fmtDate = (s) => {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); }
    catch { return s; }
};

// Donut chart (pure SVG, no library)
const Donut = ({ values, size = 100, thickness = 18 }) => {
    const total = values.reduce((s, v) => s + v.value, 0);
    const radius = (size - thickness) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circ = 2 * Math.PI * radius;

    if (total === 0) {
        return (
            <svg width={size} height={size} role="img" aria-label="No attendance data">
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#ECEFF1" strokeWidth={thickness} />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="#9E9E9E">No data</text>
            </svg>
        );
    }

    let offset = 0;
    return (
        <svg width={size} height={size} role="img" aria-label="Attendance breakdown">
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#ECEFF1" strokeWidth={thickness} />
            {values.map((v) => {
                if (v.value === 0) return null;
                const seg = (v.value / total) * circ;
                const el = (
                    <circle
                        key={v.key}
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="none"
                        stroke={v.color}
                        strokeWidth={thickness}
                        strokeDasharray={`${seg} ${circ - seg}`}
                        strokeDashoffset={-offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        strokeLinecap="butt"
                    />
                );
                offset += seg;
                return el;
            })}
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="14" fontWeight="600" fill="#212121">
                {total}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#9E9E9E">
                days
            </text>
        </svg>
    );
};

export default function DashboardTab({ student, classMap }) {
    const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0, percent_present: 0 });
    const [loadingAtt, setLoadingAtt] = useState(true);
    const [homeroomTeacher, setHomeroomTeacher] = useState('');

    const currentClass = useMemo(() => classMap.get(student.class_id), [classMap, student.class_id]);

    // load attendance year-to-date (no month filter → all-time per existing endpoint)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingAtt(true);
            try {
                const res = await axios.get(`${API}/students/${student.id}/attendance/summary`);
                if (!cancelled) setAttendance(res.data);
            } catch { /* silent */ }
            finally { if (!cancelled) setLoadingAtt(false); }
        })();
        return () => { cancelled = true; };
    }, [student.id]);

    // load homeroom teacher name (best-effort)
    useEffect(() => {
        let cancelled = false;
        if (!currentClass?.teacher_id) { setHomeroomTeacher(''); return; }
        (async () => {
            try {
                const res = await axios.get(`${API}/users`);
                if (cancelled) return;
                const t = (res.data || []).find((u) => u.id === currentClass.teacher_id);
                setHomeroomTeacher(t?.name || '');
            } catch { /* admin-only endpoint; ignore for teacher role */ }
        })();
        return () => { cancelled = true; };
    }, [currentClass]);

    const fullName = `${student.first_name || ''} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name || ''}`.trim();
    const age = ageFromDob(student.date_of_birth);

    const address = [student.address_line1, student.address_line2, student.city_state, student.country]
        .filter(Boolean).join(', ') || (student.address || '—');

    const guardians = student.family_members || [];
    // pick first home + mobile phones from primary guardian if student has none
    const primary = guardians[0] || {};
    const homePhone = primary.home_phone || '';
    const mobilePhone = student.student_phone || primary.cell_phone || '';

    const donutValues = [
        { key: 'present', value: attendance.present + (attendance.excused || 0), color: '#2E7D32' },
        { key: 'late', value: attendance.late, color: '#F57C00' },
        { key: 'absent', value: attendance.absent, color: '#C62828' },
    ];

    return (
        <>
            <h1 className="lp-center__title" data-testid="dashboard-student-name">{fullName}</h1>

            <div className="lp-dashboard">
                {/* === Photo card === */}
                <div className="lp-card lp-card--photo" data-testid="card-photo">
                    {student.photo_url ? (
                        <img src={student.photo_url} alt={fullName} className="lp-photo" />
                    ) : (
                        <div className="lp-photo lp-photo--placeholder">
                            <User size={48} />
                        </div>
                    )}
                </div>

                {/* === Contact === */}
                <div className="lp-card lp-card--span2" data-testid="card-contact">
                    <div className="lp-card__header">
                        <h3 className="lp-card__title"><Home />Contact</h3>
                    </div>
                    <div className="lp-kv">
                        <span className="lp-kv__k">Address</span>
                        <span className="lp-kv__v">{address}</span>
                        <span className="lp-kv__k"><Phone size={11} style={{ display: 'inline', marginRight: 4 }} />Home</span>
                        <span className="lp-kv__v">{homePhone || '—'}</span>
                        <span className="lp-kv__k"><Smartphone size={11} style={{ display: 'inline', marginRight: 4 }} />Mobile</span>
                        <span className="lp-kv__v">{mobilePhone || '—'}</span>
                        <span className="lp-kv__k"><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />Email</span>
                        <span className="lp-kv__v">
                            {student.student_email
                                ? <a href={`mailto:${student.student_email}`}>{student.student_email}</a>
                                : <span className="lp-muted">—</span>}
                        </span>
                    </div>
                </div>

                {/* === School Information === */}
                <div className="lp-card" data-testid="card-school-info">
                    <div className="lp-card__header">
                        <h3 className="lp-card__title"><School />School Information</h3>
                    </div>
                    <div className="lp-kv">
                        <span className="lp-kv__k">Status</span>
                        <span className="lp-kv__v">
                            <span className={`lp-badge lp-badge--${(student.enrollment_status || 'enrolled').toLowerCase()}`}>
                                {student.enrollment_status || 'Enrolled'}
                            </span>
                        </span>
                        <span className="lp-kv__k">Current</span>
                        <span className="lp-kv__v">
                            {currentClass ? `${currentClass.grade_level} · ${currentClass.name}` : <span className="lp-muted">—</span>}
                        </span>
                        <span className="lp-kv__k">Year</span>
                        <span className="lp-kv__v">{currentClass?.academic_year || '—'}</span>
                        <span className="lp-kv__k">House</span>
                        <span className="lp-kv__v">{student.house || '—'}</span>
                    </div>
                </div>

                {/* === Student Information === */}
                <div className="lp-card" data-testid="card-student-info">
                    <div className="lp-card__header">
                        <h3 className="lp-card__title"><GraduationCap />Student Information</h3>
                    </div>
                    <div className="lp-kv">
                        <span className="lp-kv__k">DOB</span>
                        <span className="lp-kv__v">{fmtDate(student.date_of_birth)}{age ? ` · ${age} yrs` : ''}</span>
                        <span className="lp-kv__k">Gender</span>
                        <span className="lp-kv__v">{student.gender || '—'}</span>
                        <span className="lp-kv__k">ID</span>
                        <span className="lp-kv__v">{student.student_id || '—'}</span>
                        <span className="lp-kv__k">SRN</span>
                        <span className="lp-kv__v">{student.id?.slice(0, 8).toUpperCase()}</span>
                    </div>
                </div>

                {/* === Attendance – Year === */}
                <div className="lp-card lp-card--span3" data-testid="card-attendance-year">
                    <div className="lp-card__header">
                        <h3 className="lp-card__title">Attendance — Year</h3>
                        <Link to="/attendance" className="lp-card__link">
                            Report <ExternalLink size={12} />
                        </Link>
                    </div>
                    <div style={{ fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                        Year to Date
                    </div>
                    <div className="lp-att">
                        <ul className="lp-att__stats">
                            <li><span className="lp-dot lp-dot--green" /> Present: <b>{attendance.present || 0}</b></li>
                            <li><span className="lp-dot lp-dot--amber" /> Tardy: <b>{attendance.late || 0}</b></li>
                            <li><span className="lp-dot lp-dot--red" /> Absent: <b>{attendance.absent || 0}</b></li>
                            {attendance.total > 0 && (
                                <li style={{ marginTop: 4, fontSize: 11.5, color: '#616161' }}>
                                    {attendance.percent_present}% attendance
                                </li>
                            )}
                        </ul>
                        <div className="lp-att__chart">
                            {loadingAtt ? (
                                <div style={{ fontSize: 11, color: '#9E9E9E' }}>Loading…</div>
                            ) : (
                                <Donut values={donutValues} />
                            )}
                        </div>
                    </div>
                    <div className="lp-att__footer">
                        <div>Homeroom: <b>{currentClass?.name || '—'}</b></div>
                        <div>Instructor: <b>{homeroomTeacher || '—'}</b></div>
                    </div>
                </div>

                {/* === Family === */}
                <div className="lp-card lp-card--span4" data-testid="card-family">
                    <div className="lp-card__header">
                        <h3 className="lp-card__title"><Users />Family</h3>
                        <Link to="/students" className="lp-btn lp-btn--outline lp-btn--sm">
                            <Plus size={12} /> Add Family
                        </Link>
                    </div>
                    {guardians.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#9E9E9E', padding: '6px 0' }}>No family members on file.</div>
                    ) : (
                        <div className="lp-family">
                            {guardians.map((g, idx) => (
                                <div key={g.id || idx} className="lp-family__row" data-testid={`family-row-${idx}`}>
                                    <span className="lp-family__name">
                                        {[g.salutation, g.first_name, g.middle_name, g.last_name].filter(Boolean).join(' ')}
                                    </span>
                                    <span className="lp-family__rel">{g.relationship || '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
