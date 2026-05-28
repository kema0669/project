# REST API Contract

## Principles

- Base path: `/api`
- Authentication: bearer token returned by `POST /api/auth/login`
- Roles: `teacher` and `student`
- Student result APIs require `users.status = 'approved'`
- Teachers can only review students in their own classes
- Upload preview does not write score/diagnosis records
- Upload confirm writes responses and generates diagnosis

## Error Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "未找到该学号，请确认老师已上传成绩。",
    "details": []
  }
}
```

Common codes:

| Code | Meaning |
| --- | --- |
| `UNAUTHORIZED` | Missing or invalid token. |
| `FORBIDDEN` | Role, status, or ownership check failed. |
| `VALIDATION_ERROR` | Request body or uploaded rows failed validation. |
| `NOT_FOUND` | Resource does not exist or is not visible to the user. |
| `CONFLICT` | Username or `student_no` binding conflict. |

## Auth APIs

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
      "status": "approved",
      "displayName": "Teacher Demo"
    }
  }
}
```

### `POST /api/auth/register-student`

Student self-registration. The backend matches `student_no` against existing student records imported or seeded by teachers.

Request:

```json
{
  "username": "new_student",
  "password": "password123",
  "student_no": "S001"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": 21,
      "username": "new_student",
      "role": "student",
      "status": "pending"
    },
    "binding": {
      "studentId": 1,
      "studentNo": "S001",
      "studentName": "张三",
      "status": "pending"
    },
    "message": "注册成功，等待老师审核。"
  }
}
```

Rules:

- If `student_no` does not exist, return `VALIDATION_ERROR`: `未找到该学号，请确认老师已上传成绩。`
- If `student_no` already has `students.user_id`, return `CONFLICT`: `该学号已绑定账号。`
- If `username` already exists, return `CONFLICT`: `用户名已存在。`
- The endpoint is public but can only create `student` users with `status = 'pending'`.

Compatibility alias:

- `POST /api/auth/register/student`

## Student APIs

### `GET /api/student/me/status`

Returns the current student's binding and review status. This endpoint is available to `pending`, `approved`, and `rejected` students.

Response:

```json
{
  "data": {
    "userId": 21,
    "username": "new_student",
    "status": "pending",
    "student": {
      "id": 1,
      "studentNo": "S001",
      "name": "张三",
      "classId": 1
    },
    "canViewResults": false
  }
}
```

Compatibility alias:

- `GET /api/student/me/binding-status`

### `GET /api/student/me/results`

Returns the current approved student's own exam score list.

Access rules:

- Requires `student` role.
- Requires `users.status = 'approved'`.
- `pending` or `rejected` students receive `FORBIDDEN`.
- The backend resolves `student_id` from the token-bound `students.user_id`.

### `GET /api/student/me/diagnosis?examId=:examId`

Returns the current approved student's score, mastery list, weak points, recommendation, and knowledge graph for one exam.

Access rules are the same as `/api/student/me/results`.

## Teacher APIs

### `GET /api/teacher/classes`

Returns classes owned by the current teacher.

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
- Validate required headers and row values.
- Store upload metadata and preview JSON only.
- Do not write responses or diagnosis.

### `POST /api/teacher/uploads/:uploadId/confirm`

Confirms a valid preview, writes responses, and runs diagnosis.

Rules:

- Reject if preview has validation errors.
- Reject if the upload does not belong to the current teacher.
- Generate diagnosis and recommendations after import.

### `GET /api/teacher/student-approvals`

Returns pending student account binding applications for classes owned by the current teacher.

Query:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | string | no | Default `pending`; allowed: `pending`, `approved`, `rejected`. |

Response:

```json
{
  "data": [
    {
      "userId": 21,
      "username": "new_student",
      "status": "pending",
      "studentId": 1,
      "studentNo": "S001",
      "studentName": "张三",
      "classId": 1,
      "className": "Class A",
      "createdAt": "2026-05-28T08:00:00.000Z"
    }
  ]
}
```

Compatibility alias:

- `GET /api/teacher/student-registrations`

### `POST /api/teacher/student-approvals/:studentId/approve`

Approves a pending student binding application.

Response:

```json
{
  "data": {
    "userId": 21,
    "studentId": 1,
    "status": "approved",
    "message": "学生账号已审核通过。"
  }
}
```

### `POST /api/teacher/student-approvals/:studentId/reject`

Rejects a pending student binding application.

Request:

```json
{
  "reason": "学号信息需重新确认"
}
```

Response:

```json
{
  "data": {
    "userId": 21,
    "studentId": 1,
    "status": "rejected",
    "message": "学生账号已拒绝。"
  }
}
```

Compatibility aliases:

- `POST /api/teacher/student-registrations/:userId/approve`
- `POST /api/teacher/student-registrations/:userId/reject`

Review rules:

- Requires `teacher` role.
- Target application must belong to a class owned by the current teacher.
- Only `pending` accounts can be approved or rejected.
- Non-teacher users receive `FORBIDDEN`.

## Diagnosis Contract

The DINA module accepts Q matrix rows and student responses, then outputs mastery probabilities and evidence counts per knowledge point. The exact implementation is intentionally lightweight for the MVP and is covered by backend tests.
