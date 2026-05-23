import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
    Loader2, ArrowLeft, GraduationCap, CalendarCheck, BookOpen,
    Heart, AlertTriangle, FileText, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const initials = (first, last) => `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase() || '?';

const monthLabel = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function StudentProfilePage() {
    const { studentId } = useParams();
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(null);
    const [gradebook, setGradebook] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [healthRecord, setHealthRecord] = useState(null);
    const [discipline, setDiscipline] = useState([]);

    useEffect(() => {
        if (!studentId) return;
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const auth = { headers: { Authorization: `Bearer ${token}` } };
            const month = new Date().toISOString().slice(0, 7);
            const [s, g, a, h, d, summary] = await Promise.allSettled([
                axios.get(`${API}/students/${studentId}`, auth),
                axios.get(`${API}/gradebook?student_id=${studentId}`, auth),
                axios.get(`${API}/attendance?student_id=${studentId}`, auth),
                axios.get(`${API}/health/${studentId}`, auth),
                axios.get(`${API}/discipline`, auth),
                axios.get(`${API}/students/${studentId}/attendance/summary?month=${month}`, auth),
            ]);
            if (s.status === 'fulfilled') setStudent(s.value.data);
            else throw s.reason;
            if (g.status === 'fulfilled') setGradebook(g.value.data);
            if (a.status === 'fulfilled') setAttendance(a.value.data);
            if (h.status === 'fulfilled') setHealthRecord(h.value.data);
            if (d.status === 'fulfilled') {
                setDiscipline((d.value.data || []).filter((i) => i.student_id === studentId));
            }
            if (summary.status === 'fulfilled') setAttendanceSummary(summary.value.data);
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Failed to load student profile');
        } finally {
            setLoading(false);
        }
    };

    const guardians = useMemo(() => student?.family_members || [], [student]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]" data-testid="student-profile-loading">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <h2 className="text-xl font-medium">Student not found</h2>
                <Link to="/students" className="text-primary hover:underline mt-3 inline-block">Back to students</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="student-profile-page">
            <Link to="/students" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground" data-testid="back-to-students">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to students
            </Link>

            {/* Header */}
            <Card className="rounded-2xl">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <Avatar className="w-24 h-24 text-2xl">
                            {student.photo_url ? <AvatarImage src={student.photo_url} alt={student.first_name} /> : null}
                            <AvatarFallback className="bg-violet-100 text-violet-700 font-bold text-xl">
                                {initials(student.first_name, student.last_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold">
                                {student.first_name} {student.middle_name} {student.last_name}
                            </h1>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {student.student_id ? <Badge variant="outline">ID: {student.student_id}</Badge> : null}
                                {student.gender ? <Badge variant="outline">{student.gender}</Badge> : null}
                                {student.age ? <Badge variant="outline">Age {student.age}</Badge> : null}
                                {student.house ? <Badge variant="outline">{student.house}</Badge> : null}
                                {student.enrollment_status ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 capitalize">{student.enrollment_status}</Badge>
                                ) : null}
                                {attendanceSummary?.below_threshold ? (
                                    <Badge className="bg-rose-100 text-rose-800" data-testid="attendance-warning-badge">
                                        Attendance {attendanceSummary.percent_present}%
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full md:w-auto">
                    <TabsTrigger value="overview" data-testid="tab-overview"><GraduationCap className="w-4 h-4 mr-1.5" />Overview</TabsTrigger>
                    <TabsTrigger value="grades" data-testid="tab-grades"><BookOpen className="w-4 h-4 mr-1.5" />Grades</TabsTrigger>
                    <TabsTrigger value="attendance" data-testid="tab-attendance"><CalendarCheck className="w-4 h-4 mr-1.5" />Attendance</TabsTrigger>
                    <TabsTrigger value="health" data-testid="tab-health"><Heart className="w-4 h-4 mr-1.5" />Health</TabsTrigger>
                    <TabsTrigger value="discipline" data-testid="tab-discipline"><AlertTriangle className="w-4 h-4 mr-1.5" />Discipline</TabsTrigger>
                    <TabsTrigger value="documents" data-testid="tab-documents"><FileText className="w-4 h-4 mr-1.5" />Documents</TabsTrigger>
                </TabsList>

                {/* OVERVIEW */}
                <TabsContent value="overview">
                    <Card className="rounded-2xl">
                        <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Personal</h3>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><dt className="text-muted-foreground">Date of birth</dt><dd>{student.date_of_birth || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd>{student.student_phone || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{student.student_email || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-muted-foreground">Address</dt><dd className="text-right">{student.address_line1 || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-muted-foreground">Emergency</dt><dd>{student.emergency_contact || '—'}</dd></div>
                                </dl>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Guardians</h3>
                                {guardians.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No guardians recorded.</p>
                                ) : (
                                    <ul className="space-y-2 text-sm">
                                        {guardians.map((g, idx) => (
                                            <li key={g.id || idx} className="p-3 rounded-lg bg-muted/30 border">
                                                <p className="font-medium">{g.first_name} {g.last_name} <span className="text-xs text-muted-foreground">({g.relationship})</span></p>
                                                {g.email ? <p className="text-xs text-muted-foreground">{g.email}</p> : null}
                                                {g.cell_phone ? <p className="text-xs text-muted-foreground">{g.cell_phone}</p> : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* GRADES */}
                <TabsContent value="grades">
                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle>Recent gradebook entries</CardTitle></CardHeader>
                        <CardContent>
                            {gradebook.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">No grades recorded yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-2 font-medium">Term</th>
                                                <th className="text-left p-2 font-medium">Year</th>
                                                <th className="text-left p-2 font-medium">Overall</th>
                                                <th className="text-left p-2 font-medium">Grade</th>
                                                <th className="text-left p-2 font-medium">Locked</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gradebook.map((g) => (
                                                <tr key={g.id} className="border-b last:border-0">
                                                    <td className="p-2">{g.term}</td>
                                                    <td className="p-2">{g.academic_year}</td>
                                                    <td className="p-2">{g.overall_score}</td>
                                                    <td className="p-2"><Badge>{g.overall_grade}</Badge></td>
                                                    <td className="p-2">{g.is_locked ? <Badge className="bg-amber-100 text-amber-800">Locked</Badge> : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ATTENDANCE */}
                <TabsContent value="attendance">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>{monthLabel(new Date())} — Monthly summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {attendanceSummary ? (
                                <div className="grid md:grid-cols-5 gap-3 mb-4">
                                    <StatBlock label="Present" value={attendanceSummary.present} color="emerald" />
                                    <StatBlock label="Absent" value={attendanceSummary.absent} color="rose" />
                                    <StatBlock label="Late" value={attendanceSummary.late} color="amber" />
                                    <StatBlock label="Excused" value={attendanceSummary.excused} color="sky" />
                                    <StatBlock label="% Present" value={`${attendanceSummary.percent_present}%`} color={attendanceSummary.below_threshold ? 'rose' : 'emerald'} />
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No attendance summary available.</p>
                            )}
                            {attendance.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">No attendance records.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50"><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Status</th></tr></thead>
                                        <tbody>
                                            {attendance.slice(0, 30).map((a) => (
                                                <tr key={a.id} className="border-b last:border-0">
                                                    <td className="p-2">{a.date}</td>
                                                    <td className="p-2 capitalize">{a.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HEALTH */}
                <TabsContent value="health">
                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle>Health record</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {healthRecord ? (
                                <>
                                    <Section title="Vaccinations" items={healthRecord.vaccinations} renderItem={(v) => `${v.name} — ${v.date}`} />
                                    <Section title="Allergies" items={healthRecord.allergies} renderItem={(a) => `${a.allergen} (${a.severity}): ${a.reaction}`} />
                                    <Section title="Conditions" items={healthRecord.conditions} renderItem={(c) => `${c.name} (${c.diagnosis_date || 'no date'})`} />
                                    <Section title="Medications" items={healthRecord.medications} renderItem={(m) => `${m.name} ${m.dosage || ''} ${m.frequency || ''}`} />
                                    <Section title="Visits" items={healthRecord.visits} renderItem={(v) => `${v.date}: ${v.reason}`} />
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground py-6 text-center">No health record.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DISCIPLINE */}
                <TabsContent value="discipline">
                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle>Discipline history</CardTitle></CardHeader>
                        <CardContent>
                            {discipline.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">No incidents recorded.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {discipline.map((d) => (
                                        <li key={d.id} className="p-4 rounded-xl border bg-muted/30">
                                            <div className="flex items-center justify-between mb-1">
                                                <Badge className={d.type === 'Major' ? 'bg-rose-100 text-rose-800' : d.type === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}>{d.type}</Badge>
                                                <span className="text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm font-medium">{d.description}</p>
                                            {d.action_taken ? <p className="text-xs text-muted-foreground mt-1">Action: {d.action_taken}</p> : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DOCUMENTS */}
                <TabsContent value="documents">
                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground py-8 text-center">
                                Document storage coming soon. Use Import/Export or report-card generation in the meantime.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

const StatBlock = ({ label, value, color }) => {
    const map = {
        emerald: 'bg-emerald-100 text-emerald-800',
        rose: 'bg-rose-100 text-rose-800',
        amber: 'bg-amber-100 text-amber-800',
        sky: 'bg-sky-100 text-sky-800',
        violet: 'bg-violet-100 text-violet-800',
    };
    return (
        <div className={`rounded-xl p-3 ${map[color] || 'bg-muted'}`}>
            <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
            <p className="text-xl font-bold">{value}</p>
        </div>
    );
};

const Section = ({ title, items, renderItem }) => (
    <div>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
        {items && items.length > 0 ? (
            <ul className="space-y-1 text-sm">
                {items.map((it, i) => <li key={it.id || i} className="text-foreground">• {renderItem(it)}</li>)}
            </ul>
        ) : (
            <p className="text-xs text-muted-foreground">None recorded.</p>
        )}
    </div>
);
