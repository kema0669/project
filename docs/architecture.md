# SDD Step 1: Architecture and Permission Boundaries

## Product Boundary

This project is a full-stack educational diagnosis MVP for resume and interview use. The product story should stay narrow and complete:

```text
Teacher imports a fixed score sheet.
The system validates and stores answer data.
The backend runs a DINA-based diagnosis.
Students self-register with student_no, wait for teacher approval, then log in and can only view their own results.
```

## Non-Goals

The following features are explicitly postponed:

- OCR scan recognition,
- Word/PDF paper parsing,
- real LLM calls,
- automatic question generation,
- complex admin backend,
- school-level multi-tenancy,
- variable Excel schemas.

They may be documented as future work, but they should not enter the MVP implementation.

## Runtime Architecture

```mermaid
flowchart LR
    Teacher[Teacher Browser] --> Frontend[React + TypeScript Frontend]
    Student[Student Browser] --> Frontend
    Frontend --> API[Express + TypeScript API]
    API --> Auth[JWT Auth + RBAC Middleware]
    API --> Upload[Excel Parser + Validator]
    API --> Review[Student Binding Review]
    API --> Diagnosis[DINA Diagnosis Service]
    API --> Recommend[Rule Recommendation Service]
    API --> DB[(SQLite)]
```

## Development Phases

| Step | Phase | Output |
| --- | --- | --- |
| 1 | SDD | Schema, API contract, Excel template, architecture docs, student registration and binding design. |
| 2 | Scaffold | `frontend` and `backend` project skeleton. |
| 3 | TDD | Backend tests for auth, upload validation, RBAC, and diagnosis. |
| 4 | Backend | SQLite, seed data, JWT, upload flow, DINA, student APIs. |
| 5 | DDD Frontend | Teacher and student dashboards driven by the API contract. |
| 6 | E2E + Docs | Playwright flow, README, prompt log, development notes, screenshots. |

## Role Permissions

### Teacher

Can:

- log in as `teacher`,
- view classes they own,
- upload Excel scores for their own classes,
- preview upload validation results,
- confirm valid uploads,
- view class-level diagnosis summaries for their own classes.
- view pending student registration and binding applications for classes they own,
- approve or reject pending student account bindings.

Cannot:

- upload to classes owned by another teacher,
- view another teacher's classes,
- bypass preview validation,
- confirm uploads with validation errors.
- approve or reject students outside their own classes.

### Student

Can:

- register with `username`, `password`, and `student_no`,
- check their own binding and review status,
- log in as `student`,
- view their own exam scores only after approval,
- view their own knowledge mastery profile only after approval,
- view their own weak points only after approval,
- view their own learning recommendation only after approval.

Cannot:

- view another student's scores,
- query by arbitrary `studentId`,
- access teacher upload APIs,
- view class-level dashboards.
- view any score or diagnosis data while `pending` or `rejected`.

## Auth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as SQLite

    U->>FE: Enter username/password
    FE->>API: POST /api/auth/login
    API->>DB: Find user and password hash
    DB-->>API: User record
    API-->>FE: JWT + user role
    FE->>FE: Store token in app state/local storage
    FE->>API: Request protected API with Bearer token
    API->>API: Verify JWT and role
    API-->>FE: Protected data
```

## Student Registration and Teacher Review Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant FE as Frontend
    participant API as Backend API
    participant DB as SQLite
    participant T as Teacher

    S->>FE: Enter username/password/student_no
    FE->>API: POST /api/auth/register/student
    API->>DB: Find students.student_no
    alt student_no not found
        API-->>FE: VALIDATION_ERROR: 未找到该学号，请确认老师已上传成绩。
    else student_no already has user_id
        API-->>FE: CONFLICT: 该学号已绑定账号。
    else student_no exists and is unbound
        API->>DB: Create student user with status pending
        API->>DB: Set students.user_id
        API-->>FE: Pending review status
    end
    T->>FE: Open pending registrations
    FE->>API: GET /api/teacher/student-registrations?status=pending
    API->>DB: Query only teacher-owned classes
    API-->>FE: Pending applications
    T->>FE: Approve or reject
    FE->>API: POST approve/reject endpoint
    API->>DB: Update users.status
    API-->>FE: Updated status
```

