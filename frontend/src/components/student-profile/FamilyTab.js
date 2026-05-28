import React from 'react';
import { Users, Plus, Mail, Phone, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FamilyTab({ student }) {
    const guardians = student.family_members || [];

    return (
        <>
            <h1 className="lp-center__title">
                <Users size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: '#1565C0' }} />
                Family
            </h1>

            <div className="lp-card">
                <div className="lp-card__header">
                    <h3 className="lp-card__title">Family Members</h3>
                    <Link to="/students" className="lp-btn lp-btn--outline lp-btn--sm">
                        <Plus size={12} /> Add Family
                    </Link>
                </div>
                {guardians.length === 0 ? (
                    <div className="lp-empty" style={{ padding: 24 }}>
                        <h4>No family on file</h4>
                        <p>Add parents, guardians, or emergency contacts from the student edit page.</p>
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
        </>
    );
}
