import React from 'react';
import { Mail, MapPin, Phone, Globe, Sparkles } from 'lucide-react';

/**
 * Lumina-SIS — Default Report Card Template
 *
 * Legal page (8.5" × 14") fixed to a single page. Designed for print-fidelity
 * and html2canvas/jsPDF rasterization. All sizes are in inches/pt to avoid
 * surprises across screen DPIs.
 *
 * Props:
 *  - data: { student, grades:{ subjects:[] }, attendance_summary, social_skills, position }
 *  - classInfo: { name, grade_level }
 *  - term, academicYear, totalStudents
 *  - signatures: { principal, teacher }
 *  - template: { theme: { primary }, school: { name, tagline, address, phone, website, logo_url, stamp_url } }
 *  - school (optional): full school doc
 */

const DEFAULT_PRIMARY = '#4F46E5'; // indigo-600

const LETTER_COLORS = {
    A: { bg: '#D1FAE5', text: '#065F46' }, // emerald
    B: { bg: '#DBEAFE', text: '#1E40AF' }, // blue
    C: { bg: '#FEF3C7', text: '#92400E' }, // amber
    D: { bg: '#FFEDD5', text: '#9A3412' }, // orange
    E: { bg: '#FEE2E2', text: '#991B1B' }, // red (treated as F)
    F: { bg: '#FEE2E2', text: '#991B1B' },
    U: { bg: '#E5E7EB', text: '#374151' }, // slate
};

const getLetterStyle = (grade) => {
    const letter = (grade || 'U').toString().trim().toUpperCase().charAt(0);
    return LETTER_COLORS[letter] || LETTER_COLORS.U;
};

const fmtDate = (d) => new Date(d || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
});

// Dot scale for conduct ratings (1..5)
const DotScale = ({ value, primary }) => {
    const v = Math.max(0, Math.min(5, parseInt(value || 0, 10)));
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
                <span
                    key={n}
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: n <= v ? primary : '#E5E7EB',
                        display: 'inline-block',
                    }}
                />
            ))}
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
                minWidth: 28,
                padding: '2px 8px',
                borderRadius: 999,
                background: style.bg,
                color: style.text,
                fontWeight: 700,
                fontSize: '10pt',
                letterSpacing: '0.5px',
            }}
        >
            {grade || '-'}
        </span>
    );
};

// Normalize student photo URL: absolute, relative, or empty.
const normalizeUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return `${process.env.REACT_APP_BACKEND_URL || ''}${url}`;
};

const computeConduct = (socialSkills) => {
    // Derive a 1-5 score per category from skill_ratings; default to 3 if missing.
    const cats = ['Punctuality', 'Participation', 'Behaviour', 'Effort'];
    const result = {};
    for (const cat of cats) {
        const raw = socialSkills?.[cat] ?? socialSkills?.[cat.toLowerCase()] ?? socialSkills?.ratings?.[cat];
        // Try to map common ratings to 1..5
        if (raw === undefined || raw === null || raw === '') {
            result[cat] = 0;
            continue;
        }
        if (typeof raw === 'number') {
            result[cat] = Math.max(0, Math.min(5, raw));
            continue;
        }
        const s = String(raw).toLowerCase();
        if (s.includes('excellent') || s.includes('outstanding') || s === 'a') result[cat] = 5;
        else if (s.includes('very good') || s === 'b+') result[cat] = 4;
        else if (s.includes('good') || s === 'b') result[cat] = 4;
        else if (s.includes('satisf') || s === 'c') result[cat] = 3;
        else if (s.includes('fair') || s === 'd') result[cat] = 2;
        else if (s.includes('needs') || s.includes('poor') || s === 'f' || s === 'e') result[cat] = 1;
        else result[cat] = 3;
    }
    return result;
};

