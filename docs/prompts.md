# Core Prompt Log

This document records the staged prompts used to build the resume-oriented MVP. The key control idea was to avoid asking the AI agent to "build everything" in one message; each prompt fixed one phase, one output type, and one boundary.

## Step 1: SDD Modeling

### Prompt

```text
You are a full-stack engineer. Based on the intelligent cognitive diagnosis platform requirements, do not write business code yet.

Please complete the SDD design documents:
1. MVP scope
2. SQLite database schema
3. Fixed Excel upload template
4. REST API contract
5. Teacher/student permission boundary
6. DINA diagnosis input/output contract

Output to docs/schema.md, docs/api.md, docs/excel-template.md, docs/architecture.md.
Do not implement OCR, PDF, Word parsing, multi-tenant school management, or a complex admin console.
Only design around the loop: teacher uploads scores, student views diagnosis.
```

### Note

The intent was to lock the product boundary before code generation. The main correction was narrowing the earlier broad multi-subject/OCR direction back to a fixed-template diagnosis MVP.

## Step 2: Scaffold Calibration

### Prompt

```text
Now enter Step 2: project scaffold calibration.

Read docs/schema.md, docs/api.md, docs/excel-template.md, docs/architecture.md, and the existing frontend/backend directories.

The goal is not to rebuild the project, but to align the current scaffold with the SDD documents.

Please:
1. Check whether frontend/backend match React + TypeScript, Node.js + Express + TypeScript, SQLite.
2. Check package.json, startup scripts, and test configuration.
3. Add missing directories or scripts if needed.
4. Do not implement login, upload, or DINA business logic.
5. Update README.md so the project returns to teacher portal + student portal + Excel upload + diagnosis visualization MVP.
```

### Note

The intent was to avoid throwing away existing code while correcting project direction. The agent found the stack was mostly present, then added build/lint/check scripts and rewrote the README positioning.

## Step 3: TDD Contract Tests

### Prompt

```text
Start Step 3: TDD.

Write tests first. Do not implement the business logic yet.

Cover:
1. Login distinguishes teacher and student.
2. Students cannot access other students' diagnosis.
3. Teachers can upload Excel and receive a preview.
4. Missing Excel columns return validation errors.
5. q1-q20 only allow 0 or 1.
6. Preview does not write to the database.
7. Confirm writes responses and creates diagnosis.
8. DINA outputs mastery probabilities and evidence counts.
```

### Note

The intent was to create red tests that represented the real MVP acceptance criteria. A useful correction was changing old "long-table Excel" expectations into the fixed `student_no` + `q1-q20` template.

## Step 4: Backend Implementation

### Prompt

```text
Now enter Step 4: implement backend core features so Step 3 MVP contract tests pass.

Do not expand into OCR/PDF/Word or a complex admin backend.
Only implement schema, seed data, auth/RBAC, Excel preview/confirm, DINA evidence output, and student personal result APIs.
```

### Note

The intent was to turn TDD red tests green with the smallest useful backend implementation. A key challenge was preserving old demo tests while adding new MVP tables, so the implementation used compatible table additions and seed data.

## Step 5: DDD Frontend

### Prompt

```text
Start the next step.

Implement the frontend DDD page flow:
- shared login page
- teacher dashboard
- Excel upload preview and confirm
- student result dashboard
- mastery radar chart
- weak points and recommendations

Use the real MVP backend APIs and keep the interface simple, professional, and close to an education SaaS product.
```

### Note

The intent was to replace the old single-page student selector with a product-like teacher/student portal. The agent kept React/Vite/ECharts and avoided adding a router library to keep the MVP small.

## Step 6: E2E and Delivery Docs

### Prompt

```text
Continue to the next step.

Complete integration tests and delivery documents:
1. E2E test for teacher login -> Excel preview -> confirm -> student login -> diagnosis.
2. README with project scope, stack, run commands, test accounts, Excel template, API summary.
3. docs/prompts.md with at least 5 staged prompts and notes.
4. docs/development-notes.md explaining how the education problem became technical tasks and how AI collaboration was controlled.
```

### Note

The intent was to make the project presentable, not just runnable. The browser automation tool failed in the local Windows sandbox, so the verification emphasis shifted to executable backend E2E plus build/lint/test commands.

## Extension Step 1: Student Registration Binding Design

### Prompt

```text
Continue developing the existing intelligent cognitive diagnosis platform.

New feature: students can register accounts by entering username, password, and student_no.
The backend must bind the account to an existing student score record by student_no.
The student account must be pending until a teacher approves it.

Only update design documents first:
1. docs/schema.md
2. docs/api.md
3. docs/architecture.md

Design users.status, students.user_id, student_no binding rules, teacher approval APIs, and permission boundaries.
Do not implement backend logic, frontend pages, email verification, SMS verification, OCR, PDF, Word parsing, or a complex admin backend.
```

### Note

The intent was to keep the new feature small and interview-friendly. The important design choice was using `student_no` plus teacher approval instead of fuzzy name matching or external verification.

## Extension Step 2: Student Registration TDD And Implementation

### Prompt

```text
Now enter the TDD and backend implementation stages for student registration and teacher approval.

First write backend tests for:
1. student_no exists and is unbound -> create pending account
2. student_no missing -> clear validation error
3. student_no already bound -> conflict
4. pending/rejected students cannot view results
5. teacher can list, approve, and reject pending applications
6. approved student can view only their own results
7. non-teacher users cannot review applications

Then implement only the backend logic needed to make those tests pass.
Do not rebuild the project, remove Excel upload, add OCR/PDF/Word parsing, add email/SMS verification, or introduce real LLM calls.
```

### Note

The red tests prevented the implementation from drifting into UI or admin-system work. The backend kept compatibility aliases for earlier endpoint names while documenting `/api/auth/register-student` and `/api/teacher/student-approvals` as the main API.

## Extension Step 3: Frontend And E2E Delivery

### Prompt

```text
Implement the frontend pages for the student registration and teacher approval flow.

Student side:
- registration page with username, password, student_no
- pending waiting page
- rejected status page
- approved students enter the existing result and diagnosis page

Teacher side:
- pending approval list
- approve button
- reject button
- success/failure feedback

Then add E2E coverage for student registration, pending block, teacher approval, approved access, rejection block, and cross-student access denial.
Keep React + TypeScript and the existing education SaaS style.
```

### Note

The frontend was added inside the existing single-app structure instead of introducing a new router or rebuilding the UI. The E2E test stayed API-level because the project already used Vitest + supertest and had no Playwright setup.
