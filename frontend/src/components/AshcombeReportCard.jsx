import React, { forwardRef, useMemo } from "react";

/**
 * AshcombeReportCard.jsx
 * -----------------------------------------------------------------------------
 * Renders a school report card in the Ashcombe style:
 *   ┌─ Header (upload image OR design canvas)
 *   │  Body:  student info bar → stat cards → subject table →
 *   │         teacher comments → personal development + awards/behavioural →
 *   │         behavioural counters → grading key
 *   └─ Footer (upload image OR design canvas, + signature lines)
 *
 * Every visual token in the Body reads from CSS custom properties so a school
 * can be re-skinned by only changing the theme (colors + fonts).
 *
 * Props
 *   data     — the full payload from `GET /api/report-card/{id}?term=&academic_year=`
 *   template — the school's report_templates document
 *
 * Usage
 *   <AshcombeReportCard ref={cardRef} data={data} template={template} />
 *   html2canvas(cardRef.current).then(...)
 */

// ---- Field-token substitution used inside header/footer design elements ----
const substituteTokens = (str, ctx) => {
    if (!str) return "";
    return String(str).replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key) => {
        const val = ctx[key];
        return val == null ? "" : String(val);
    });
};

// ---- Header/Footer sub-renderers ----
const RegionCanvas = ({ region, ctx, kind }) => {
    if (!region) return null;
    const height = region.height_px || (kind === "header" ? 120 : 90);
    if (region.mode === "upload" && region.upload_image_url) {
        return (
            <div style={{ height, borderBottom: kind === "header" ? "2px solid var(--report-primary)" : "none", borderTop: kind === "footer" ? "1px solid #e2e8f0" : "none", overflow: "hidden" }}>
                <img src={region.upload_image_url} alt={kind} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </div>
        );
    }
    // Design mode — position each element absolutely
    return (
        <div
            style={{
                position: "relative",
                height,
                borderBottom: kind === "header" ? "2px solid var(--report-primary)" : "none",
                borderTop: kind === "footer" ? "1px solid #e2e8f0" : "none",
                background: "#ffffff",
            }}
        >
            {(region.design_elements || []).map((el, idx) => {
                const content = el.type === "field_token" || el.type === "text"
                    ? substituteTokens(el.content, ctx)
                    : el.content;
                if (el.type === "divider") {
                    return (
                        <div key={el.id || idx} style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: 1, background: el.color || "#e2e8f0" }} />
                    );
                }
                if (el.type === "crest_image") {
                    return (
                        <img
                            key={el.id || idx}
                            src={el.content}
                            alt="crest"
                            style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, objectFit: "contain" }}
                        />
                    );
                }
                // text / field_token
                return (
                    <div
                        key={el.id || idx}
                        style={{
                            position: "absolute",
                            left: el.x, top: el.y,
                            width: el.width, height: el.height,
                            fontSize: el.font_size,
                            fontWeight: el.font_weight,
                            color: el.color || "var(--report-primary)",
                            textAlign: el.align || "left",
                            fontFamily: "var(--report-font-heading)",
                            lineHeight: 1.15,
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                                el.align === "right" ? "flex-end"
                                : el.align === "center" ? "center"
                                : "flex-start",
                        }}
                    >
                        {content}
                    </div>
                );
            })}
        </div>
    );
};

// ---- Body sub-renderers ----
const InfoStripCell = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--report-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {value || "—"}
        </div>
    </div>
);

const StatCard = ({ label, value, suffix = "" }) => (
    <div
        style={{
            flex: 1,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: 0,
        }}
    >
        <div style={{ fontSize: 30, fontWeight: 800, color: "var(--report-primary)", fontFamily: "var(--report-font-heading)", lineHeight: 1 }}>
            {value == null ? "—" : `${value}${suffix}`}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: "#475569", textTransform: "uppercase" }}>{label}</div>
    </div>
);

const columnLabelMap = {
    class_work: "CLASS WORK",
    homework: "HOMEWORK",
    exam: "EXAM",
    project: "PROJECT",
    overall: "OVERALL",
    grade: "GRADE",
};

