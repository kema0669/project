# SDD Step 1: Architecture and Permission Boundaries

## Product Boundary

This project is a full-stack educational diagnosis MVP for resume and interview use. The product story should stay narrow and complete:

```text
Teacher imports a fixed score sheet.
The system validates and stores answer data.
The backend runs a DINA-based diagnosis.
Students log in and can only view their own results.
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
    API --> Diagnosis[DINA Diagnosis Service]
    API --> Recommend[Rule Recommendation Service]
    API --> DB[(SQLite)]
```

## Development Phases

| Step | Phase | Output |
| --- | --- | --- |
| 1 | SDD | Schema, API contract, Excel template, architecture docs. |
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

Cannot:

- upload to classes owned by another teacher,
- view another teacher's classes,
- bypass preview validation,
- confirm uploads with validation errors.

### Student

Can:

- log in as `student`,
- view their own exam scores,
- view their own knowledge mastery profile,
- view their own weak points,
- view their own learning recommendation.

Cannot:

- view another student's scores,
- query by arbitrary `studentId`,
- access teacher upload APIs,
- view class-level dashboards.

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
| `/teacher/classes` | teacher | Class list and latest diagnosis summary entry. |
| `/teacher/uploads` | teacher | Excel upload form. |
| `/teacher/uploads/:uploadId/preview` | teacher | Preview valid rows and errors. |
| `/teacher/classes/:classId/diagnosis` | teacher | Class diagnosis overview. |
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
