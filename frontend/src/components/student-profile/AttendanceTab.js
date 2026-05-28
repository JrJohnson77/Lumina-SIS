import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarCheck } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_BADGE = {
    present: 'lp-badge--success',
    absent: 'lp-badge--danger',
    late: 'lp-badge--warn',
    excused: 'lp-badge--info',
};

export default function AttendanceTab({ student }) {
    const [summary, setSummary] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [s, r] = await Promise.all([
                    axios.get(`${API}/students/${student.id}/attendance/summary`),
                    axios.get(`${API}/attendance?student_id=${student.id}`),
                ]);
                if (cancelled) return;
                setSummary(s.data);
                setRecords((r.data || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
            } catch { /* silent */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [student.id]);

    return (
        <>
            <h1 className="lp-center__title">
                <CalendarCheck size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: '#1565C0' }} />
                Attendance
            </h1>

            {/* Summary tiles */}
            <div className="lp-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div className="lp-card" data-testid="att-present">
                    <div className="lp-card__title" style={{ fontSize: 11, color: '#9E9E9E' }}>Present</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#2E7D32' }}>{summary?.present ?? 0}</div>
                </div>
                <div className="lp-card" data-testid="att-absent">
                    <div className="lp-card__title" style={{ fontSize: 11, color: '#9E9E9E' }}>Absent</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#C62828' }}>{summary?.absent ?? 0}</div>
                </div>
                <div className="lp-card" data-testid="att-late">
                    <div className="lp-card__title" style={{ fontSize: 11, color: '#9E9E9E' }}>Tardy</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#F57C00' }}>{summary?.late ?? 0}</div>
                </div>
                <div className="lp-card" data-testid="att-excused">
                    <div className="lp-card__title" style={{ fontSize: 11, color: '#9E9E9E' }}>Excused</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#1565C0' }}>{summary?.excused ?? 0}</div>
                </div>
                <div className="lp-card" data-testid="att-percent">
                    <div className="lp-card__title" style={{ fontSize: 11, color: '#9E9E9E' }}>% Present</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: summary?.below_threshold ? '#C62828' : '#2E7D32' }}>
                        {summary?.percent_present ?? 0}%
                    </div>
                </div>
            </div>

            <div className="lp-card">
                <div className="lp-card__header">
                    <h3 className="lp-card__title">Attendance History</h3>
                    <span style={{ fontSize: 11.5, color: '#9E9E9E' }}>{records.length} records</span>
                </div>
                {loading ? (
                    <div className="lp-empty" style={{ padding: 24 }}>Loading…</div>
                ) : records.length === 0 ? (
                    <div className="lp-empty" style={{ padding: 24 }}>No attendance recorded.</div>
                ) : (
                    <table className="lp-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.slice(0, 100).map((r) => (
                                <tr key={r.id}>
                                    <td>{r.date}</td>
                                    <td>
                                        <span className={`lp-badge ${STATUS_BADGE[r.status] || 'lp-badge--info'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
