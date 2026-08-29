import React, { forwardRef } from 'react';
import { mediaUrl } from '../lib/media';

/**
 * MHPS Upper School Report Card (Grades 4-6) — tenant-locked print template.
 *
 * Rendered at US Legal size (8.5in x 14in). Uses plain inline styles + CSS
 * custom properties for theming (green/gold pulled from tenant settings).
 * NO gradients, box-shadows or backdrop-blur (these break html2canvas).
 *
 * Props:
 *   data = payload from GET /api/mhps/report-card/{student_id}
 *          { student, class_info, term, academic_year, report_card,
 *            settings, comment_bank, school }
 */

const fmtDOB = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const MHPSReportCardTemplate = forwardRef(({ data }, ref) => {
  const student = data?.student || {};
  const rc = data?.report_card || {};
  const settings = data?.settings || {};
  const school = data?.school || {};
  const commentBank = data?.comment_bank || [];
  const template = data?.template || {};

  const theme = settings.theme || {};
  const GREEN = theme.primary_color || '#1F5C3F';
  const GREEN_DARK = theme.primary_dark || '#123D29';
  const GOLD_LIGHT = theme.accent_light || '#F3ECD2';
  const LINE = '#2b2b2b';
  const INK = '#1a1a1a';
  const FONT = theme.font_body || "'Times New Roman', Georgia, serif";

  const gradeScale = settings.academic_grade_scale || [];
  const achievementBands = settings.achievement_bands || [];
  const subjects = rc.subjects || [];
  const coreSubjects = settings.core_subjects || ['Mathematics', 'Language Arts', 'Social Studies', 'Science'];
  const workEthics = settings.work_ethics_criteria || [];
  const socialSkills = settings.social_skills_criteria || [];
  const ratingScale = settings.rating_scale || [];
  const principalCred = settings.principal_signature_block || school.principal_name || '';

  // Map behavior ratings by criterion for lookup
  const behaviorMap = {};
  (rc.behavior_ratings || []).forEach((b) => {
    behaviorMap[`${b.category}::${b.criterion}`] = b.rating;
  });

  // Achievement: subject -> band
  const achBySubject = {};
  (rc.achievement_standards || []).forEach((a) => { achBySubject[a.subject] = a.band; });

  // Performance task: subject -> descriptor
  const perfBySubject = {};
  (rc.performance_task || []).forEach((p) => { perfBySubject[p.subject] = p.descriptor; });

  const selectedComments = new Set(rc.selected_comments || []);

  const logoUrl = school.logo_url ? mediaUrl(school.logo_url) : '';

  const cellBorder = `1px solid ${LINE}`;

  const th = {
    border: cellBorder, padding: '4px 5px', fontSize: '11px', textAlign: 'center',
    background: GOLD_LIGHT, color: GREEN_DARK, fontWeight: 'bold',
  };
  const td = { border: cellBorder, padding: '4px 5px', fontSize: '11px', textAlign: 'center' };
  const bandCell = { background: GREEN, color: '#fff', textAlign: 'center', fontWeight: 'bold', padding: '3px', fontSize: '11px' };
  const sectionBand = {
    background: GREEN, color: '#fff', fontSize: '12px', fontWeight: 'bold',
    letterSpacing: '0.5px', padding: '4px 8px', marginTop: '14px',
  };

  const ageDisplay = student.age != null ? student.age : '';

  return (
    <div
      ref={ref}
      style={{
        width: '8.5in',
        minHeight: '14in',
        background: '#ffffff',
        color: INK,
        fontFamily: FONT,
        padding: '0.4in 0.45in 0.45in',
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      {/* ---------- HEADER ---------- */}
      {logoUrl ? (
        <div style={{ borderBottom: `3px solid ${GREEN}`, paddingBottom: '8px', marginBottom: '6px', textAlign: 'center' }}>
          <img src={logoUrl} alt="Mona Heights Primary School" crossOrigin="anonymous"
               style={{ width: '100%', maxHeight: '120px', objectFit: 'contain' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', borderBottom: `3px solid ${GREEN}`, paddingBottom: '10px', marginBottom: '6px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: GREEN_DARK, letterSpacing: '0.5px' }}>
              {(school.name || 'MONA HEIGHTS PRIMARY SCHOOL').toUpperCase()}
            </div>
            <div style={{ fontSize: '13px', color: GREEN, fontStyle: 'italic', marginTop: '2px' }}>
              {school.tagline || 'Excellence Through Discipline & Diligence'}
            </div>
          </div>
        </div>
      )}

      {/* ---------- REPORT TITLE ---------- */}
      <div style={{ textAlign: 'center', margin: '10px 0 14px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline' }}>
          {template.header_text || 'UPPER SCHOOL REPORT CARD'}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', textDecoration: 'underline' }}>
          {template.sub_header_text || 'GRADES 4\u20136'}
        </div>
      </div>

      {/* ---------- STUDENT INFO ---------- */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td colSpan={4} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Surname / Name:</b> {student.last_name}{student.last_name ? ',' : ''} {student.first_name}
            </td>
            <td colSpan={3} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Christian Name:</b> {student.first_name}
            </td>
            <td colSpan={2} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Gender:</b> {student.gender}
            </td>
          </tr>
          <tr>
            <td colSpan={4} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Date of Birth (DD/MM/YYYY):</b> {fmtDOB(student.date_of_birth)}
            </td>
            <td colSpan={3} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Age on Last Birthday:</b> {ageDisplay}
            </td>
            <td colSpan={2} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>House:</b> {student.house}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Grade:</b> {data?.class_info?.grade_level || data?.class_info?.name}
            </td>
            <td colSpan={4} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Term:</b> {rc.term_label || data?.term} — Report for Period: {rc.report_period_label || ''}
            </td>
            <td colSpan={2} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Attendance:</b> Days in Term: {rc.days_in_term ?? ''} &nbsp; Days Absent: {rc.days_absent ?? ''}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Number of Students in Class:</b> {rc.number_of_students_in_class ?? ''}
            </td>
            <td colSpan={4} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Position in Class:</b> {rc.position_in_class ?? ''}
            </td>
            <td colSpan={2} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Student&rsquo;s Overall Average:</b> {rc.student_overall_average != null ? `${rc.student_overall_average}%` : ''}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Reading Level:</b> {student.reading_level}
            </td>
            <td colSpan={4} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Extra-Curricular Activities:</b> {(student.extra_curricular_activities || []).join(', ')}
            </td>
            <td colSpan={2} style={{ ...td, textAlign: 'left', fontSize: '12.5px' }}>
              <b style={{ color: GREEN_DARK }}>Post of Special Responsibility:</b> {student.post_of_special_responsibility}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ---------- GRADES + KEY ---------- */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
        <div style={{ flex: 3 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Subjects</th>
                <th style={th}>Class Tests/<br />Quizzes</th>
                <th style={th}>Assigned<br />Collaborative Task</th>
                <th style={th}>Homework</th>
                <th style={th}>Projects</th>
                <th style={th}>Mid-Term<br />Exam</th>
                <th style={th}>End of Year<br />Exam</th>
                <th style={th}>Weighted<br />Term Grade</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={i}>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 'bold' }}>{s.name}</td>
                  <td style={td}>{s.class_tests_quizzes ?? '\u2014'}</td>
                  <td style={td}>{s.assigned_collaborative_task ?? '\u2014'}</td>
                  <td style={td}>{s.homework ?? '\u2014'}</td>
                  <td style={td}>{s.projects ?? '\u2014'}</td>
                  <td style={td}>{s.mid_term_exam ?? '\u2014'}</td>
                  <td style={td}>{s.end_of_year_exam ?? '\u2014'}</td>
                  <td style={td}>
                    {s.weighted_letter ? <b>{s.weighted_letter}</b> : null} {s.weighted_term_grade ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1, border: cellBorder, fontSize: '10.5px' }}>
          <div style={bandCell}>KEY TO ACADEMIC GRADES</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {gradeScale.map((g, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontSize: '10.5px', padding: '2px 4px' }}>
                    {g.min === 0 ? `Below ${g.max}` : `${g.min}\u2013${g.max}`}
                  </td>
                  <td style={{ ...td, fontSize: '10.5px', padding: '2px 4px' }}><b>{g.letter}</b></td>
                  <td style={{ ...td, fontSize: '10.5px', padding: '2px 4px' }}>{g.descriptor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- ACHIEVEMENT STANDARDS + PERFORMANCE TASK ---------- */}
      <div style={sectionBand}>ACHIEVEMENT STANDARDS &nbsp;·&nbsp; CORE SUBJECTS</div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <div style={{ flex: 2.3 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '34%' }}>Band</th>
                {coreSubjects.map((s) => <th key={s} style={th}>{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {achievementBands.map((b, i) => (
                <tr key={i}>
                  <td style={{ ...td, textAlign: 'left', verticalAlign: 'top', fontSize: '10.5px' }}>
                    <span style={{ fontWeight: 'bold', color: GREEN_DARK }}>
                      {b.band} ({b.min === 0 ? `Below ${b.max}` : `${b.min}\u2013${b.max}`}%)
                    </span>
                    <br />
                    <span style={{ fontWeight: 'normal' }}>{b.description}</span>
                  </td>
                  {coreSubjects.map((s) => (
                    <td key={s} style={{ ...td, fontWeight: 'bold', color: GREEN_DARK }}>
                      {achBySubject[s] === b.band ? '\u2714' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1, border: cellBorder }}>
          <div style={bandCell}>PERFORMANCE TASK</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {coreSubjects.map((s) => (
                <tr key={s}>
                  <td style={{ ...td, textAlign: 'left', fontSize: '10.5px' }}><b>{s}</b></td>
                  <td style={{ ...td, textAlign: 'left', fontSize: '10.5px' }}>{perfBySubject[s] || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- CONDUCT & ATTITUDE ---------- */}
      <div style={sectionBand}>
        CONDUCT &amp; ATTITUDE &nbsp;·&nbsp; RATING SCALE:{' '}
        {ratingScale.map((r) => `${r.code} = ${r.label}`).join('  ')}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th colSpan={2} style={th}>Work and Personal Ethics</th></tr>
            </thead>
            <tbody>
              {workEthics.map((c) => (
                <tr key={c}>
                  <td style={{ ...td, textAlign: 'left', fontSize: '10.5px', padding: '3px 6px' }}>{c}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: GREEN_DARK, fontSize: '10.5px', padding: '3px 6px' }}>
                    {behaviorMap[`work_ethics::${c}`] || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th colSpan={2} style={th}>Progress in Social Skills and Attitudes</th></tr>
            </thead>
            <tbody>
              {socialSkills.map((c) => (
                <tr key={c}>
                  <td style={{ ...td, textAlign: 'left', fontSize: '10.5px', padding: '3px 6px' }}>{c}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: GREEN_DARK, fontSize: '10.5px', padding: '3px 6px' }}>
                    {behaviorMap[`social_skills::${c}`] || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- COMMENTS ---------- */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <div style={{ flex: 1.6, border: cellBorder }}>
          <div style={{ ...bandCell, textAlign: 'left', padding: '3px 6px' }}>CLASS TEACHER&rsquo;S COMMENT/S</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: '6px 8px', fontSize: '10.5px' }}>
            {commentBank.map((c) => {
              const checked = selectedComments.has(c.id);
              return (
                <li key={c.id} style={{ padding: '2px 0' }}>
                  <span style={{ color: checked ? GREEN_DARK : '#888', fontWeight: checked ? 'bold' : 'normal' }}>
                    {checked ? '\u2611 ' : '\u2610 '}
                  </span>
                  {c.text}
                </li>
              );
            })}
          </ul>
        </div>
        <div style={{ flex: 1, border: cellBorder }}>
          <div style={{ ...bandCell, textAlign: 'left', padding: '3px 6px' }}>ADDITIONAL COMMENTS</div>
          <div style={{ padding: '8px', fontSize: '11px', minHeight: '120px' }}>
            {rc.additional_comments || ''}
          </div>
        </div>
      </div>

      {/* ---------- SIGNATURES ---------- */}
      <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: INK, textAlign: 'center', minHeight: '16px' }}>
            {data?.class_info?.teacher_name || ''}
          </div>
          <div style={{ borderTop: `1px solid ${INK}`, width: '280px', textAlign: 'center', paddingTop: '4px' }}>
            Class Teacher&rsquo;s Signature
          </div>
        </div>
        <div>
          <div style={{ borderTop: `1px solid ${INK}`, width: '280px', textAlign: 'center', paddingTop: '4px' }}>
            Principal&rsquo;s Signature
          </div>
          {principalCred ? (
            <div style={{ fontSize: '10px', color: '#333', marginTop: '2px', textAlign: 'center' }}>{principalCred}</div>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '9px', color: '#999', letterSpacing: '0.3px' }}>
        Generated via Lumina-SIS &nbsp;·&nbsp; {template.template_name || 'MHPS Upper School Report Card'}
      </div>
    </div>
  );
});

MHPSReportCardTemplate.displayName = 'MHPSReportCardTemplate';

export default MHPSReportCardTemplate;
