import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../src/db.js';
import { seedData } from '../src/seed.js';
import {
  getStudentOverview,
  getStudentSubjects,
  getStudentTrends,
  getSubjectKnowledgeAnalysis,
  getSubjectKnowledgeTrends,
  getSubjectAnalysis,
  listExams,
  listStudents,
} from '../src/diagnosis.js';

describe('Integration: DB + score analysis', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initDatabase(':memory:');
    seedData(db);
  });

  it('should list students and exams', () => {
    expect(listStudents(db)).toHaveLength(9);
    expect(listExams(db)).toHaveLength(3);
  });

  it('should return only the subjects configured for a student grade', () => {
    const grade7Subjects = getStudentSubjects(db, 1).map((subject) => subject.subjectCode);
    const grade9Subjects = getStudentSubjects(db, 7).map((subject) => subject.subjectCode);

    expect(grade7Subjects).not.toContain('physics');
    expect(grade7Subjects).toContain('biology');
    expect(grade9Subjects).toContain('chemistry');
    expect(grade9Subjects).not.toContain('biology');
  });

  it('should compute overview totals and ranks', () => {
    const overview = getStudentOverview(db, 4, 3);
    expect(overview).toBeDefined();
    expect(overview!.subjects.length).toBeGreaterThan(0);
    expect(overview!.totalScore).toBeGreaterThan(0);
    expect(overview!.totalFullScore).toBeGreaterThan(overview!.totalScore);
    expect(overview!.classRank).toBeGreaterThanOrEqual(1);
    expect(overview!.gradeRank).toBeGreaterThanOrEqual(1);
  });

  it('should compute score and subject trends across exams', () => {
    const trends = getStudentTrends(db, 7);
    expect(trends.scoreTrend).toHaveLength(3);
    expect(trends.subjectTrends.length).toBeGreaterThan(0);
    expect(trends.scoreTrend[0].totalScore).toBeGreaterThan(0);
  });

  it('should compute a single-subject question analysis', () => {
    const analysis = getSubjectAnalysis(db, 4, 3, 4);

    expect(analysis).toBeDefined();
    expect(analysis!.subject.subjectCode).toBe('physics');
    expect(analysis!.subject.score).toBeGreaterThan(0);
    expect(analysis!.subject.classRank).toBeGreaterThanOrEqual(1);
    expect(analysis!.subject.gradeRank).toBeGreaterThanOrEqual(1);
    expect(analysis!.questions).toHaveLength(5);
    expect(analysis!.questions[0]).toHaveProperty('maxScore');
    expect(analysis!.questions[0]).toHaveProperty('scoreRate');
    expect(analysis!.weakQuestions.every((q) => q.scoreRate < 0.7)).toBe(true);
  });

  it('should aggregate question scores into subject knowledge mastery', () => {
    const analysis = getSubjectKnowledgeAnalysis(db, 4, 3, 4);

    expect(analysis).toBeDefined();
    expect(analysis!.subject.subjectCode).toBe('physics');
    expect(analysis!.knowledges.length).toBeGreaterThanOrEqual(3);
    expect(analysis!.knowledges[0]).toHaveProperty('masteryRate');
    expect(analysis!.knowledges[0].masteryRate).toBeGreaterThanOrEqual(0);
    expect(analysis!.knowledges[0].masteryRate).toBeLessThanOrEqual(1);
    expect(analysis!.weakKnowledges.every((k) => k.masteryRate < 0.7)).toBe(true);
  });

  it('should compute subject knowledge trends across exams', () => {
    const trends = getSubjectKnowledgeTrends(db, 4, 4);

    expect(trends.length).toBeGreaterThanOrEqual(9);
    expect(trends[0]).toHaveProperty('examName');
    expect(trends[0]).toHaveProperty('knowledgePointName');
    expect(trends[0].masteryRate).toBeGreaterThanOrEqual(0);
    expect(trends[0].masteryRate).toBeLessThanOrEqual(1);
  });
});
