import React from 'react';

/**
 * Lumina-SIS — Default Report Card Template (v2)
 *
 * Letter page (8.5" × 11" = 816px × 1056px @ 96dpi). Eight zones with explicit
 * proportions that together fill the entire page — no dead space.
 *
 * Zones: Header 10% / Title 5% / Identity 12% / Academics 30% /
 *        Attendance+Conduct 10% / Comments 13% / Signatures 7% / Footer 3%
 *        (+ 10% absorbed by internal gaps and table flex)
 */

const PRIMARY = '#4F46E5'; // indigo-600
const PRIMARY_LIGHT = '#EEF2FF';
const STAR_EMPTY = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#6B7280';

const PAGE_W = 816;
const PAGE_H = 1056;

const LETTER_COLORS = {
    A: { bg: '#D1FAE5', text: '#065F46' }, // green
    B: { bg: '#DBEAFE', text: '#1E40AF' }, // blue
    C: { bg: '#FEF3C7', text: '#92400E' }, // amber
    D: { bg: '#FFEDD5', text: '#9A3412' }, // orange
    E: { bg: '#FEE2E2', text: '#991B1B' }, // red (legacy)
    F: { bg: '#FEE2E2', text: '#991B1B' },
    U: { bg: '#E5E7EB', text: '#374151' },
};

const getLetterStyle = (grade) => {
    const letter = (grade || 'U').toString().trim().toUpperCase().charAt(0);
    return LETTER_COLORS[letter] || LETTER_COLORS.U;
};

const fmtDate = (d) => new Date(d || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
});

const normalizeUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return `${process.env.REACT_APP_BACKEND_URL || ''}${url}`;
};

// Inline star SVG. Filled = indigo fill, empty = light gray fill (no border).
const Star = ({ filled }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
        <path
            d="M12 2.5l2.84 6.42 6.99.6-5.3 4.66 1.59 6.84L12 17.4l-6.12 3.62 1.59-6.84L2.17 9.52l6.99-.6z"
            fill={filled ? PRIMARY : STAR_EMPTY}
        />
    </svg>
);

const StarScale = ({ value }) => {
    // value: 0..5 (0 means "not rated")
    const n = Math.max(0, Math.min(5, parseInt(value || 0, 10)));
    if (n === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} filled={false} />)}
                <span style={{ fontSize: 8, color: '#9CA3AF', marginLeft: 4, fontStyle: 'italic' }}>not rated</span>
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} filled={i <= n} />)}
        </div>
    );
};

const LetterBadge = ({ grade }) => {
    const style = getLetterStyle(grade);
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 30,
                padding: '3px 8px',
                borderRadius: 999,
                background: style.bg,
                color: style.text,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.5px',
            }}
        >
            {grade || '-'}
        </span>
    );
};

// Map common rating strings/numbers to 0..5. 0 = not rated.
const ratingToScore = (raw) => {
    if (raw === undefined || raw === null || raw === '') return 0;
    if (typeof raw === 'number') return Math.max(0, Math.min(5, raw));
    const s = String(raw).toLowerCase().trim();
    if (!s) return 0;
    // Numeric in string
    const num = Number(s);
    if (!Number.isNaN(num)) return Math.max(0, Math.min(5, num));
    if (s.includes('excellent') || s.includes('outstanding') || s === 'a' || s === 'a+') return 5;
    if (s.includes('very good') || s === 'a-' || s === 'b+') return 4;
    if (s.includes('good') || s === 'b') return 4;
    if (s.includes('satisfactory') || s === 'b-' || s === 'c+' || s === 'c') return 3;
    if (s.includes('fair') || s === 'c-' || s === 'd+' || s === 'd') return 2;
    if (s.includes('needs') || s.includes('poor') || s === 'd-' || s === 'f' || s === 'e') return 1;
    return 0;
};