// Map body column keys → gradebook.subjects[] fields used by the app.
// Gradebook already stores: homework, groupWork, project, quiz, midTerm, endOfTerm, score, grade.
// We treat: class_work = round((homework + groupWork + quiz) / n) as a reasonable proxy,
// homework -> homework, exam -> midTerm/endOfTerm blend (endOfTerm has more weight so we use that),
// project -> project, overall -> score, grade -> grade.
const resolveCell = (subject, colKey) => {
    const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? Math.round(v) : null);
    if (colKey === "class_work") {
        const cw = [subject.homework, subject.groupWork, subject.quiz].filter((x) => typeof x === "number");
        if (!cw.length) return null;
        return Math.round(cw.reduce((a, b) => a + b, 0) / cw.length);
    }
    if (colKey === "homework") return num(subject.homework);
    if (colKey === "exam") return num(subject.endOfTerm) ?? num(subject.midTerm);
    if (colKey === "project") return num(subject.project);
    if (colKey === "overall") return num(subject.score);
    if (colKey === "grade") return subject.grade || null;
    return null;
};

const SubjectTable = ({ subjects, columns }) => (
    <div>
        <SectionHeading>SUBJECT PERFORMANCE</SectionHeading>
        <table
            style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--report-font-body)",
                fontSize: 11.5,
                marginTop: 8,
            }}
        >
            <thead>
                <tr style={{ background: "var(--report-primary)", color: "#ffffff" }}>
                    <th style={thStyle}>SUBJECT</th>
                    <th style={thStyle}>TEACHER</th>
                    {columns.map((c) => (
                        <th key={c} style={{ ...thStyle, textAlign: "center" }}>{columnLabelMap[c] || c.toUpperCase()}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {(subjects || []).map((s, idx) => (
                    <tr key={s.subject || idx} style={{ background: idx % 2 ? "#f8fafc" : "#ffffff" }}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: "var(--report-primary)" }}>{s.subject}</td>
                        <td style={tdStyle}>{s.teacher || "—"}</td>
                        {columns.map((c) => {
                            const val = resolveCell(s, c);
                            return (
                                <td key={c} style={{ ...tdStyle, textAlign: "center", fontWeight: c === "grade" || c === "overall" ? 700 : 500 }}>
                                    {val == null || val === "" ? "—" : val}
                                </td>
                            );
                        })}
                    </tr>
                ))}
                {(!subjects || subjects.length === 0) && (
                    <tr>
                        <td colSpan={2 + columns.length} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 16 }}>
                            No grades recorded for this term.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const thStyle = {
    padding: "8px 10px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    textAlign: "left",
    borderBottom: "1px solid #cbd5e1",
};
const tdStyle = {
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
};

const SectionHeading = ({ children }) => (
    <div
        style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.2,
            color: "var(--report-accent)",
            textTransform: "uppercase",
            marginTop: 18,
            marginBottom: 6,
            fontFamily: "var(--report-font-heading)",
            borderLeft: "3px solid var(--report-accent)",
            paddingLeft: 8,
        }}
    >
        {children}
    </div>
);

const PersonalDevelopment = ({ pd }) => {
    const rows = [
        ["Leadership role", pd.leadership_role || "—"],
        ["Community service hours", pd.community_service_hours ?? "—"],
        ["Co-curricular : intra-school", pd.cocurricular_intra || "—"],
        ["Co-curricular : inter-school", pd.cocurricular_inter || "—"],
        ["Conformity to school rules", pd.conformity ?? "—"],
        ["Grooming", pd.grooming ?? "—"],
        ["Courtesy", pd.courtesy ?? "—"],
        ["Ability to stay focused", pd.focus ?? "—"],
    ];
    return (
        <div>
            <SectionHeading>PERSONAL DEVELOPMENT &amp; ATTRIBUTES</SectionHeading>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontFamily: "var(--report-font-body)" }}>
                <tbody>
                    {rows.map(([k, v], idx) => (
                        <tr key={k} style={{ background: idx % 2 ? "#f8fafc" : "#ffffff" }}>
                            <td style={{ ...tdStyle, width: "60%", color: "#334155" }}>{k}</td>
                            <td style={{ ...tdStyle, fontWeight: 600, color: "var(--report-primary)" }}>{v}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AwardsList = ({ awards }) => (
    <div>
        <SectionHeading>AWARDS</SectionHeading>
        {awards.length ? (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11.5, color: "#0f172a", fontFamily: "var(--report-font-body)" }}>
                {awards.map((a, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{a}</li>
                ))}
            </ul>
        ) : (
            <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 4 }}>No awards this term.</div>
        )}
    </div>
);

