import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Loader2, Download, Save, Plus, Trash2, FileText } from 'lucide-react';
import MHPSReportCardTemplate from '../components/MHPSReportCardTemplate';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const UPPER_GRADES = ['Grade 4', 'Grade 5', 'Grade 6'];

const MHPSReportCardsPage = () => {
  const { isAdmin, isTeacher, currentAcademicYear } = useAuth();
  const printRef = useRef();

  const [classes, setClasses] = useState([]);
  const [template, setTemplate] = useState(null);
  const [settings, setSettings] = useState(null);
  const [commentBank, setCommentBank] = useState([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState(currentAcademicYear || '2024-2025');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ---------- initial load ----------
  useEffect(() => {
    (async () => {
      try {
        const [clsRes, tplRes] = await Promise.all([
          axios.get(`${API}/classes`),
          axios.get(`${API}/mhps/report-template`),
        ]);
        const upper = (clsRes.data || []).filter((c) => UPPER_GRADES.includes(c.grade_level));
        setClasses(upper);
        setTemplate(tplRes.data);
        setSettings(tplRes.data.mhps_settings);
        setCommentBank(tplRes.data.comment_bank || []);
      } catch (e) {
        toast.error('Failed to load MHPS template');
      }
    })();
  }, []);

  useEffect(() => {
    if (currentAcademicYear) setSelectedYear(currentAcademicYear);
  }, [currentAcademicYear]);

  // ---------- load students for class ----------
  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    (async () => {
      try {
        const res = await axios.get(`${API}/students?class_id=${selectedClass}`);
        setStudents(res.data || []);
      } catch (e) {
        toast.error('Failed to load students');
      }
    })();
  }, [selectedClass]);

  // ---------- fetch report card payload ----------
  const fetchPayload = useCallback(async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/mhps/report-card/${selectedStudent}?term=${encodeURIComponent(selectedTerm)}&academic_year=${encodeURIComponent(selectedYear)}`
      );
      setPayload(res.data);
    } catch (e) {
      toast.error('Failed to load report card');
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, selectedTerm, selectedYear]);

  useEffect(() => { fetchPayload(); }, [fetchPayload]);

  // ---------- PDF export (US Legal 8.5 x 14) ----------
  const downloadPDF = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'in', [8.5, 14]);
      const pageW = 8.5, pageH = 14;
      let imgW = pageW;
      let imgH = (canvas.height * imgW) / canvas.width;
      if (imgH > pageH) { imgH = pageH; imgW = (canvas.width * imgH) / canvas.height; }
      const x = (pageW - imgW) / 2;
      pdf.addImage(imgData, 'JPEG', x, 0, imgW, imgH);
      const s = payload?.student || {};
      pdf.save(`${s.last_name || 'Student'}_${s.first_name || ''}_MHPS_${selectedTerm}_${selectedYear}.pdf`);
    } catch (e) {
      toast.error('PDF export failed');
    } finally {
      setDownloading(false);
    }
  };

  const selectorBar = (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <Label className="text-xs">Class (Grades 4-6)</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Student</Label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select student" /></SelectTrigger>
          <SelectContent>
            {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.last_name}, {s.first_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Term</Label>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Academic Year</Label>
        <Input className="w-32" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">MHPS Upper School Report Card</h1>
          <p className="text-sm text-muted-foreground">Grades 4-6 &middot; Mona Heights Primary School</p>
        </div>
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate &amp; Print</TabsTrigger>
          {(isAdmin || isTeacher) && <TabsTrigger value="entry">Data Entry</TabsTrigger>}
          {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* ---------------- GENERATE ---------------- */}
        <TabsContent value="generate" className="space-y-4">
          <Card className="p-4">
            {selectorBar}
            <div className="mt-4 flex gap-2">
              <Button onClick={downloadPDF} disabled={!payload || downloading}>
                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download PDF (US Legal)
              </Button>
            </div>
          </Card>

          {loading && <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}

          {payload && !loading && (
            <div className="overflow-auto bg-slate-200 p-6 flex justify-center">
              <div style={{ transformOrigin: 'top center' }}>
                <MHPSReportCardTemplate ref={printRef} data={payload} />
              </div>
            </div>
          )}
          {!payload && !loading && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Select a class, student, term and year to preview the report card.
            </Card>
          )}
        </TabsContent>

        {/* ---------------- DATA ENTRY ---------------- */}
        {(isAdmin || isTeacher) && (
          <TabsContent value="entry" className="space-y-4">
            <Card className="p-4">{selectorBar}</Card>
            {payload ? (
              <DataEntryForm
                payload={payload}
                settings={settings}
                commentBank={commentBank}
                selectedStudent={selectedStudent}
                term={selectedTerm}
                year={selectedYear}
                onSaved={fetchPayload}
              />
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Select a student to enter/edit report-card data.
              </Card>
            )}
          </TabsContent>
        )}

        {/* ---------------- SETTINGS ---------------- */}
        {isAdmin && (
          <TabsContent value="settings" className="space-y-4">
            <SettingsPanel
              settings={settings}
              commentBank={commentBank}
              onReload={async () => {
                const res = await axios.get(`${API}/mhps/report-template`);
                setSettings(res.data.mhps_settings);
                setCommentBank(res.data.comment_bank || []);
                setTemplate(res.data);
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// ============================================================
// DATA ENTRY FORM
// ============================================================
const DataEntryForm = ({ payload, settings, commentBank, selectedStudent, term, year, onSaved }) => {
  const rc = payload.report_card || {};
  const student = payload.student || {};
  const components = settings?.components || [];
  const coreSubjects = settings?.core_subjects || [];
  const ratingScale = settings?.rating_scale || [];
  const workEthics = settings?.work_ethics_criteria || [];
  const socialSkills = settings?.social_skills_criteria || [];
  const subjectDefs = settings?.subjects || [];

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm());

  function buildInitialForm() {
    const subjRows = {};
    (subjectDefs).forEach((sd) => {
      const existing = (rc.subjects || []).find((s) => s.name === sd.name) || {};
      subjRows[sd.name] = { ...existing, name: sd.name, is_core: sd.is_core };
    });
    const ach = {};
    coreSubjects.forEach((s) => {
      const e = (rc.achievement_standards || []).find((a) => a.subject === s) || {};
      ach[s] = e.percentage ?? '';
    });
    const perf = {};
    coreSubjects.forEach((s) => {
      const e = (rc.performance_task || []).find((p) => p.subject === s) || {};
      perf[s] = e.descriptor ?? '';
    });
    const beh = {};
    (rc.behavior_ratings || []).forEach((b) => { beh[`${b.category}::${b.criterion}`] = b.rating; });
    return {
      house: student.house || '',
      reading_level: student.reading_level || '',
      post_of_special_responsibility: student.post_of_special_responsibility || '',
      extra_curricular_activities: (student.extra_curricular_activities || []).join(', '),
      number_of_students_in_class: rc.number_of_students_in_class ?? '',
      position_in_class: rc.position_in_class ?? '',
      days_in_term: rc.days_in_term ?? '',
      days_absent: rc.days_absent ?? '',
      term_label: rc.term_label ?? '',
      report_period_label: rc.report_period_label ?? '',
      overall_average_override: rc.overall_average_override ?? '',
      additional_comments: rc.additional_comments ?? '',
      subjects: subjRows,
      achievement: ach,
      performance: perf,
      behavior: beh,
      selected_comments: new Set(rc.selected_comments || []),
    };
  }

  useEffect(() => { setForm(buildInitialForm()); }, [payload]);

  const setSubjScore = (name, key, val) => {
    setForm((f) => ({ ...f, subjects: { ...f.subjects, [name]: { ...f.subjects[name], [key]: val === '' ? '' : Number(val) } } }));
  };
  const setBeh = (cat, crit, val) => {
    setForm((f) => ({ ...f, behavior: { ...f.behavior, [`${cat}::${crit}`]: val } }));
  };
  const toggleComment = (id) => {
    setForm((f) => {
      const s = new Set(f.selected_comments);
      if (s.has(id)) s.delete(id); else s.add(id);
      return { ...f, selected_comments: s };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        term, academic_year: year,
        house: form.house,
        reading_level: form.reading_level,
        post_of_special_responsibility: form.post_of_special_responsibility,
        extra_curricular_activities: form.extra_curricular_activities.split(',').map((x) => x.trim()).filter(Boolean),
        number_of_students_in_class: form.number_of_students_in_class === '' ? null : Number(form.number_of_students_in_class),
        position_in_class: form.position_in_class,
        days_in_term: form.days_in_term === '' ? null : Number(form.days_in_term),
        days_absent: form.days_absent === '' ? null : Number(form.days_absent),
        term_label: form.term_label,
        report_period_label: form.report_period_label,
        overall_average_override: form.overall_average_override === '' ? null : Number(form.overall_average_override),
        additional_comments: form.additional_comments,
        subjects: Object.values(form.subjects),
        achievement_standards: coreSubjects.map((s) => ({ subject: s, percentage: form.achievement[s] === '' ? null : Number(form.achievement[s]) })),
        performance_task: coreSubjects.map((s) => ({ subject: s, descriptor: form.performance[s] })),
        behavior_ratings: [
          ...workEthics.map((c) => ({ category: 'work_ethics', criterion: c, rating: form.behavior[`work_ethics::${c}`] || '' })),
          ...socialSkills.map((c) => ({ category: 'social_skills', criterion: c, rating: form.behavior[`social_skills::${c}`] || '' })),
        ],
        selected_comments: Array.from(form.selected_comments),
      };
      await axios.put(`${API}/mhps/report-card/${selectedStudent}`, body);
      toast.success('Report card saved');
      onSaved && onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = 'text-sm';

  return (
    <div className="space-y-4">
      {/* Profile + meta */}
      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><Label className={fieldCls}>House</Label><Input value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value })} /></div>
        <div><Label className={fieldCls}>Reading Level</Label><Input value={form.reading_level} onChange={(e) => setForm({ ...form, reading_level: e.target.value })} /></div>
        <div><Label className={fieldCls}>Post of Special Responsibility</Label><Input value={form.post_of_special_responsibility} onChange={(e) => setForm({ ...form, post_of_special_responsibility: e.target.value })} /></div>
        <div><Label className={fieldCls}>Extra-Curricular (comma sep)</Label><Input value={form.extra_curricular_activities} onChange={(e) => setForm({ ...form, extra_curricular_activities: e.target.value })} /></div>
        <div><Label className={fieldCls}># Students in Class</Label><Input type="number" value={form.number_of_students_in_class} onChange={(e) => setForm({ ...form, number_of_students_in_class: e.target.value })} /></div>
        <div><Label className={fieldCls}>Position in Class</Label><Input value={form.position_in_class} onChange={(e) => setForm({ ...form, position_in_class: e.target.value })} /></div>
        <div><Label className={fieldCls}>Days in Term</Label><Input type="number" value={form.days_in_term} onChange={(e) => setForm({ ...form, days_in_term: e.target.value })} /></div>
        <div><Label className={fieldCls}>Days Absent</Label><Input type="number" value={form.days_absent} onChange={(e) => setForm({ ...form, days_absent: e.target.value })} /></div>
        <div><Label className={fieldCls}>Term Label</Label><Input value={form.term_label} onChange={(e) => setForm({ ...form, term_label: e.target.value })} placeholder="Easter and Summer Term, 2025" /></div>
        <div><Label className={fieldCls}>Report Period Label</Label><Input value={form.report_period_label} onChange={(e) => setForm({ ...form, report_period_label: e.target.value })} placeholder="January – June 2025" /></div>
        <div><Label className={fieldCls}>Overall Average Override (%)</Label><Input type="number" value={form.overall_average_override} onChange={(e) => setForm({ ...form, overall_average_override: e.target.value })} placeholder="auto" /></div>
      </Card>

      {/* Subject grades */}
      <Card className="p-4 overflow-x-auto">
        <h3 className="font-semibold mb-2">Subject Assessment Scores</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-1 text-left">Subject</th>
              {components.map((c) => <th key={c.key} className="border p-1">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {subjectDefs.map((sd) => (
              <tr key={sd.name}>
                <td className="border p-1 font-medium">{sd.name}{sd.is_core ? ' *' : ''}</td>
                {components.map((c) => {
                  const single = !sd.is_core && c.key !== 'class_tests_quizzes';
                  return (
                    <td key={c.key} className="border p-1">
                      <Input
                        type="number" className="h-8 w-16"
                        disabled={single}
                        value={form.subjects[sd.name]?.[c.key] ?? ''}
                        onChange={(e) => setSubjScore(sd.name, c.key, e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-1">* Core subject. Weighted Term Grade auto-calculates on save.</p>
      </Card>

      {/* Achievement + Performance */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Achievement Standards (%) &amp; Performance Task (core subjects)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {coreSubjects.map((s) => (
              <div key={s} className="flex items-center gap-2 mb-2">
                <Label className="w-32 text-sm">{s}</Label>
                <Input type="number" className="w-24" placeholder="%" value={form.achievement[s] ?? ''}
                  onChange={(e) => setForm({ ...form, achievement: { ...form.achievement, [s]: e.target.value } })} />
              </div>
            ))}
          </div>
          <div>
            {coreSubjects.map((s) => (
              <div key={s} className="flex items-center gap-2 mb-2">
                <Label className="w-32 text-sm">{s}</Label>
                <Input className="flex-1" placeholder="Performance descriptor" value={form.performance[s] ?? ''}
                  onChange={(e) => setForm({ ...form, performance: { ...form.performance, [s]: e.target.value } })} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Behavior */}
      <Card className="p-4 grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Work and Personal Ethics</h3>
          {workEthics.map((c) => (
            <div key={c} className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm">{c}</span>
              <Select value={form.behavior[`work_ethics::${c}`] || ''} onValueChange={(v) => setBeh('work_ethics', c, v)}>
                <SelectTrigger className="w-24 h-8"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>{ratingScale.map((r) => <SelectItem key={r.code} value={r.code}>{r.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold mb-2">Progress in Social Skills and Attitudes</h3>
          {socialSkills.map((c) => (
            <div key={c} className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm">{c}</span>
              <Select value={form.behavior[`social_skills::${c}`] || ''} onValueChange={(v) => setBeh('social_skills', c, v)}>
                <SelectTrigger className="w-24 h-8"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>{ratingScale.map((r) => <SelectItem key={r.code} value={r.code}>{r.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>

      {/* Comments */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Class Teacher&rsquo;s Comments</h3>
        <div className="space-y-1 mb-3">
          {commentBank.map((c) => (
            <label key={c.id} className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.selected_comments.has(c.id)} onCheckedChange={() => toggleComment(c.id)} />
              <span>{c.text}</span>
            </label>
          ))}
        </div>
        <Label className="text-sm">Additional Comments</Label>
        <Textarea value={form.additional_comments} onChange={(e) => setForm({ ...form, additional_comments: e.target.value })} rows={3} />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Report Card
        </Button>
      </div>
    </div>
  );
};

// ============================================================
// SETTINGS PANEL (Admin)
// ============================================================
const SettingsPanel = ({ settings, commentBank, onReload }) => {
  const [newComment, setNewComment] = useState('');
  const [houses, setHouses] = useState((settings?.houses || []).join(', '));
  const [principal, setPrincipal] = useState(settings?.principal_signature_block || '');
  const [gradeScale, setGradeScale] = useState(settings?.academic_grade_scale || []);
  const [bands, setBands] = useState(settings?.achievement_bands || []);
  const [workEthics, setWorkEthics] = useState((settings?.work_ethics_criteria || []).join('\n'));
  const [socialSkills, setSocialSkills] = useState((settings?.social_skills_criteria || []).join('\n'));
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    setHouses((settings?.houses || []).join(', '));
    setPrincipal(settings?.principal_signature_block || '');
    setGradeScale(settings?.academic_grade_scale || []);
    setBands(settings?.achievement_bands || []);
    setWorkEthics((settings?.work_ethics_criteria || []).join('\n'));
    setSocialSkills((settings?.social_skills_criteria || []).join('\n'));
  }, [settings]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    try { await axios.post(`${API}/mhps/comment-bank`, { text: newComment.trim() }); setNewComment(''); toast.success('Comment added'); onReload(); }
    catch { toast.error('Failed to add comment'); }
  };
  const editComment = async (id, text) => {
    try { await axios.put(`${API}/mhps/comment-bank/${id}`, { text }); toast.success('Comment updated'); onReload(); }
    catch { toast.error('Update failed'); }
  };
  const delComment = async (id) => {
    try { await axios.delete(`${API}/mhps/comment-bank/${id}`); toast.success('Comment deleted'); onReload(); }
    catch { toast.error('Delete failed'); }
  };

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await axios.put(`${API}/mhps/report-template/settings`, {
        houses: houses.split(',').map((x) => x.trim()).filter(Boolean),
        principal_signature_block: principal,
        academic_grade_scale: gradeScale,
        achievement_bands: bands,
        work_ethics_criteria: workEthics.split('\n').map((x) => x.trim()).filter(Boolean),
        social_skills_criteria: socialSkills.split('\n').map((x) => x.trim()).filter(Boolean),
      });
      toast.success('Settings saved');
      onReload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSavingCfg(false);
    }
  };

  const updBand = (i, field, val) => setBands((b) => b.map((x, idx) => idx === i ? { ...x, [field]: val } : x));

  return (
    <div className="space-y-4">
      {/* Comment bank */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Comment Bank ({commentBank.length})</h3>
        <div className="flex gap-2 mb-3">
          <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a new stock comment..." />
          <Button onClick={addComment}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
        <div className="space-y-2">
          {commentBank.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Input defaultValue={c.text} onBlur={(e) => { if (e.target.value !== c.text) editComment(c.id, e.target.value); }} className="text-sm" />
              <Button variant="ghost" size="icon" onClick={() => delComment(c.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Config */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">School-Configurable Settings</h3>
        <div><Label className="text-sm">Houses (comma separated)</Label><Input value={houses} onChange={(e) => setHouses(e.target.value)} /></div>
        <div><Label className="text-sm">Principal Signature Block</Label><Input value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Achievement Band Descriptions</Label>
            {bands.map((b, i) => (
              <div key={i} className="mb-2">
                <div className="text-xs font-medium">{b.band} ({b.min}-{b.max}%)</div>
                <Textarea rows={2} value={b.description} onChange={(e) => updBand(i, 'description', e.target.value)} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Work &amp; Ethics Criteria (one per line)</Label>
              <Textarea rows={8} value={workEthics} onChange={(e) => setWorkEthics(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Social Skills Criteria (one per line)</Label>
              <Textarea rows={8} value={socialSkills} onChange={(e) => setSocialSkills(e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm">Academic Grade Scale</Label>
          <div className="space-y-1">
            {gradeScale.map((g, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input className="w-16 h-8" type="number" value={g.min} onChange={(e) => setGradeScale((gs) => gs.map((x, idx) => idx === i ? { ...x, min: Number(e.target.value) } : x))} />
                <span>-</span>
                <Input className="w-16 h-8" type="number" value={g.max} onChange={(e) => setGradeScale((gs) => gs.map((x, idx) => idx === i ? { ...x, max: Number(e.target.value) } : x))} />
                <Input className="w-16 h-8" value={g.letter} onChange={(e) => setGradeScale((gs) => gs.map((x, idx) => idx === i ? { ...x, letter: e.target.value } : x))} />
                <Input className="flex-1 h-8" value={g.descriptor} onChange={(e) => setGradeScale((gs) => gs.map((x, idx) => idx === i ? { ...x, descriptor: e.target.value } : x))} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveConfig} disabled={savingCfg}>
            {savingCfg ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MHPSReportCardsPage;
