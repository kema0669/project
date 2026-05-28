# SDD Step 1: REST API Contract

## API Principles

- Base path: `/api`
- Authentication: JWT bearer token.
- Roles: `teacher` and `student`.
- Students can only read their own result data.
- Teachers can access classes, uploads, and diagnosis data for classes they own.
- Preview upload does not write `responses` or `diagnosis_results`.
- Confirm upload writes responses and triggers diagnosis generation.

## Shared Response Shapes

### Success

```json
{
  "data": {}
}
```

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Excel contains invalid answer values.",
    "details": []
  }
}
```

Common error codes:

| Code | Meaning |
| --- | --- |
| `UNAUTHORIZED` | Missing or invalid token. |
| `FORBIDDEN` | Role or ownership check failed. |
| `VALIDATION_ERROR` | Request body or Excel rows failed validation. |
| `NOT_FOUND` | Resource does not exist or is not visible to the user. |
| `CONFLICT` | Duplicate import or conflicting data. |

## Auth

### `POST /api/auth/login`

Request:

```json
{
  "username": "teacher01",
  "password": "password123"
}
```

Response:

```json
{
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "username": "teacher01",
      "role": "teacher",
      "displayName": "Teacher Demo"
    }
  }
}
```

## Teacher APIs

### `GET /api/teacher/classes`

Returns classes owned by the current teacher.

Response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Class A",
      "studentCount": 10,
      "latestExamId": 1
    }
  ]
}
```

### `POST /api/teacher/uploads/preview`

Consumes `multipart/form-data`.

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `classId` | number | yes | Target class. |
| `examName` | string | yes | Exam name shown in UI. |
| `file` | file | yes | `.xlsx` fixed template. |

Behavior:

- Parse the first worksheet.
- Validate headers and row values.
- Store upload metadata and preview JSON only.
- Do not write `responses`.
- Do not run diagnosis.

Response:

```json
{
  "data": {
    "uploadId": 12,
    "status": "previewed",
    "summary": {
      "rowCount": 10,
      "validRowCount": 9,
      "errorRowCount": 1,
      "questionCount": 20
    },
    "rows": [
      {
        "rowNumber": 2,
        "studentNo": "S001",
        "studentName": "Alice",
        "answers": {
          "q1": 1,
          "q2": 0
        },
        "errors": []
      }
    ],
    "errors": [
      {
        "rowNumber": 5,
        "field": "q7",
        "message": "Answer must be 0 or 1."
      }
    ]
  }
}
```

### `POST /api/teacher/uploads/:uploadId/confirm`

Confirms a valid preview and imports it.

Request:

```json
{
  "runDiagnosis": true
}
```

Response:

```json
{
  "data": {
    "uploadId": 12,
    "examId": 3,
    "status": "confirmed",
    "importedResponses": 200,
    "diagnosedStudents": 10
  }
}
```

Rules:

- Reject confirmation if preview has validation errors.
- Reject confirmation if the upload does not belong to the current teacher.
- Upsert or replace responses only for the target exam and upload policy chosen by implementation.
- Generate `diagnosis_results` and `recommendations` after import.

### `GET /api/teacher/classes/:classId/diagnosis`

Returns class-level diagnosis overview.

Query:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `examId` | number | yes | Exam id. |

Response:

```json
{
  "data": {
    "classId": 1,
    "examId": 3,
    "knowledgePoints": [
      {
        "id": 1,
        "code": "kp_number",
        "name": "Number Sense",
        "averageMastery": 0.76,
        "weakStudentCount": 2
      }
    ],
    "students": [
      {
        "studentId": 1,
        "studentNo": "S001",
        "name": "Alice",
        "score": 16,
        "total": 20,
        "averageMastery": 0.81
      }
    ]
  }
}
```

## Student APIs

### `GET /api/student/me/results`

Returns the current student's own exam score list.

Response:

```json
{
  "data": [
    {
      "examId": 3,
      "examName": "DINA Diagnostic Quiz",
      "score": 16,
      "total": 20,
      "correctRate": 0.8,
      "createdAt": "2026-05-28T08:00:00.000Z"
    }
  ]
}
```

### `GET /api/student/me/diagnosis`

Query:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `examId` | number | yes | Exam id. |

Response:

```json
{
  "data": {
    "examId": 3,
    "student": {
      "id": 1,
      "studentNo": "S001",
      "name": "Alice"
    },
    "score": {
      "correct": 16,
      "total": 20,
      "correctRate": 0.8
    },
    "mastery": [
      {
        "knowledgePointId": 1,
        "code": "kp_number",
        "name": "Number Sense",
        "masteryProbability": 0.86,
        "level": "strong",
        "evidenceCorrect": 5,
        "evidenceTotal": 6
      }
    ],
    "weakPoints": [
      {
        "knowledgePointId": 3,
        "name": "Equation Basics",
        "masteryProbability": 0.42
      }
    ],
    "recommendation": "Prioritize Equation Basics and review related practice questions first.",
    "knowledgeGraph": {
      "nodes": [
        {
          "id": 1,
          "name": "Number Sense",
          "masteryProbability": 0.86
        }
      ],
      "edges": [
        {
          "from": 1,
          "to": 2,
          "type": "prerequisite"
        }
      ]
    }
  }
}
```

## Diagnosis Module Contract

The backend should expose this internal function shape, even if file names differ:

```ts
type DinaInput = {
  studentId: number;
  examId: number;
  qMatrix: Array<{
    questionId: number;
    knowledgePointId: number;
    weight: 0 | 1;
  }>;
  responses: Array<{
    questionId: number;
    isCorrect: 0 | 1;
  }>;
  knowledgePoints: Array<{
    id: number;
    code: string;
    name: string;
  }>;
};

type DinaOutput = Array<{
  studentId: number;
  examId: number;
  knowledgePointId: number;
  masteryProbability: number;
  evidenceCorrect: number;
  evidenceTotal: number;
}>;
```

For the MVP, a basic DINA-style implementation can combine:

- question correctness,
- related Q matrix rows,
- slip parameter default `0.2`,
- guess parameter default `0.2`,
- clamped mastery probability from `0.01` to `0.99`.

The exact formula must be documented in `docs/algorithm.md` during the implementation phase.