const BehaviouralCounters = ({ counters }) => {
    const boxes = [
        ["DETENTIONS", counters.detentions || 0],
        ["WARNINGS", counters.warnings || 0],
        ["SUSPENSIONS", counters.suspensions || 0],
        ["OTHER", counters.other || 0],
    ];
    return (
        <div>
            <SectionHeading>BEHAVIOURAL RECORD</SectionHeading>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 6 }}>
                {boxes.map(([label, value]) => (
                    <div
                        key={label}
                        style={{
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            borderRadius: 8,
                            padding: "10px 12px",
                            textAlign: "center",
                        }}
                    >
                        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--report-primary)", fontFamily: "var(--report-font-heading)" }}>{value}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: "#64748b", marginTop: 2 }}>{label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GradingKey = ({ scale }) => (
    <div>
        <SectionHeading>GRADING KEY</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 6, fontSize: 10.5, fontFamily: "var(--report-font-body)" }}>
            {(scale || []).map((b) => (
                <div key={b.letter} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 8px" }}>
                    <span style={{ fontWeight: 800, color: "var(--report-accent)", marginRight: 6 }}>{b.letter}</span>
                    <span style={{ color: "#334155" }}>{b.min}-{b.max}</span>
                    <span style={{ color: "#94a3b8", marginLeft: 6 }}>({(b.gpa ?? 0).toFixed(1)})</span>
                </div>
            ))}
        </div>
        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>
            Standard 4.0 GPA scale used for calculations
        </div>
    </div>
);

