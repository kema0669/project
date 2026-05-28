import { describe, it, expect } from 'vitest';

describe('Excel Import Contract', () => {
  it('should document the fixed MVP score import columns', () => {
    const requiredColumns = [
      'student_no',
      'student_name',
      'class_name',
      'exam_name',
      ...Array.from({ length: 20 }, (_, index) => `q${index + 1}`),
    ];

    expect(requiredColumns).toContain('student_no');
    expect(requiredColumns).toContain('exam_name');
    expect(requiredColumns).toContain('q1');
    expect(requiredColumns).toContain('q20');
    expect(requiredColumns).not.toContain('subject');
    expect(requiredColumns).not.toContain('question_no');
  });
});
