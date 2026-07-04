import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * useDefaultAcademicYear — returns the system-wide current academic year
 * (set by superuser via /schools/{id}/academic-years/{year}/set-current) plus
 * the list of enabled years for dropdowns.
 *
 * Optionally, pass in your local `selectedYear` state and its setter, and this
 * hook will auto-set it to the current AY when it becomes available (once).
 *
 * Usage:
 *     const [year, setYear] = useState('');
 *     const { currentAcademicYear, academicYears } = useDefaultAcademicYear(year, setYear);
 */
export const useDefaultAcademicYear = (selected, setSelected) => {
    const { currentAcademicYear, academicYears } = useAuth();

    useEffect(() => {
        if (!setSelected) return;
        if (!currentAcademicYear) return;
        // Only auto-set once, when local state is empty / falsy
        if (!selected) {
            setSelected(currentAcademicYear);
        }
    }, [currentAcademicYear, selected, setSelected]);

    return {
        currentAcademicYear,
        academicYears: academicYears?.length ? academicYears : [currentAcademicYear].filter(Boolean),
    };
};

export default useDefaultAcademicYear;