const computePromotion = (overallScore) => {
    const s = parseFloat(overallScore);
    if (!isFinite(s)) return { label: 'Pending', color: '#6B7280', bg: '#F3F4F6' };
    if (s >= 50) return { label: 'Promoted', color: '#065F46', bg: '#D1FAE5' };
    if (s >= 35) return { label: 'On Probation', color: '#92400E', bg: '#FEF3C7' };
    return { label: 'Retained', color: '#991B1B', bg: '#FEE2E2' };
};

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
    const subjectGrades = data?.grades?.subjects || [];
    const attendance = data?.attendance_summary || {};
    const socialSkills = data?.social_skills || {};
    const position = data?.position;

    // Theme: prefer school's primary color, then template, default indigo
    const primary =
        school?.primary_color ||
        template?.theme?.primary ||
        template?.theme?.headerBg ||
        DEFAULT_PRIMARY;

    const schoolName = school?.name || template?.school?.name || classInfo?.school_name || 'School Name';
    const tagline = school?.tagline || template?.school?.tagline || 'Education made simple.';
    const address = school?.address || template?.school?.address || '';
    const phone = school?.phone || template?.school?.phone || '';
    const website = school?.website || template?.school?.website || '';
    const schoolEmail = school?.email || template?.school?.email || '';
    const logoUrl = normalizeUrl(school?.logo_url || template?.school?.logo_url);
    const stampUrl = normalizeUrl(school?.stamp_url || template?.school?.stamp_url);
    const photoUrl = normalizeUrl(student?.photo_url);

    const overallScore = data?.grades?.overall_score ?? data?.overall_score ?? 0;
    const overallGrade = data?.grades?.overall_grade ?? data?.overall_grade ?? '-';
    const conduct = computeConduct(socialSkills);
    const promotion = computePromotion(overallScore);
    const issueDate = fmtDate(new Date());

    const homeroomTeacher =
        classInfo?.teacher_name || data?.teacher_name || signatures?.teacher_name || '—';

    // Attendance numbers (zeros if missing)
    const aPresent = attendance.present ?? 0;
    const aAbsent = attendance.absent ?? 0;
    const aLate = attendance.late ?? 0;
    const aExcused = attendance.excused ?? 0;
    const aTotal = attendance.total ?? aPresent + aAbsent + aLate + aExcused;
    const aPct = aTotal > 0 ? Math.round(((aPresent + aExcused + 0.5 * aLate) / aTotal) * 100) : 0;

    // Subjects: ensure at least 8 rows for visual balance, never more than what fits.
    const MIN_ROWS = 8;
    const rows = [...subjectGrades];
    while (rows.length < MIN_ROWS) rows.push(null);

    return (
        <div
            className="lumina-default-report-card mhps-report-card bg-white mx-auto mb-8 print:mb-0 print:page-break-after-always"
            style={{
                width: '8.5in',
                height: '14in',
                padding: '0.5in',
                background: '#ffffff',
                color: '#111827',
                fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
                fontSize: '10pt',
                lineHeight: 1.35,
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                pageBreakAfter: 'always',
            }}
        >
            {/* Top accent rule */}
            <div style={{ height: 6, background: primary, borderRadius: 3, marginBottom: 14 }} />

            {/* Header strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {logoUrl ? (
                        <img src={logoUrl} alt="logo" crossOrigin="anonymous" style={{ width: 56, height: 56, objectFit: 'contain' }} />
                    ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 12, background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>
                            {schoolName?.[0] || 'S'}
                        </div>
                    )}
                    <div>
                        <h1 style={{ margin: 0, fontSize: '18pt', fontWeight: 800, letterSpacing: '-0.01em', color: '#111827' }}>
                            {schoolName}
                        </h1>
                        <p style={{ margin: 0, fontSize: '9pt', color: '#6B7280', fontStyle: 'italic' }}>{tagline}</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', background: `${primary}15`, color: primary, padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: '10pt', letterSpacing: '0.04em' }}>
                        {String(term || '').toUpperCase()} · {academicYear || ''}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '8.5pt', color: '#6B7280' }}>Issued: {issueDate}</p>
                </div>
            </div>

            {/* Title band */}
            <div
                style={{
                    background: '#F9FAFB',
                    borderLeft: `4px solid ${primary}`,
                    padding: '8px 14px',
                    marginBottom: 14,
                    borderRadius: 6,
                }}
            >
                <h2 style={{ margin: 0, fontSize: '13pt', fontWeight: 700, color: '#111827', letterSpacing: '0.01em' }}>
                    Student Report Card
                </h2>
                <p style={{ margin: 0, fontSize: '9pt', color: '#6B7280' }}>An overview of academic progress and conduct for the term.</p>
            </div>

            {/* Student profile row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                {/* Photo */}
                <div style={{ width: 88, height: 110, borderRadius: 10, overflow: 'hidden', border: `2px solid ${primary}30`, flexShrink: 0, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {photoUrl ? (
                        <img src={photoUrl} alt={student.first_name} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: 28, fontWeight: 700, color: primary }}>
                            {(student.first_name?.[0] || '?') + (student.last_name?.[0] || '')}
                        </span>
                    )}
                </div>

                {/* Identity grid */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18, rowGap: 6, alignContent: 'center' }}>
                    <Field label="Student name" value={`${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.trim()} bold />
                    <Field label="Student ID" value={student.student_id || student.id?.slice(0, 8) || '—'} />
                    <Field label="Class" value={classInfo?.name || '—'} />
                    <Field label="Grade level" value={classInfo?.grade_level || student.grade_level || '—'} />
                    <Field label="Homeroom teacher" value={homeroomTeacher} />
                    <Field label="Position in class" value={position && totalStudents ? `${position} of ${totalStudents}` : '—'} />
                </div>
            </div>

            {/* Subjects table */}
            <SectionLabel primary={primary}>Academic performance</SectionLabel>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: '9.5pt' }}>
                <thead>
                    <tr style={{ background: '#F9FAFB', color: '#374151' }}>
                        <th style={th}>Subject</th>
                        <th style={{ ...th, width: 70, textAlign: 'right' }}>Score</th>
                        <th style={{ ...th, width: 70, textAlign: 'right' }}>%</th>
                        <th style={{ ...th, width: 70, textAlign: 'center' }}>Grade</th>
                        <th style={{ ...th, width: '32%' }}>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ ...td, fontWeight: 600 }}>{row?.subject || (idx >= subjectGrades.length ? ' ' : '—')}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{row?.score != null ? row.score : ''}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{row?.score != null ? `${Math.round(row.score)}%` : ''}</td>
                            <td style={{ ...td, textAlign: 'center' }}>{row ? <LetterBadge grade={row.grade} /> : null}</td>
                            <td style={{ ...td, color: '#4B5563', fontStyle: row?.comment ? 'normal' : 'italic' }}>{row?.comment || (row ? '—' : '')}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td style={{ ...td, fontWeight: 800, color: primary }}>Overall</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{Number(overallScore).toFixed(1)}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{Math.round(overallScore)}%</td>
                        <td style={{ ...td, textAlign: 'center' }}><LetterBadge grade={overallGrade} /></td>
                        <td style={{ ...td, color: primary, fontWeight: 600 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    padding: '2px 10px',
                                    background: promotion.bg,
                                    color: promotion.color,
                                    borderRadius: 999,
                                    fontSize: '9pt',
                                    fontWeight: 700,
                                }}
                            >
                                {promotion.label}
                            </span>
                        </td>
                    </tr>
                </tfoot>
            </table>

            {/* Attendance + Conduct row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                    <SectionLabel primary={primary}>Attendance summary</SectionLabel>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 4 }}>
                        <AttendanceTile color="#10B981" label="Present" value={aPresent} />
                        <AttendanceTile color="#EF4444" label="Absent" value={aAbsent} />
                        <AttendanceTile color="#F59E0B" label="Late" value={aLate} />
                        <AttendanceTile color="#3B82F6" label="Excused" value={aExcused} />
                        <AttendanceTile color={primary} label="% Present" value={`${aPct}%`} highlight />
                    </div>
                </div>
                <div>
                    <SectionLabel primary={primary}>Conduct &amp; effort</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                        {Object.entries(conduct).map(([cat, value]) => (
                            <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9pt' }}>
                                <span style={{ color: '#374151' }}>{cat}</span>
                                <DotScale value={value} primary={primary} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Comments */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                    <SectionLabel primary={primary}>Homeroom teacher's comment</SectionLabel>
                    <div style={commentBox(primary)}>
                        {data?.teacher_comment || student?.teacher_comment || 'A solid term. Keep building on your strengths and continue working diligently in every subject.'}
                    </div>
                </div>
                <div>
                    <SectionLabel primary={primary}>Principal's comment</SectionLabel>
                    <div style={commentBox(primary)}>
                        {data?.principal_comment || 'We are proud of your progress this term. Continue to embrace learning with curiosity and discipline.'}
                    </div>
                </div>
            </div>

            {/* Signatures + Stamp */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 'auto' }}>
                <SignatureBlock label="Homeroom teacher" imageUrl={signatures?.teacher} />
                <SignatureBlock label="Principal" imageUrl={signatures?.principal} />
                <SignatureBlock label="Parent / Guardian" imageUrl={null} />
            </div>

            {/* Stamp / seal — floats subtly */}
            {stampUrl ? (
                <img
                    src={stampUrl}
                    alt="stamp"
                    crossOrigin="anonymous"
                    style={{ position: 'absolute', right: 32, bottom: 96, width: 100, height: 100, opacity: 0.85 }}
                />
            ) : null}

            {/* Footer */}
            <div style={{ position: 'absolute', left: '0.5in', right: '0.5in', bottom: '0.4in' }}>
                <div style={{ height: 1, background: '#E5E7EB', marginBottom: 8 }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '7.5pt', color: '#6B7280' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {address ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={9} /> {address}</span> : null}
                        {phone ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={9} /> {phone}</span> : null}
                        {website ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Globe size={9} /> {website}</span> : null}
                        {schoolEmail ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={9} /> {schoolEmail}</span> : null}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#D1D5DB', fontStyle: 'italic' }}>
                        <Sparkles size={9} /> Generated by Lumina-SIS
                    </div>
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, value, bold }) => (
    <div>
        <div style={{ fontSize: '7.5pt', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: bold ? '11pt' : '10pt', fontWeight: bold ? 700 : 500, color: '#111827' }}>{value || '—'}</div>
    </div>
);

const SectionLabel = ({ primary, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 4, height: 14, background: primary, borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: '10pt', fontWeight: 700, color: '#111827', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{children}</h3>
    </div>
);

const AttendanceTile = ({ color, label, value, highlight }) => (
    <div
        style={{
            flex: 1,
            background: highlight ? `${color}15` : '#F9FAFB',
            border: `1px solid ${highlight ? `${color}40` : '#F3F4F6'}`,
            borderRadius: 8,
            padding: '6px 8px',
            textAlign: 'center',
        }}
    >
        <div style={{ fontSize: '13pt', fontWeight: 800, color: highlight ? color : '#111827', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '7.5pt', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
    </div>
);

const SignatureBlock = ({ label, imageUrl }) => (
    <div>
        <div style={{ height: 36, borderBottom: '1px solid #9CA3AF', position: 'relative', marginBottom: 4 }}>
            {imageUrl ? (
                <img
                    src={imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : `${process.env.REACT_APP_BACKEND_URL || ''}${imageUrl}`}
                    alt={label}
                    crossOrigin="anonymous"
                    style={{ position: 'absolute', bottom: 0, left: 0, maxHeight: 32, maxWidth: '100%', objectFit: 'contain' }}
                />
            ) : null}
        </div>
        <div style={{ fontSize: '8pt', color: '#6B7280', textAlign: 'center' }}>{label}</div>
    </div>
);

const th = {
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: '8pt',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 700,
    color: '#374151',
    borderBottom: '1px solid #E5E7EB',
};

const td = {
    padding: '8px 10px',
    fontSize: '9.5pt',
    color: '#111827',
    verticalAlign: 'middle',
};

const commentBox = (primary) => ({
    background: '#FAFBFF',
    border: `1px solid ${primary}25`,
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: '9.5pt',
    color: '#374151',
    lineHeight: 1.45,
    minHeight: 64,
});

export default LuminaDefaultReportCard;