const computeConduct = (socialSkills) => {
    const cats = ['Punctuality', 'Participation', 'Behaviour', 'Effort'];
    const out = {};
    if (!socialSkills) {
        cats.forEach((c) => { out[c] = 0; });
        return out;
    }
    // Allow either flat object {Punctuality:..} or nested {ratings:{Punctuality:..}}
    const src = socialSkills.ratings || socialSkills;
    cats.forEach((cat) => {
        // Try exact match, lower, and a few common aliases
        const v =
            src[cat] ??
            src[cat.toLowerCase()] ??
            (cat === 'Behaviour' ? (src['Behavior'] ?? src['behavior'] ?? src['Self-Control'] ?? src['self-control']) : undefined) ??
            (cat === 'Effort' ? (src['Diligence'] ?? src['diligence'] ?? src['Work Ethic']) : undefined);
        out[cat] = ratingToScore(v);
    });
    return out;
};

const computePromotion = (overallScore) => {
    const s = parseFloat(overallScore);
    if (!isFinite(s)) return { label: 'Pending', color: '#374151', bg: '#E5E7EB' };
    if (s >= 50) return { label: 'Promoted', color: '#065F46', bg: '#D1FAE5' };
    if (s >= 35) return { label: 'On Probation', color: '#92400E', bg: '#FEF3C7' };
    return { label: 'Retained', color: '#991B1B', bg: '#FEE2E2' };
};

// ----- Sub-components ----------------------------------------------------

const SectionLabel = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 3, height: 12, background: PRIMARY, borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: 9, fontWeight: 700, color: TEXT_DARK, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {children}
        </h3>
    </div>
);

const Field = ({ label, value, bold }) => (
    <div style={{ marginBottom: 2 }}>
        <div style={{ fontSize: 7, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: bold ? 12 : 11, fontWeight: bold ? 700 : 500, color: TEXT_DARK, lineHeight: 1.2 }}>{value || '—'}</div>
    </div>
);

const AttendanceBox = ({ color, label, value }) => (
    <div style={{ flex: 1, background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 6, padding: '4px 6px', textAlign: 'center', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: color || TEXT_DARK, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 7, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
    </div>
);

const PercentDial = ({ pct }) => {
    const r = 22;
    const c = 2 * Math.PI * r;
    const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
    const color = pct >= 85 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#EF4444';
    return (
        <div style={{ width: 56, height: 56, position: 'relative', flexShrink: 0 }}>
            <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={r} stroke="#F3F4F6" strokeWidth="6" fill="none" />
                <circle
                    cx="28" cy="28" r={r}
                    stroke={color} strokeWidth="6" fill="none"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    transform="rotate(-90 28 28)"
                    strokeLinecap="round"
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: TEXT_DARK }}>
                {pct}%
            </div>
        </div>
    );
};

const SignatureBlock = ({ label, printedName, imageUrl }) => (
    <div style={{ flex: 1 }}>
        <div style={{ height: 28, borderBottom: `1px solid ${TEXT_MUTED}`, position: 'relative', marginBottom: 3 }}>
            {imageUrl ? (
                <img
                    src={normalizeUrl(imageUrl)}
                    alt={label}
                    crossOrigin="anonymous"
                    style={{ position: 'absolute', bottom: 0, left: 0, maxHeight: 24, maxWidth: '100%', objectFit: 'contain' }}
                />
            ) : null}
        </div>
        <div style={{ textAlign: 'center' }}>
            {printedName ? (
                <div style={{ fontSize: 9, color: TEXT_DARK, fontWeight: 600, lineHeight: 1.2 }}>{printedName}</div>
            ) : null}
            <div style={{ fontSize: 8, color: TEXT_MUTED, marginTop: printedName ? 1 : 6 }}>{label}</div>
        </div>
    </div>
);

// ----- Main component ---------------------------------------------------

