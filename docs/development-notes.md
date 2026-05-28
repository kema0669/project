# Development Notes

## From Education Problem To Technical Tasks

The original education problem is not "draw a chart"; it is helping teachers and students understand which knowledge points are likely mastered after a test. I converted that problem into three technical objects: the Q matrix, the X matrix, and a diagnosis result. The Q matrix defines which knowledge point each question tests. The X matrix records whether a student answered each question correctly. The diagnosis result turns those two matrices into a probability profile for each knowledge point.

For a resume MVP, I deliberately kept the product loop small. The teacher logs in, uploads a fixed Excel score template, previews validation errors, confirms the import, and the backend runs a DINA-based diagnosis. The student logs in afterward and only sees their own score, mastery visualization, weak points, and learning recommendation. This is much easier to explain in an interview than a half-finished OCR/PDF parser, and it still shows full-stack engineering, permissions, data validation, algorithm integration, and visualization.

The system was therefore split into contracts before code. The database schema defines users, classes, students, questions, Q matrix rows, responses, uploads, diagnosis results, and recommendations. The API contract defines auth, teacher upload preview/confirm, and student personal result endpoints. The Excel contract fixes the upload format to `student_no`, `student_name`, `class_name`, `exam_name`, and `q1` to `q20`, which makes validation deterministic.

## Why student_no Plus Teacher Approval

For the student self-registration extension, I chose `student_no + teacher approval` because it matches the actual source of truth in this MVP: the teacher-uploaded score sheet. The score data already contains a stable student number, so the system can bind a login account to an existing student record without asking for extra personal data.

I did not use name matching because names are not unique and are easy to mistype. A fuzzy name match would create security and data-quality risks: one student might accidentally bind another student's score record. I also did not add email or SMS verification because the assignment does not require a real identity provider, and those features would add infrastructure work without improving the core diagnosis story. A complex admin approval system was also avoided because the project only needs one practical review action: the teacher who owns the class approves or rejects the student binding.

This keeps the project easy to explain in interviews: the teacher controls the uploaded academic records, students request access by `student_no`, and the teacher confirms whether the account should see that record.

## AI Collaboration Problems And Fixes

The first typical issue was scope drift. The project previously grew toward multi-subject analysis, Word/PDF parsing, and AI-assisted paper drafts. Those ideas are interesting, but they made the resume story too wide. I corrected the AI agent by adding explicit non-goals: no OCR, no Word/PDF parsing, no multi-tenant school backend, no real LLM call in the basic MVP.

The second issue was phase mixing. AI agents tend to implement UI, database, and tests together when given a broad prompt. I controlled this by using SDD, then scaffold calibration, then TDD tests, then backend implementation, then frontend DDD, then E2E/docs. Each prompt said what not to do yet. This made the output easier to review and gave the Git history a cleaner story.

The third issue was compatibility with existing code. The repository already had older multi-subject tables and tests. Instead of deleting everything, I used compatible additions: new MVP tables were added while old tests remained green. This preserved working code and still allowed the new teacher/student Excel diagnosis flow to pass its own tests.

## How AI Improves Algorithm Engineering Efficiency

For algorithm engineers, AI is most useful when the engineer controls the interfaces and evaluation criteria. In this project, the AI was not asked to invent a vague "smart diagnosis system"; it was given Q matrix, X matrix, DINA input/output types, validation rules, and test cases. That turned the AI from a code generator into an implementation accelerator.

The most valuable pattern was asking for tests before implementation. Once the tests expressed login permissions, Excel validation, preview-no-write behavior, confirm import, and DINA evidence counts, the backend work became concrete. The AI could implement quickly, while the tests protected the core behavior from regressions.

The final lesson is that AI helps most when the human keeps the product boundary sharp. A small, complete, deployed system with permissions, upload validation, diagnosis, visualization, and documentation is more convincing than a large unfinished demo. This project is intentionally built around that principle.