// ---- Top-level component ----
const AshcombeReportCard = forwardRef(({ data, template }, ref) => {
    const body = template?.body || {};
    const theme = body.theme || {};
    const sections = body.sections_enabled || {};
    const columns = body.subject_table_columns || ["class_work", "homework", "exam", "project", "overall", "grade"];

    const student = data?.student || {};
    const cls = data?.class_info || {};
    const school = data?.school || {};

    // Build the token context for header/footer substitution
    const ctx = useMemo(() => {
        const issue = new Date();
        const issueDate = issue.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        return {
            school_name: (school.name || "").toUpperCase(),
            school_tagline: school.tagline || "",
            school_address: school.address || "",
            term_label: `${data?.term || ""} ${data?.academic_year || ""}`.trim(),
            issue_date: issueDate,
            principal_name: school.principal_name || "",
            student_full_name: `${student.first_name || ""} ${student.middle_name || ""} ${student.last_name || ""}`.replace(/\s+/g, " ").trim(),
        };
    }, [school, data, student]);

    // Theme -> CSS variables
    const themeStyle = {
        "--report-primary": theme.primary_color || "#0f172a",
        "--report-accent": theme.accent_color || "#4f46e5",
        "--report-font-heading": theme.font_heading || "Inter, ui-sans-serif, system-ui, sans-serif",
        "--report-font-body": theme.font_body || "Inter, ui-sans-serif, system-ui, sans-serif",
    };

    const subjects = data?.grades?.subjects || [];
    const behavioural = data?.behavioural || { detentions: 0, warnings: 0, suspensions: 0, other: 0 };
    const awards = data?.awards || [];
    const pd = data?.personal_development || {};
    const attendancePct = data?.attendance_pct;
    const overall = data?.overall_average;
    const gpa = data?.gpa;

    const fullName = ctx.student_full_name || "—";
    const studentIdVal = student.student_id || student.id || "";

    return (
        <div
            ref={ref}
            style={{
                ...themeStyle,
                width: "8.5in",
                minHeight: "11in",
                background: "#ffffff",
                color: "#0f172a",
                fontFamily: theme.font_body || "Inter, sans-serif",
                boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
                margin: "0 auto",
            }}
        >
            {/* Header */}
            <RegionCanvas region={template?.header} ctx={ctx} kind="header" />

            {/* Body */}
            <div style={{ padding: "18px 32px 22px" }}>
                {sections.student_info_bar !== false && (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: 20, padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
                            <InfoStripCell label="STUDENT" value={fullName} />
                            <InfoStripCell label="HOUSE" value={student.house} />
                            <InfoStripCell label="ADVISOR" value={data?.advisor} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 20, padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}>
                            <InfoStripCell label="STUDENT ID" value={studentIdVal} />
                            <InfoStripCell label="GRADE & FORM" value={cls.grade_level && cls.name ? `${cls.grade_level} · ${cls.name}` : (cls.grade_level || cls.name || "—")} />
                            <InfoStripCell label="TERM DATES" value={`${data?.term || ""} ${data?.academic_year || ""}`} />
                        </div>
                    </>
                )}

                {sections.stats_cards !== false && (
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                        <StatCard label="GRADE POINT AVERAGE" value={gpa ?? "—"} />
                        <StatCard label="ATTENDANCE RATE" value={attendancePct ?? "—"} suffix={attendancePct != null ? "%" : ""} />
                        <StatCard label="OVERALL AVERAGE" value={overall ?? "—"} suffix={overall != null ? "%" : ""} />
                    </div>
                )}

                {sections.subject_table !== false && (
                    <div style={{ marginTop: 10 }}>
                        <SubjectTable subjects={subjects} columns={columns} />
                    </div>
                )}

                {sections.teacher_comments !== false && (
                    <div>
                        <SectionHeading>TEACHER COMMENTS</SectionHeading>
                        <div
                            style={{
                                border: "1px solid #e2e8f0",
                                background: "#ffffff",
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 12,
                                lineHeight: 1.55,
                                color: "#0f172a",
                                fontFamily: "var(--report-font-body)",
                                minHeight: 68,
                            }}
                        >
                            {data?.teacher_comment || (
                                <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No teacher comment recorded for this term.</span>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginTop: 4 }}>
                    {sections.personal_development !== false && <PersonalDevelopment pd={pd} />}
                    {sections.awards_behavioural !== false && (
                        <div>
                            <AwardsList awards={awards} />
                        </div>
                    )}
                </div>

                {sections.behavioural_counters !== false && (
                    <div style={{ marginTop: 4 }}>
                        <BehaviouralCounters counters={behavioural} />
                    </div>
                )}

                {sections.grading_key !== false && (
                    <div style={{ marginTop: 4 }}>
                        <GradingKey scale={theme.grade_scale || []} />
                    </div>
                )}

                {/* Signature lines (rendered as part of body flow so they sit above the footer graphic) */}
                {(() => {
                    const configured = template?.footer?.show_signature_lines || ["principal"];
                    // The class's assigned teacher is the form teacher — always show that line.
                    const slots = Array.from(new Set(["class_teacher", ...configured]));
                    const formTeacher = data?.form_teacher_name || cls?.teacher_name || data?.advisor || "";
                    const nameFor = (slot) => {
                        if (slot === "class_teacher" || slot === "form_teacher" || slot === "teacher") return formTeacher;
                        if (slot === "principal") return school?.principal_name || "";
                        return "";
                    };
                    const labelFor = (slot) => {
                        if (slot === "class_teacher" || slot === "form_teacher" || slot === "teacher") return "Form Teacher";
                        if (slot === "principal") return "Principal";
                        if (slot === "parent_guardian") return "Parent / Guardian";
                        return slot.replace(/_/g, " ");
                    };
                    return (
                        <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                            {slots.map((slot) => (
                                <div key={slot}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", minHeight: 16, marginBottom: 2 }}>
                                        {nameFor(slot)}
                                    </div>
                                    <div style={{ borderBottom: "1px solid #0f172a", height: 20 }} />
                                    <div style={{ fontSize: 9, letterSpacing: 1, color: "#334155", marginTop: 4, textTransform: "uppercase", fontWeight: 700 }}>
                                        {labelFor(slot)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* Footer */}
            <RegionCanvas region={template?.footer} ctx={ctx} kind="footer" />
        </div>
    );
});

AshcombeReportCard.displayName = "AshcombeReportCard";
export default AshcombeReportCard;