Review status behavior:

- `pending`: student can log in and call `/api/student/me/binding-status`, but cannot view results.
- `approved`: student can view only the results linked through their own `students.user_id`.
- `rejected`: student can log in and see the rejected status, but cannot view results.

## Teacher Upload Flow

```mermaid
sequenceDiagram
    participant T as Teacher
    participant FE as Frontend
    participant API as Backend API
    participant DB as SQLite
    participant D as Diagnosis Service

    T->>FE: Select class and Excel file
    FE->>API: POST /api/teacher/uploads/preview
    API->>API: Parse first worksheet
    API->>API: Validate required columns and q1-q20
    API->>DB: Save upload preview payload
    API-->>FE: Row preview and errors
    T->>FE: Confirm valid upload
    FE->>API: POST /api/teacher/uploads/:id/confirm
    API->>DB: Write exam/questions/responses
    API->>D: Run DINA diagnosis
    D-->>API: Mastery probabilities
    API->>DB: Save diagnosis and recommendations
    API-->>FE: Import summary
```

## Student Result Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant FE as Frontend
    participant API as Backend API
    participant DB as SQLite

    S->>FE: Open student dashboard
    FE->>API: GET /api/student/me/results
    API->>API: Require user.status = approved
    API->>API: Resolve student from JWT
    API->>DB: Query own scores only
    DB-->>API: Score list
    API-->>FE: Score list
    FE->>API: GET /api/student/me/diagnosis?examId=3
    API->>API: Enforce current student ownership
    API->>DB: Query own diagnosis only
    DB-->>API: Mastery and recommendation
    API-->>FE: Diagnosis payload
```

## Frontend Route Contract

| Route | Role | Purpose |
| --- | --- | --- |
| `/login` | public | Shared login page. |
| `/register/student` | public | Student self-registration with `student_no`. |
| `/teacher/classes` | teacher | Class list and latest diagnosis summary entry. |
| `/teacher/uploads` | teacher | Excel upload form. |
| `/teacher/uploads/:uploadId/preview` | teacher | Preview valid rows and errors. |
| `/teacher/classes/:classId/diagnosis` | teacher | Class diagnosis overview. |
| `/teacher/student-registrations` | teacher | Pending student account binding review. |
| `/student/status` | student | Pending/rejected/approved binding status page. |
| `/student/results` | student | Student score list. |
| `/student/diagnosis/:examId` | student | Mastery chart, weak points, recommendation. |

## Backend Module Contract

Suggested module boundaries:

| Module | Responsibility |
| --- | --- |
| `auth` | Login, password hashing, JWT issue/verify. |
| `rbac` | Role and ownership middleware. |
| `db` | SQLite connection, migrations/schema creation. |
| `seed` | Demo teacher, students, class, questions, Q matrix. |
| `excel` | `.xlsx` parsing and row validation. |
| `uploads` | Preview and confirm workflow. |
| `studentRegistration` | Student self-registration, student_no binding, pending status query. |
| `studentReview` | Teacher-owned pending application list, approve, and reject actions. |
| `diagnosis` | DINA input building and mastery calculation. |
| `recommendations` | Rule-based advice from weak knowledge points. |
| `routes` | Express route registration. |

## Recommendation Rule for MVP

Use a deterministic rule first:

```text
mastery < 0.60:
  weak point, recommend reviewing this knowledge point first
0.60 <= mastery < 0.80:
  medium point, recommend targeted practice
mastery >= 0.80:
  strong point, recommend consolidation
```

This is enough for the basic requirement. Real LLM generation can be listed as future work.

## Quality Gates

Each implementation phase should report:

- completed work,
- changed files,
- commands run,
- test result,
- remaining risks.

Before moving beyond SDD, the project should have these four documents:

- `docs/schema.md`
- `docs/api.md`
- `docs/excel-template.md`
- `docs/architecture.md`
