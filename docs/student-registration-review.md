# Student Registration And Teacher Review

## Scope

This phase adds the resume-oriented account binding loop:

```text
Student registers with username/password/student_no
-> backend matches student_no against imported student records
-> account is created as pending
-> teacher reviews pending applications
-> approved students can view their own results
-> rejected students remain blocked
```

Out of scope: email verification, SMS verification, name matching, admin backend, OCR, Word/PDF parsing, and real LLM calls.

## Main APIs

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register-student` | public | Student self-registration with `student_no`. |
| `GET` | `/api/student/me/status` | student | Current student's binding and review status. |
| `GET` | `/api/teacher/student-approvals` | teacher | Pending student binding applications. |
| `POST` | `/api/teacher/student-approvals/:studentId/approve` | teacher | Approve a pending application. |
| `POST` | `/api/teacher/student-approvals/:studentId/reject` | teacher | Reject a pending application. |

Compatibility aliases are also kept for earlier tests:

- `/api/auth/register/student`
- `/api/student/me/binding-status`
- `/api/teacher/student-registrations`

## Permission Rules

- `pending` students can log in and view their review status, but cannot view scores or diagnosis.
- `approved` students can view only the result data linked to their own `student_no`.
- `rejected` students can log in and view rejected status, but cannot view scores or diagnosis.
- Only teachers can view, approve, or reject student applications.
- Student-facing result APIs must resolve the student from the login token, not from arbitrary client input.

## E2E Coverage

The E2E test is:

```text
backend/tests/student-registration-review.e2e.test.ts
```

It covers:

1. Student registration with `student_no`.
2. Pending status after registration.
3. Pending student result/diagnosis access is blocked.
4. Teacher can see pending applications.
5. Teacher can approve a student.
6. Approved student can log in again and view own results and diagnosis.
7. Teacher can reject a student and rejected student remains blocked.
8. Student cannot read another student's data through arbitrary student routes.

## Run

Backend tests:

```bash
npm.cmd --prefix backend test
```

Frontend build:

```bash
npm.cmd --prefix frontend run build
```

Full local app:

```bash
npm.cmd start
```

## Demo Accounts

- Teacher: `teacher01` / `password123`
- Existing demo student: `stu001` / `password123`

For self-registration demos, first use an unbound `student_no`. In tests this is prepared by clearing bindings for `S001`, `S002`, and `S003` inside the in-memory database.
