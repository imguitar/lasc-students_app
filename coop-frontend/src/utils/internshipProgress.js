const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAllDateKeysInRange = (start, end) => {
  const dateKeys = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (cursor <= last) {
    dateKeys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dateKeys;
};

export const calculateInternshipProgressByCheckins = ({ request, checkins = [], studentIds = [], studentNames = [] }) => {
  const internshipStartedStatuses = new Set(['ออกฝึกงาน', 'ฝึกงานเสร็จแล้ว']);
  if (!internshipStartedStatuses.has(String(request?.status || '').trim())) {
    return 0;
  }

  const start = toDate(request?.startDate || request?.details?.startDate);
  const end = toDate(request?.endDate || request?.details?.endDate);

  if (!start || !end || end < start) {
    return 0;
  }

  const rangeDateKeys = getAllDateKeysInRange(start, end);
  const rangeSet = new Set(rangeDateKeys);
  const totalDays = rangeDateKeys.length;

  if (totalDays === 0) {
    return 0;
  }

  const idCandidates = [
    request?.studentId,
    request?.student_code,
    request?.username,
    request?.email,
    request?.details?.student_info?.studentId,
    request?.details?.student_info?.email,
    ...studentIds,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const nameCandidates = [
    request?.studentName,
    request?.details?.student_info?.name,
    ...studentNames,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  const uniqueCheckedDays = new Set(
    checkins
      .filter((entry) => {
        const entryStudentId = String(entry.studentId || '').trim();
        const entryStudentName = String(entry.studentName || '').trim().toLowerCase();
        const entryDate = String(entry.date || '').trim();
        if (!entryDate || !rangeSet.has(entryDate)) return false;

        const sameById = idCandidates.length > 0 && idCandidates.includes(entryStudentId);
        const sameByName = nameCandidates.length > 0 && nameCandidates.includes(entryStudentName);
        const sameStudent = idCandidates.length === 0 && nameCandidates.length === 0 ? true : (sameById || sameByName);
        if (!sameStudent) return false;

        return true;
      })
      .map((entry) => entry.date)
  );

  const progress = Math.round((uniqueCheckedDays.size / totalDays) * 100);
  return Math.max(0, Math.min(100, progress));
};