const LuminaDefaultReportCard = ({
    data,
    classInfo,
    term,
    academicYear,
    totalStudents,
    signatures,
    template,
    school,
}) => {
    if (!data || !data.student) {
        return <div style={{ color: 'red', padding: '1rem' }}>Error: Missing student data</div>;
    }

    const student = data.student;
    const subjects = (data?.grades?.subjects || []).slice(0, 10);
    const attendance = data?.attendance_summary || {};
    const socialSkills = data?.social_skills || {};
    const position = data?.position;

    const primary = school?.primary_color || template?.theme?.primary || PRIMARY;
    const primaryLight = primary === PRIMARY ? PRIMARY_LIGHT : `${primary}15`;

    const schoolName = school?.name || template?.school_name || 'School Name';
    const tagline = school?.tagline || template?.school_motto || 'Education made simple.';
    const address = school?.address || '';
    const phone = school?.phone || '';
    const schoolEmail = school?.email || '';
    const logoUrl = normalizeUrl(school?.logo_url || template?.logo_url);
    const photoUrl = normalizeUrl(student?.photo_url);

    const overallScore = data?.grades?.overall_score ?? 0;
    const overallGrade = data?.grades?.overall_grade ?? '-';
    const conduct = computeConduct(socialSkills);
    const promotion = computePromotion(overallScore);
    const issueDate = fmtDate(new Date());

    const homeroomTeacher = classInfo?.teacher_name || data?.teacher_name || '';

    const aPresent = attendance.present ?? 0;
    const aAbsent = attendance.absent ?? 0;
    const aLate = attendance.late ?? 0;
    const aExcused = attendance.excused ?? 0;
    const aTotal = attendance.total ?? attendance.total_days ?? (aPresent + aAbsent + aLate + aExcused);
    const aPct = aTotal > 0 ? Math.round(((aPresent + aExcused + 0.5 * aLate) / aTotal) * 100) : 0;

    // Always show exactly 8 rows so the table fills the academics zone
    const TABLE_ROWS = 8;
    const rows = [...subjects];
    while (rows.length < TABLE_ROWS) rows.push(null);

    return (
        <div
            className="lumina-default-report-card mhps-report-card bg-white mx-auto mb-8 print:mb-0 print:page-break-after-always"
            style={{
                width: `${PAGE_W}px`,
                height: `${PAGE_H}px`,
                background: '#ffffff',
                color: TEXT_DARK,
                fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
                fontSize: 10,
                lineHeight: 1.3,
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box',
                pageBreakAfter: 'always',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Top indigo stripe (4px) */}
            <div style={{ height: 4, background: primary, flexShrink: 0 }} />

            {/* Padded interior */}
            <div style={{ flex: 1, padding: '14px 28px 6px 28px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

                {/* ZONE 1 — HEADER (~10%) */}
                <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {logoUrl ? (
                            <img src={logoUrl} alt="logo" crossOrigin="anonymous" style={{ width: 52, height: 52, objectFit: 'contain' }} />
                        ) : (
                            <div style={{ width: 52, height: 52, borderRadius: 10, background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>
                                {(schoolName?.[0] || 'S').toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', color: TEXT_DARK }}>{schoolName}</h1>
                            <p style={{ margin: 0, fontSize: 9, color: TEXT_MUTED, fontStyle: 'italic' }}>{tagline}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-block', background: primaryLight, color: primary, padding: '5px 11px', borderRadius: 7, fontWeight: 700, fontSize: 10, letterSpacing: '0.04em' }}>
                            {String(term || '').toUpperCase()} · {academicYear || ''}
                        </div>
                        <p style={{ margin: '5px 0 0', fontSize: 8.5, color: TEXT_MUTED }}>Issued: {issueDate}</p>
                    </div>
                </div>

                {/* ZONE 2 — TITLE BAR (~5%) */}
                <div
                    style={{
                        height: 50,
                        marginTop: 4,
                        background: primaryLight,
                        borderLeft: `4px solid ${primary}`,
                        borderRadius: 6,
                        padding: '6px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: TEXT_DARK, letterSpacing: '0.01em' }}>Student Report Card</h2>
                    <p style={{ margin: 0, fontSize: 9, color: TEXT_MUTED }}>An overview of academic progress and conduct for the term.</p>
                </div>

                {/* ZONE 3 — STUDENT IDENTITY (~12%) */}
                <div
                    style={{
                        height: 120,
                        marginTop: 8,
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        padding: 10,
                        display: 'flex',
                        gap: 14,
                        flexShrink: 0,
                    }}
                >
                    {/* Photo */}
                    <div style={{ width: 78, height: 96, borderRadius: 8, overflow: 'hidden', border: `2px solid ${primary}30`, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {photoUrl ? (
                            <img src={photoUrl} alt={student.first_name} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: 24, fontWeight: 700, color: primary }}>
                                {(student.first_name?.[0] || '?') + (student.last_name?.[0] || '')}
                            </span>
                        )}
                    </div>
                    {/* Two-column field grid */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 14, alignContent: 'center' }}>
                        <Field label="Student name" value={`${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.replace(/\s+/g, ' ').trim()} bold />
                        <Field label="Student ID" value={student.student_id || student.id?.slice(0, 8) || '—'} />
                        <Field label="Class" value={classInfo?.name || '—'} />
                        <Field label="Grade level" value={classInfo?.grade_level || student.grade_level || '—'} />
                        <Field label="Homeroom teacher" value={homeroomTeacher || '—'} />
                        <Field label="Position in class" value={position && totalStudents ? `${position} of ${totalStudents}` : '—'} />
                    </div>
                </div>

                {/* ZONE 4 — ACADEMIC PERFORMANCE TABLE (~30%) */}
                <div style={{ marginTop: 10, flexShrink: 0 }}>
                    <SectionLabel>Academic performance</SectionLabel>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 10, tableLayout: 'fixed', flexShrink: 0 }}>
                    <colgroup>
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '39%' }} />
                    </colgroup>
                    <thead>
                        <tr style={{ background: primary, color: '#FFFFFF' }}>
                            <th style={thHead}>Subject</th>
                            <th style={{ ...thHead, textAlign: 'right' }}>Score</th>
                            <th style={{ ...thHead, textAlign: 'right' }}>%</th>
                            <th style={{ ...thHead, textAlign: 'center' }}>Grade</th>
                            <th style={thHead}>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', height: 24 }}>
                                <td style={{ ...tdCell, fontWeight: 600 }}>{row?.subject || ''}</td>
                                <td style={{ ...tdCell, textAlign: 'right' }}>{row?.score != null ? row.score : ''}</td>
                                <td style={{ ...tdCell, textAlign: 'right' }}>{row?.score != null ? `${Math.round(row.score)}%` : ''}</td>
                                <td style={{ ...tdCell, textAlign: 'center' }}>{row ? <LetterBadge grade={row.grade} /> : null}</td>
                                <td style={{ ...tdCell, color: '#4B5563', fontStyle: row?.comment ? 'normal' : 'italic' }}>{row?.comment || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: primaryLight, height: 28 }}>
                            <td style={{ ...tdCell, fontWeight: 800, color: primary }}>Overall</td>
                            <td style={{ ...tdCell, textAlign: 'right', fontWeight: 800 }}>{Number(overallScore).toFixed(1)}</td>
                            <td style={{ ...tdCell, textAlign: 'right', fontWeight: 800 }}>{Math.round(overallScore)}%</td>
                            <td style={{ ...tdCell, textAlign: 'center' }}><LetterBadge grade={overallGrade} /></td>
                            <td style={{ ...tdCell }}>
                                <span
                                    style={{
                                        display: 'inline-block',
                                        padding: '3px 10px',
                                        background: promotion.bg,
                                        color: promotion.color,
                                        borderRadius: 999,
                                        fontSize: 9,
                                        fontWeight: 700,
                                    }}
                                >
                                    {promotion.label}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* ZONE 5 — ATTENDANCE + CONDUCT (~10%) */}
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, flexShrink: 0 }}>
                    <div>
                        <SectionLabel>Attendance summary</SectionLabel>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                                <AttendanceBox color="#10B981" label="Present" value={aPresent} />
                                <AttendanceBox color="#EF4444" label="Absent" value={aAbsent} />
                                <AttendanceBox color="#F59E0B" label="Late" value={aLate} />
                                <AttendanceBox color="#3B82F6" label="Excused" value={aExcused} />
                            </div>
                            <PercentDial pct={aPct} />
                        </div>
                    </div>
                    <div>
                        <SectionLabel>Conduct &amp; effort</SectionLabel>
                        <div style={{ marginTop: 4, border: '1px solid #F3F4F6', borderRadius: 6, padding: '6px 10px' }}>
                            {['Punctuality', 'Participation', 'Behaviour', 'Effort'].map((cat, i) => (
                                <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: i < 3 ? '1px solid #F9FAFB' : 'none', fontSize: 9 }}>
                                    <span style={{ color: '#374151', fontWeight: 500 }}>{cat}</span>
                                    <StarScale value={conduct[cat]} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ZONE 6 — COMMENTS (~13%) */}
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
                    <div>
                        <SectionLabel>Homeroom teacher's comment</SectionLabel>
                        <div style={commentBox(primary)}>
                            {data?.teacher_comment || student?.teacher_comment ||
                                'A solid term. Keep building on your strengths and continue working diligently in every subject.'}
                        </div>
                    </div>
                    <div>
                        <SectionLabel>Principal's comment</SectionLabel>
                        <div style={commentBox(primary)}>
                            {data?.principal_comment ||
                                'We are proud of your progress this term. Continue to embrace learning with curiosity and discipline.'}
                        </div>
                    </div>
                </div>

                {/* SPACER — pushes signatures down so the page is filled */}
                <div style={{ flex: 1, minHeight: 6 }} />

                {/* ZONE 7 — SIGNATURES (~7%) */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexShrink: 0 }}>
                    <SignatureBlock label="Homeroom teacher" printedName={homeroomTeacher} imageUrl={signatures?.teacher_signature || signatures?.teacher} />
                    <SignatureBlock label="Principal" printedName={signatures?.principal_name} imageUrl={signatures?.principal_signature || signatures?.principal} />
                    <SignatureBlock label="Parent / Guardian" printedName="" imageUrl={null} />
                    <div style={{ width: 110, flexShrink: 0 }}>
                        <div style={{ height: 28, borderBottom: `1px solid ${TEXT_MUTED}`, marginBottom: 3 }} />
                        <div style={{ fontSize: 8, color: TEXT_MUTED, textAlign: 'center' }}>Date</div>
                    </div>
                </div>
            </div>

            {/* ZONE 8 — FOOTER (~3%) */}
            <div style={{ height: 30, background: '#F9FAFB', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
                <div style={{ fontSize: 7.5, color: TEXT_MUTED, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {address ? <span>{address}</span> : null}
                    {phone ? <span>· {phone}</span> : null}
                    {schoolEmail ? <span>· {schoolEmail}</span> : null}
                </div>
                <div style={{ fontSize: 7.5, color: '#D1D5DB', fontStyle: 'italic' }}>
                    Generated by Lumina-SIS
                </div>
            </div>

            {/* Bottom indigo stripe (4px) */}
            <div style={{ height: 4, background: primary, flexShrink: 0 }} />
        </div>
    );
};

const thHead = {
    padding: '6px 8px',
    textAlign: 'left',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 700,
    color: '#FFFFFF',
    border: 'none',
};

const tdCell = {
    padding: '4px 8px',
    fontSize: 9.5,
    color: TEXT_DARK,
    verticalAlign: 'middle',
};

const commentBox = (primary) => ({
    background: '#FAFBFF',
    border: `1px solid ${primary}25`,
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 9.5,
    color: '#374151',
    lineHeight: 1.4,
    minHeight: 56,
});

export default LuminaDefaultReportCard;
