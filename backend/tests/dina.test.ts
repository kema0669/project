import { describe, it, expect } from 'vitest';
import {
  computeIdealResponsePattern,
  computeLikelihood,
  estimateDINA,
} from '../src/algorithm/dina.js';
import type { QMatrixEntry, XMatrixEntry } from '../src/types.js';

describe('DINA Algorithm Core (TDD)', () => {
  it('should compute ideal response pattern η correctly', () => {
    // 3 questions × 3 knowledge points
    // Q[0] = [1,1,0]: requires KP1 and KP2
    // Q[1] = [0,1,1]: requires KP2 and KP3
    // Q[2] = [1,0,0]: requires KP1
    const qMatrix: QMatrixEntry[] = [
      { questionId: 1, knowledgePointId: 1, weight: 1 },
      { questionId: 1, knowledgePointId: 2, weight: 1 },
      { questionId: 2, knowledgePointId: 2, weight: 1 },
      { questionId: 2, knowledgePointId: 3, weight: 1 },
      { questionId: 3, knowledgePointId: 1, weight: 1 },
    ];
    const nItems = 3;
    const nAttrs = 3;

    // α = [1, 1, 0]: mastered KP1 and KP2, not KP3
    const alpha = [1, 1, 0];
    const eta = computeIdealResponsePattern(qMatrix, nItems, nAttrs, alpha);

    // Q1 requires KP1(1) AND KP2(1) → η=1
    // Q2 requires KP2(1) AND KP3(0) → η=0
    // Q3 requires KP1(1) → η=1
    expect(eta).toEqual([1, 0, 1]);

    // α = [0, 0, 0]: mastered nothing
    const alphaNone = [0, 0, 0];
    const etaNone = computeIdealResponsePattern(qMatrix, nItems, nAttrs, alphaNone);
    expect(etaNone).toEqual([0, 0, 0]);
  });

  it('should compute likelihood correctly for a single student', () => {
    const qMatrix: QMatrixEntry[] = [
      { questionId: 1, knowledgePointId: 1, weight: 1 },
      { questionId: 1, knowledgePointId: 2, weight: 1 },
      { questionId: 2, knowledgePointId: 2, weight: 1 },
      { questionId: 2, knowledgePointId: 3, weight: 1 },
      { questionId: 3, knowledgePointId: 1, weight: 1 },
    ];
    const nItems = 3;
    const nAttrs = 3;
    const alpha = [1, 1, 0]; // η = [1, 0, 1]
    const x = [1, 0, 1]; // correct, incorrect, correct
    const s = [0.1, 0.1, 0.1]; // slip
    const g = [0.2, 0.2, 0.2]; // guess

    const likelihood = computeLikelihood(qMatrix, nItems, nAttrs, alpha, x, s, g);

    // Item 1: η=1, X=1 → P = (1-0.1)^1 * 0.2^0 = 0.9
    // Item 2: η=0, X=0 → P = 1 - [(1-0.1)^0 * 0.2^1] = 1 - 0.2 = 0.8
    // Item 3: η=1, X=1 → P = 0.9
    // likelihood = 0.9 * 0.8 * 0.9 = 0.648
    expect(likelihood).toBeCloseTo(0.648, 5);
  });

  it('should estimate mastery probabilities for a known simple case', () => {
    // Minimal deterministic case: 2 KPs, 4 items, 4 students
    // Item 1-2 test KP1 only; Item 3-4 test KP2 only
    const qMatrix: QMatrixEntry[] = [
      { questionId: 1, knowledgePointId: 1, weight: 1 },
      { questionId: 2, knowledgePointId: 1, weight: 1 },
      { questionId: 3, knowledgePointId: 2, weight: 1 },
      { questionId: 4, knowledgePointId: 2, weight: 1 },
    ];
    const xMatrix: XMatrixEntry[] = [
      // Student 1: mastered both
      { studentId: 1, questionId: 1, isCorrect: 1 },
      { studentId: 1, questionId: 2, isCorrect: 1 },
      { studentId: 1, questionId: 3, isCorrect: 1 },
      { studentId: 1, questionId: 4, isCorrect: 1 },
      // Student 2: mastered KP1 only
      { studentId: 2, questionId: 1, isCorrect: 1 },
      { studentId: 2, questionId: 2, isCorrect: 1 },
      { studentId: 2, questionId: 3, isCorrect: 0 },
      { studentId: 2, questionId: 4, isCorrect: 0 },
      // Student 3: mastered KP2 only
      { studentId: 3, questionId: 1, isCorrect: 0 },
      { studentId: 3, questionId: 2, isCorrect: 0 },
      { studentId: 3, questionId: 3, isCorrect: 1 },
      { studentId: 3, questionId: 4, isCorrect: 1 },
      // Student 4: mastered none
      { studentId: 4, questionId: 1, isCorrect: 0 },
      { studentId: 4, questionId: 2, isCorrect: 0 },
      { studentId: 4, questionId: 3, isCorrect: 0 },
      { studentId: 4, questionId: 4, isCorrect: 0 },
    ];

    const result = estimateDINA(qMatrix, xMatrix, { maxIterations: 50, tolerance: 1e-6 });

    // Student 1 should have high mastery on both KPs
    const s1kp1 = result.find((r) => r.studentId === 1 && r.knowledgePointId === 1)!;
    const s1kp2 = result.find((r) => r.studentId === 1 && r.knowledgePointId === 2)!;
    expect(s1kp1.probability).toBeGreaterThan(0.85);
    expect(s1kp2.probability).toBeGreaterThan(0.85);

    // Student 2: high KP1, low KP2
    const s2kp1 = result.find((r) => r.studentId === 2 && r.knowledgePointId === 1)!;
    const s2kp2 = result.find((r) => r.studentId === 2 && r.knowledgePointId === 2)!;
    expect(s2kp1.probability).toBeGreaterThan(0.7);
    expect(s2kp2.probability).toBeLessThan(0.3);

    // Student 3: low KP1, high KP2
    const s3kp1 = result.find((r) => r.studentId === 3 && r.knowledgePointId === 1)!;
    const s3kp2 = result.find((r) => r.studentId === 3 && r.knowledgePointId === 2)!;
    expect(s3kp1.probability).toBeLessThan(0.3);
    expect(s3kp2.probability).toBeGreaterThan(0.7);

    // Student 4: low on both
    const s4kp1 = result.find((r) => r.studentId === 4 && r.knowledgePointId === 1)!;
    const s4kp2 = result.find((r) => r.studentId === 4 && r.knowledgePointId === 2)!;
    expect(s4kp1.probability).toBeLessThan(0.3);
    expect(s4kp2.probability).toBeLessThan(0.3);
  });

  it('should return probabilities between 0 and 1', () => {
    const qMatrix: QMatrixEntry[] = [
      { questionId: 1, knowledgePointId: 1, weight: 1 },
      { questionId: 2, knowledgePointId: 1, weight: 1 },
      { questionId: 3, knowledgePointId: 2, weight: 1 },
      { questionId: 4, knowledgePointId: 2, weight: 1 },
    ];
    const xMatrix: XMatrixEntry[] = [
      { studentId: 1, questionId: 1, isCorrect: 1 },
      { studentId: 1, questionId: 2, isCorrect: 0 },
      { studentId: 1, questionId: 3, isCorrect: 1 },
      { studentId: 1, questionId: 4, isCorrect: 0 },
    ];

    const result = estimateDINA(qMatrix, xMatrix);
    for (const r of result) {
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(1);
    }
  });

  it('should converge within max iterations', () => {
    const qMatrix: QMatrixEntry[] = [
      { questionId: 1, knowledgePointId: 1, weight: 1 },
      { questionId: 2, knowledgePointId: 1, weight: 1 },
      { questionId: 3, knowledgePointId: 2, weight: 1 },
      { questionId: 4, knowledgePointId: 2, weight: 1 },
    ];
    const xMatrix: XMatrixEntry[] = [
      { studentId: 1, questionId: 1, isCorrect: 1 },
      { studentId: 1, questionId: 2, isCorrect: 0 },
      { studentId: 1, questionId: 3, isCorrect: 1 },
      { studentId: 1, questionId: 4, isCorrect: 0 },
    ];

    // Should not throw and should complete within 100 iterations (default)
    expect(() => estimateDINA(qMatrix, xMatrix)).not.toThrow();
  });
});
