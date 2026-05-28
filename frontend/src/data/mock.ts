import type {
  ApiError,
  ConfirmImportResult,
  LoginResult,
  StudentApproval,
  StudentDiagnosis,
  StudentRegistrationResult,
  StudentResult,
  StudentStatus,
  TeacherClass,
  UploadPreview,
} from '../types';

const API_BASE = '/api';

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as ApiError & { data?: T };
  if (!res.ok) {
    throw new Error(body.error?.message ?? 'Request failed');
  }
  return body.data as T;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return readJson<LoginResult>(res);
}

export async function registerStudent(input: {
  username: string;
  password: string;
  studentNo: string;
}): Promise<StudentRegistrationResult> {
  const res = await fetch(`${API_BASE}/auth/register-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: input.username,
      password: input.password,
      student_no: input.studentNo,
    }),
  });
  return readJson<StudentRegistrationResult>(res);
}

export async function fetchStudentStatus(token: string): Promise<StudentStatus> {
  const res = await fetch(`${API_BASE}/student/me/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson<StudentStatus>(res);
}

export async function fetchTeacherClasses(token: string): Promise<TeacherClass[]> {
  const res = await fetch(`${API_BASE}/teacher/classes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson<TeacherClass[]>(res);
}

export async function fetchStudentApprovals(token: string): Promise<StudentApproval[]> {
  const res = await fetch(`${API_BASE}/teacher/student-approvals?status=pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson<StudentApproval[]>(res);
}

export async function approveStudent(token: string, studentId: number): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/teacher/student-approvals/${studentId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson<{ status: string; message: string }>(res);
}

export async function rejectStudent(token: string, studentId: number): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/teacher/student-approvals/${studentId}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: '教师审核拒绝' }),
  });
  return readJson<{ status: string; message: string }>(res);
}

export async function previewUpload(
  token: string,
  input: {
    classId: number;
    examName: string;
    file: File;
  }
): Promise<UploadPreview> {
  const form = new FormData();
  form.append('classId', String(input.classId));
  form.append('examName', input.examName);
  form.append('file', input.file);
  const res = await fetch(`${API_BASE}/teacher/uploads/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return readJson<UploadPreview>(res);
}

export async function confirmUpload(token: string, uploadId: number): Promise<ConfirmImportResult> {
  const res = await fetch(`${API_BASE}/teacher/uploads/${uploadId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ runDiagnosis: true }),
  });
  return readJson<ConfirmImportResult>(res);
}

export async function fetchStudentResults(token: string): Promise<StudentResult[]> {
  const res = await fetch(`${API_BASE}/student/me/results`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson<StudentResult[]>(res);
}

export async function fetchStudentDiagnosis(token: string, examId: number): Promise<StudentDiagnosis> {
  const res = await fetch(`${API_BASE}/student/me/diagnosis?examId=${examId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson<StudentDiagnosis>(res);
}
