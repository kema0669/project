import { describe, expect, it } from 'vitest';
import { estimateDINA } from '../src/algorithm/dina.js';
import type { QMatrixEntry, XMatrixEntry } from '../src/types.js';

describe('MVP contract: DINA diagnosis output', () => {
  it('should produce one mastery probability per student and knowledge point', () => {
    const qMatrix: QMatrixEntry[] = [
      { questionId: 1, knowledgePointId: 1, weight: 1 },
      { questionId: 2, knowledgePointId: 1, weight: 1 },
      { questionId: 3, knowledgePointId: 2, weight: 1 },
      { questionId: 4, knowledgePointId: 2, weight: 1 },
      { questionId: 5, knowledgePointId: 3, weight: 1 },
      { questionId: 6, knowledgePointId: 3, weight: 1 },
    ];
    const xMatrix: XMatrixEntry[] = [
      { studentId: 1, questionId: 1, isCorrect: 1 },
      { studentId: 1, questionId: 2, isCorrect: 1 },
      { studentId: 1, questionId: 3, isCorrect: 0 },
      { studentId: 1, questionId: 4, isCorrect: 0 },
      { studentId: 1, questionId: 5, isCorrect: 1 },
      { studentId: 1, questionId: 6, isCorrect: 0 },
    ];

    const result = estimateDINA(qMatrix, xMatrix);

    expect(result).toHaveLength(3);
    expect(result.map((row) => row.knowledgePointId)).toEqual([1, 2, 3]);
    for (const row of result) {
      expect(row.studentId).toBe(1);
      expect(row.probability).toBeGreaterThanOrEqual(0);
      expect(row.probability).toBeLessThanOrEqual(1);
    }
  });

  it('should include evidence counts required by the SDD diagnosis contract', () => {
    const qMatrix: QMatrixEntry[] = [
      { questionId: 1, knowledgePointId: 1, weight: 1 },
      { questionId: 2, knowledgePointId: 1, weight: 1 },
    ];
    const xMatrix: XMatrixEntry[] = [
      { studentId: 1, questionId: 1, isCorrect: 1 },
      { studentId: 1, questionId: 2, isCorrect: 0 },
    ];

    const result = estimateDINA(qMatrix, xMatrix);

    expect(result[0]).toMatchObject({
      studentId: 1,
      knowledgePointId: 1,
      evidenceCorrect: 1,
      evidenceTotal: 2,
    });
  });
});
