import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_BADGE = {
    Major: 'lp-badge--danger',
    Moderate: 'lp-badge--warn',
    Minor: 'lp-badge--info',
};

export default function BehaviorTab({ student }) {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API}/discipline`);
                if (cancelled) return;
                const mine = (res.data || []).filter((d) => d.student_id === student.id);
                mine.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                setIncidents(mine);
            } catch { /* silent */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [student.id]);

    const counts = incidents.reduce(
        (acc, d) => {
            const t = (d.type || '').toLowerCase();
            if (t.includes('major')) acc.major++;
            else if (t.includes('moderate')) acc.moderate++;
            else acc.minor++;
            return acc;
        },
        { major: 0, moderate: 0, minor: 0 }
    );

    return (
        <>
            <div className="lp-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="lp-card" data-testid="beh-major">
                    <div className="lp-card__title" style={{ fontSize: 11, color: '#9E9E9E' }}>Major</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#C62828' }}>{counts.major}</div>
                </div>
                <div className="lp-card" data-testid="beh-moderate">
                    <div className="lp-card__title" style={{ fontSize: 11, color: '#9E9E9E' }}>Moderate</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#F57C00' }}>{counts.moderate}</div>
                </div>
                <div className="lp-card" data-testid="beh-minor">
                    <div className="lp-card__title" style={{ fontSize: 11, color: '#9E9E9E' }}>Minor</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#1565C0' }}>{counts.minor}</div>
                </div>
            </div>

            <div className="lp-card">
                <div className="lp-card__header">
                    <h3 className="lp-card__title">Incident Log</h3>
                    <span style={{ fontSize: 11.5, color: '#9E9E9E' }}>{incidents.length} incidents</span>
                </div>
                {loading ? (
                    <div className="lp-empty" style={{ padding: 24 }}>Loading…</div>
                ) : incidents.length === 0 ? (
                    <div className="lp-empty" style={{ padding: 24 }}>
                        <h4>No incidents</h4>
                        <p>This student has a clean behavior record.</p>
                    </div>
                ) : (
                    <table className="lp-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Action</th>
                                <th>Staff</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incidents.map((d) => (
                                <tr key={d.id} data-testid={`incident-${d.id}`}>
                                    <td>{d.date ? new Date(d.date).toLocaleDateString() : '—'}</td>
                                    <td>
                                        <span className={`lp-badge ${TYPE_BADGE[d.type] || 'lp-badge--info'}`}>
                                            {d.type || '—'}
                                        </span>
                                    </td>
                                    <td>{d.category || '—'}</td>
                                    <td style={{ color: '#212121' }}>{d.description || '—'}</td>
                                    <td style={{ color: '#616161' }}>{d.action_taken || '—'}</td>
                                    <td style={{ color: '#616161' }}>{d.reported_by || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
