import type {
  ApiError,
  ConfirmImportResult,
  LoginResult,
  StudentDiagnosis,
  StudentResult,
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

export async function fetchTeacherClasses(token: string): Promise<TeacherClass[]> {
  const res = await fetch(`${API_BASE}/teacher/classes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson<TeacherClass[]>(res);
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
