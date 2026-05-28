import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Heart } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Section = ({ title, items, renderItem, testid }) => (
    <div className="lp-card" style={{ marginBottom: 12 }} data-testid={testid}>
        <div className="lp-card__header">
            <h3 className="lp-card__title">{title}</h3>
            <span style={{ fontSize: 11.5, color: '#9E9E9E' }}>{items?.length || 0} on file</span>
        </div>
        {!items || items.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#9E9E9E', padding: '8px 0' }}>None recorded.</div>
        ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((it, i) => (
                    <li key={it.id || i} style={{ fontSize: 13, padding: '6px 8px', background: '#FAFAFA', borderRadius: 3 }}>
                        {renderItem(it)}
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export default function MedicalTab({ student }) {
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API}/health/${student.id}`);
                if (!cancelled) setRecord(res.data);
            } catch { /* 404 → no record yet */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [student.id]);

    return (
        <>
            {loading ? (
                <div className="lp-empty" style={{ padding: 24 }}>Loading medical record…</div>
            ) : !record ? (
                <div className="lp-empty">
                    <h4>No medical record</h4>
                    <p>This student does not have a medical record on file yet.</p>
                </div>
            ) : (
                <>
                    <Section
                        title="Vaccinations"
                        items={record.vaccinations}
                        testid="med-vaccinations"
                        renderItem={(v) => (
                            <span>
                                <b>{v.name}</b>
                                {v.date && <span style={{ color: '#9E9E9E' }}> · {v.date}</span>}
                                {v.next_due && <span style={{ color: '#F57C00' }}> · Next: {v.next_due}</span>}
                                {v.verified && <span className="lp-badge lp-badge--success" style={{ marginLeft: 8 }}>Verified</span>}
                            </span>
                        )}
                    />
                    <Section
                        title="Allergies"
                        items={record.allergies}
                        testid="med-allergies"
                        renderItem={(a) => (
                            <span>
                                <b>{a.allergen}</b>
                                <span className={`lp-badge ${a.severity === 'Severe' ? 'lp-badge--danger' : 'lp-badge--warn'}`} style={{ marginLeft: 8 }}>
                                    {a.severity || 'Mild'}
                                </span>
                                <div style={{ fontSize: 12, color: '#616161', marginTop: 2 }}>{a.reaction || ''}</div>
                            </span>
                        )}
                    />
                    <Section
                        title="Medical Conditions"
                        items={record.conditions}
                        testid="med-conditions"
                        renderItem={(c) => (
                            <span>
                                <b>{c.name}</b>
                                {c.diagnosis_date && <span style={{ color: '#9E9E9E' }}> · Diagnosed {c.diagnosis_date}</span>}
                                {c.notes && <div style={{ fontSize: 12, color: '#616161', marginTop: 2 }}>{c.notes}</div>}
                            </span>
                        )}
                    />
                    <Section
                        title="Medications"
                        items={record.medications}
                        testid="med-medications"
                        renderItem={(m) => (
                            <span>
                                <b>{m.name}</b>
                                {m.dosage && <span> · {m.dosage}</span>}
                                {m.frequency && <span style={{ color: '#9E9E9E' }}> · {m.frequency}</span>}
                            </span>
                        )}
                    />
                    <Section
                        title="Nurse Visits"
                        items={record.visits}
                        testid="med-visits"
                        renderItem={(v) => (
                            <span>
                                <b>{v.date}</b>: {v.reason}
                                {v.action && <div style={{ fontSize: 12, color: '#616161', marginTop: 2 }}>Action: {v.action}</div>}
                            </span>
                        )}
                    />
                </>
            )}
        </>
    );
}
