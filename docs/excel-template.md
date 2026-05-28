# SDD Step 1: Fixed Excel Upload Template

## Purpose

The MVP intentionally uses one fixed Excel template. This keeps the upload flow reliable and easy to explain in interviews:

```text
Teacher uploads scores
-> system validates the fixed columns
-> teacher previews row-level errors
-> teacher confirms import
```

This phase does not support Word, PDF, OCR, variable question counts, or multiple worksheets.

## File Rules

| Rule | Requirement |
| --- | --- |
| File type | `.xlsx` |
| Worksheet | First worksheet only |
| Header row | Row 1 |
| Data rows | Row 2 onward |
| Question count | Exactly 20 |
| Answer value | `0` or `1` only |
| Preview behavior | Parse and validate only, no response import |
| Confirm behavior | Write responses and run diagnosis |

## Required Columns

```text
student_no, student_name, class_name, exam_name,
q1, q2, q3, q4, q5, q6, q7, q8, q9, q10,
q11, q12, q13, q14, q15, q16, q17, q18, q19, q20
```

## Example

| student_no | student_name | class_name | exam_name | q1 | q2 | q3 | q4 | q5 | q6 | q7 | q8 | q9 | q10 | q11 | q12 | q13 | q14 | q15 | q16 | q17 | q18 | q19 | q20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S001 | Alice | Class A | DINA Diagnostic Quiz | 1 | 1 | 0 | 1 | 1 | 0 | 1 | 1 | 0 | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 1 | 0 | 1 | 1 |
| S002 | Bob | Class A | DINA Diagnostic Quiz | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 0 |

## Field Validation

| Field | Validation |
| --- | --- |
| `student_no` | Required. Must match an existing student in the target class. |
| `student_name` | Required. Must match the known student name, or produce a warning/error depending on implementation choice. |
| `class_name` | Required. Must match the selected upload class. |
| `exam_name` | Required. Non-empty string. All rows in one upload should use the same exam name. |
| `q1` to `q20` | Required. Each value must be integer `0` or `1`. |

## Preview Output Requirements

The preview page must show:

- total parsed rows,
- valid rows,
- error rows,
- row number from the Excel file,
- student number and name,
- each row's validation errors,
- a disabled confirm button when there are errors.

Example row-level error:

```json
{
  "rowNumber": 5,
  "field": "q7",
  "message": "Answer must be 0 or 1."
}
```

## Confirm Import Rules

Confirmation is allowed only when:

- the upload belongs to the current teacher,
- the target class belongs to the current teacher,
- `error_count` is `0`,
- all rows refer to students in the selected class,
- all `q1` to `q20` values are valid.

After confirmation:

1. Create or reuse the exam record.
2. Ensure 20 exam questions exist.
3. Write 20 response rows per student.
4. Run DINA diagnosis for every imported student.
5. Generate rule-based recommendations.

## Sample CSV View

This CSV-style view is only for documentation. The actual upload file should be `.xlsx`.

```csv
student_no,student_name,class_name,exam_name,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,q17,q18,q19,q20
S001,Alice,Class A,DINA Diagnostic Quiz,1,1,0,1,1,0,1,1,0,1,1,1,0,1,0,1,1,0,1,1
S002,Bob,Class A,DINA Diagnostic Quiz,0,1,0,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,1,0
```
