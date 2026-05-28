import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AcademicsTab({ student, classMap }) {
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API}/gradebook?student_id=${student.id}`);
                if (!cancelled) setGrades(res.data || []);
            } catch { /* silent */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [student.id]);

    // flatten subjects across the most recent gradebook per (class, term, year)
    const latestSubjects = (() => {
        if (grades.length === 0) return [];
        const sorted = [...grades].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        const head = sorted[0];
        const cls = classMap.get(head.class_id);
        return (head.subjects || []).map((s) => ({
            ...s,
            class_name: cls?.name || head.class_id,
            term: head.term,
            year: head.academic_year,
        }));
    })();

    return (
        <>
            <div className="lp-card">
                <div className="lp-card__header">
                    <h3 className="lp-card__title"><BookOpen />Academics — Current Term Grades</h3>
                    <span style={{ fontSize: 11.5, color: '#9E9E9E' }}>
                        {latestSubjects[0] ? `${latestSubjects[0].term} · ${latestSubjects[0].year}` : ''}
                    </span>
                </div>
                {loading ? (
                    <div className="lp-empty" style={{ padding: 24 }}>Loading…</div>
                ) : latestSubjects.length === 0 ? (
                    <div className="lp-empty" style={{ padding: 24 }}>
                        <h4>No grades recorded</h4>
                        <p>Once teachers post grades, they will appear here.</p>
                    </div>
                ) : (
                    <table className="lp-table" data-testid="academics-grades-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Class</th>
                                <th>Score</th>
                                <th>Grade</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {latestSubjects.map((s, i) => (
                                <tr key={`${s.subject}-${i}`} data-testid={`academics-row-${i}`}>
                                    <td><b>{s.subject}</b></td>
                                    <td>{s.class_name}</td>
                                    <td>{s.score !== null && s.score !== undefined ? `${s.score}%` : '—'}</td>
                                    <td><span className="lp-badge lp-badge--info">{s.grade || '—'}</span></td>
                                    <td style={{ color: '#616161' }}>{s.comment || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {grades.length > 1 && (
                <div className="lp-card" style={{ marginTop: 12 }}>
                    <div className="lp-card__header">
                        <h3 className="lp-card__title">Term History</h3>
                    </div>
                    <table className="lp-table">
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Term</th>
                                <th>Class</th>
                                <th>Overall</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grades.map((g) => (
                                <tr key={g.id}>
                                    <td>{g.academic_year}</td>
                                    <td>{g.term}</td>
                                    <td>{classMap.get(g.class_id)?.name || '—'}</td>
                                    <td>{g.overall_score?.toFixed?.(1) ?? g.overall_score}</td>
                                    <td><span className="lp-badge lp-badge--info">{g.overall_grade}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
