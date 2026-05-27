import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { 
    Users, 
    GraduationCap, 
    School, 
    CalendarCheck, 
    TrendingUp,
    UserCheck,
    UserX,
    Clock,
    BarChart3,
    Loader2,
    ArrowUpRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ icon: Icon, title, value, subtitle, color = 'primary', delay = 0 }) => {
    const colorMap = {
        primary: { bg: 'bg-primary/10', text: 'text-primary', accent: 'from-primary/80 to-primary/40' },
        success: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', accent: 'from-emerald-500/80 to-emerald-400/40' },
        warning: { bg: 'bg-amber-500/10', text: 'text-amber-600', accent: 'from-amber-500/80 to-amber-400/40' },
        danger: { bg: 'bg-red-500/10', text: 'text-red-600', accent: 'from-red-500/80 to-red-400/40' },
        secondary: { bg: 'bg-amber-500/10', text: 'text-amber-600', accent: 'from-amber-500/80 to-amber-400/40' },
        accent: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', accent: 'from-emerald-500/80 to-emerald-400/40' },
        destructive: { bg: 'bg-red-500/10', text: 'text-red-600', accent: 'from-red-500/80 to-red-400/40' },
    };
    
    const scheme = colorMap[color] || colorMap.primary;

    return (
        <div 
            className="stat-card relative overflow-hidden opacity-0 animate-fade-in"
            style={{ animationDelay: `${delay}ms` }}
            data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}
        >
            {/* Accent strip */}
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${scheme.accent} rounded-l-2xl`} />
            
            <div className="flex items-start justify-between pl-3">
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p>
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scheme.bg}`}>
                    <Icon className={`w-5 h-5 ${scheme.text}`} />
                </div>
            </div>
        </div>
    );
};

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentStudents, setRecentStudents] = useState([]);
    const [myClasses, setMyClasses] = useState([]);
    const { user, isAdmin, isTeacher, isParent } = useAuth();

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDashboardData = async () => {
        try {
            const requests = [
                axios.get(`${API}/stats/dashboard`),
                axios.get(`${API}/students`)
            ];
            if (isTeacher) {
                requests.push(axios.get(`${API}/classes`));
            }
            const results = await Promise.all(requests);
            setStats(results[0].data);
            const studentsData = results[1].data || [];
            setRecentStudents(studentsData.slice(0, 5));

            if (isTeacher && results[2]) {
                const classes = results[2].data || [];
                // attach student count per class
                const enriched = classes.map(c => ({
                    ...c,
                    student_count: studentsData.filter(s => s.class_id === c.id).length
                }));
                setMyClasses(enriched);
            }
        } catch (error) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div data-testid="dashboard-page">
            {/* Welcome Header */}
            <div className="page-header opacity-0 animate-fade-in">
                <h1>
                    Welcome back, {user?.name?.split(' ')[0]}
                </h1>
                <p>
                    {isAdmin && "Here's an overview of your school's performance."}
                    {isTeacher && "Here's what's happening in your classes today."}
                    {isParent && "Here's how your children are doing."}
                </p>
            </div>

            {/* Stats Grid */}
            {(isAdmin || isTeacher) && (
                <div className="bento-grid mb-6">
                    <StatCard 
                        icon={GraduationCap} 
                        title={isTeacher ? "My Students" : "Total Students"} 
                        value={stats?.total_students || 0}
                        subtitle={isTeacher ? "In your classes" : undefined}
                        color="primary"
                        delay={50}
                    />
                    <StatCard 
                        icon={School} 
                        title={isTeacher ? "My Classes" : "Total Classes"} 
                        value={stats?.total_classes || 0}
                        subtitle={isTeacher ? "Assigned to you" : undefined}
                        color="warning"
                        delay={100}
                    />
                    {!isTeacher && (
                        <StatCard 
                            icon={Users} 
                            title="Teachers" 
                            value={stats?.total_teachers || 0}
                            color="success"
                            delay={150}
                        />
                    )}
                    <StatCard 
                        icon={TrendingUp} 
                        title={isTeacher ? "Class Average" : "Average Grade"} 
                        value={`${stats?.average_grade || 0}%`}
                        subtitle={isTeacher ? "Across your students" : undefined}
                        color="primary"
                        delay={200}
                    />
                </div>
            )}

            {/* Today's Attendance (Admin/Teacher) */}
            {(isAdmin || isTeacher) && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3 text-foreground">
                        {isTeacher ? "Today's Attendance — My Classes" : "Today's Attendance"}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard 
                            icon={UserCheck} 
                            title="Present" 
                            value={stats?.today_present || 0}
                            color="success"
                            delay={250}
                        />
                        <StatCard 
                            icon={UserX} 
                            title="Absent" 
                            value={stats?.today_absent || 0}
                            color="danger"
                            delay={300}
                        />
                        <StatCard 
                            icon={Clock} 
                            title="Late" 
                            value={stats?.today_late || 0}
                            color="warning"
                            delay={350}
                        />
                    </div>
                </div>
            )}

            {/* Parent Stats */}
            {isParent && (
                <div className="bento-grid mb-6">
                    <StatCard 
                        icon={GraduationCap} 
                        title="My Children" 
                        value={stats?.children_count || 0}
                        color="primary"
                        delay={50}
                    />
                    <StatCard 
                        icon={UserCheck} 
                        title="Days Present" 
                        value={stats?.attendance_present || 0}
                        subtitle="This month"
                        color="success"
                        delay={100}
                    />
                    <StatCard 
                        icon={UserX} 
                        title="Days Absent" 
                        value={stats?.attendance_absent || 0}
                        subtitle="This month"
                        color="danger"
                        delay={150}
                    />
                    <StatCard 
                        icon={TrendingUp} 
                        title="Average Grade" 
                        value={`${stats?.average_grade || 0}%`}
                        color="primary"
                        delay={200}
                    />
                </div>
            )}

            {/* Teacher: My Classes panel */}
            {isTeacher && myClasses.length > 0 && (
                <Card 
                    className="rounded-2xl border-border shadow-sm opacity-0 animate-fade-in mb-6"
                    style={{ animationDelay: '380ms' }}
                    data-testid="teacher-my-classes-card"
                >
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <School className="w-5 h-5 text-primary" />
                            My Classes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {myClasses.map((c) => (
                                <div 
                                    key={c.id}
                                    className="p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
                                    data-testid={`teacher-class-${c.id}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">Grade {c.grade_level} · {c.academic_year}</p>
                                        </div>
                                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold whitespace-nowrap">
                                            {c.student_count} {c.student_count === 1 ? 'student' : 'students'}
                                        </span>
                                    </div>
                                    {c.room_number && (
                                        <p className="text-[11px] text-muted-foreground mt-1.5">Room {c.room_number}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Students */}
            {recentStudents.length > 0 && (
                <Card className="rounded-2xl border-border shadow-sm opacity-0 animate-fade-in" style={{ animationDelay: '400ms' }}>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <GraduationCap className="w-5 h-5 text-primary" />
                            {isParent ? 'My Children' : isTeacher ? 'My Students' : 'Recent Students'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {recentStudents.map((student, index) => (
                                <div 
                                    key={student.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary font-semibold text-sm">
                                        {student.first_name?.[0]}{student.last_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-foreground">{student.first_name} {student.last_name}</p>
                                        <p className="text-xs text-muted-foreground">Grade {student.grade_level}</p>
                                    </div>
                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium capitalize">
                                        {student.gender}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty state if no data */}
            {recentStudents.length === 0 && (
                <Card className="rounded-2xl border-border shadow-sm">
                    <CardContent className="py-16">
                        <div className="empty-state">
                            <GraduationCap className="empty-state-icon" />
                            <h3 className="text-base font-semibold mb-1.5">
                                {isTeacher ? 'No classes assigned yet' : 'No students yet'}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                {isParent 
                                    ? 'No children have been assigned to your account yet.' 
                                    : isTeacher
                                        ? 'You have not been assigned to any classes yet. Please contact your administrator.'
                                        : 'Start by adding students to the system.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
