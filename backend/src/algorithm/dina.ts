/**
 * TDD 阶段：DINA (Deterministic Inputs, Noisy "And" gate) 模型实现
 *
 * 基于 EM 算法框架，从 Q 矩阵和 X 矩阵估计学生知识点掌握概率。
 * 算法假设：学生答对某题当且仅当他掌握了该题考察的所有知识点（确定性AND门），
 * 但存在 slip（掌握却答错）和 guess（没掌握却猜对）两种噪声。
 */

import type { QMatrixEntry, XMatrixEntry, MasteryProbability } from '../types.js';

interface DINAOptions {
  maxIterations?: number;
  tolerance?: number;
  slipInit?: number;
  guessInit?: number;
}

/** 将稀疏 Q 矩阵转为密集二维数组 Q[item][attr] */
function buildDenseQ(qMatrix: QMatrixEntry[], nItems: number, nAttrs: number): number[][] {
  const Q: number[][] = Array.from({ length: nItems }, () => Array(nAttrs).fill(0));
  for (const entry of qMatrix) {
    const i = entry.questionId - 1;
    const k = entry.knowledgePointId - 1;
    if (i >= 0 && i < nItems && k >= 0 && k < nAttrs) {
      Q[i][k] = entry.weight;
    }
  }
  return Q;
}

/** 将稀疏 X 矩阵转为密集二维数组 X[student][item] */
function buildDenseX(xMatrix: XMatrixEntry[], studentIds: number[], nItems: number): number[][] {
  const studentIndex = new Map(studentIds.map((id, index) => [id, index]));
  const nStudents = studentIds.length;
  const X: number[][] = Array.from({ length: nStudents }, () => Array(nItems).fill(0));
  for (const entry of xMatrix) {
    const j = studentIndex.get(entry.studentId) ?? -1;
    const i = entry.questionId - 1;
    if (j >= 0 && i >= 0 && i < nItems) {
      X[j][i] = entry.isCorrect;
    }
  }
  return X;
}

/** 生成所有 2^K 种属性掌握模式 */
function generateAttributePatterns(nAttrs: number): number[][] {
  const patterns: number[][] = [];
  const total = 1 << nAttrs;
  for (let m = 0; m < total; m++) {
    const pattern: number[] = [];
    for (let k = 0; k < nAttrs; k++) {
      pattern.push((m >> k) & 1);
    }
    patterns.push(pattern);
  }
  return patterns;
}

/**
 * 计算理想反应模式 η。
 * η_im = ∏_k(α_mk ^ Q_ik)
 * 即：学生 m 掌握了题目 i 所需的所有知识点时，η_im = 1，否则 0。
 */
export function computeIdealResponsePattern(
  qMatrix: QMatrixEntry[],
  nItems: number,
  nAttrs: number,
  alpha: number[]
): number[] {
  const Q = buildDenseQ(qMatrix, nItems, nAttrs);
  const eta: number[] = [];
  for (let i = 0; i < nItems; i++) {
    let val = 1;
    for (let k = 0; k < nAttrs; k++) {
      if (Q[i][k] === 1 && alpha[k] === 0) {
        val = 0;
        break;
      }
    }
    eta.push(val);
  }
  return eta;
}

/**
 * 计算单个学生、单个属性模式下的似然值。
 * P(X_j | α_m, s, g) = ∏_i [(1-s_i)^{η·x} · s_i^{η·(1-x)} · g_i^{(1-η)·x} · (1-g_i)^{(1-η)·(1-x)}]
 */
export function computeLikelihood(
  qMatrix: QMatrixEntry[],
  nItems: number,
  nAttrs: number,
  alpha: number[],
  x: number[],
  s: number[],
  g: number[]
): number {
  const eta = computeIdealResponsePattern(qMatrix, nItems, nAttrs, alpha);
  let likelihood = 1;
  for (let i = 0; i < nItems; i++) {
    if (eta[i] === 1) {
      likelihood *= x[i] === 1 ? (1 - s[i]) : s[i];
    } else {
      likelihood *= x[i] === 1 ? g[i] : (1 - g[i]);
    }
  }
  return likelihood;
}

/** 计算对数似然（数值稳定性更好） */
function computeLogLikelihood(
  eta: number[],
  x: number[],
  s: number[],
  g: number[]
): number {
  let logLik = 0;
  for (let i = 0; i < x.length; i++) {
    if (eta[i] === 1) {
      logLik += x[i] === 1 ? Math.log(Math.max(1e-8, 1 - s[i])) : Math.log(Math.max(1e-8, s[i]));
    } else {
      logLik += x[i] === 1 ? Math.log(Math.max(1e-8, g[i])) : Math.log(Math.max(1e-8, 1 - g[i]));
    }
  }
  return logLik;
}

/** 将值裁剪到 [min, max] */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * DINA 模型参数估计（EM 算法）。
 *
 * @param qMatrix  Q 矩阵条目（稀疏表示）
 * @param xMatrix  X 矩阵条目（稀疏表示）
 * @param options  可选配置
 * @returns        每个学生在每个知识点上的掌握概率
 */
export function estimateDINA(
  qMatrix: QMatrixEntry[],
  xMatrix: XMatrixEntry[],
  options: DINAOptions = {}
): MasteryProbability[] {
  if (qMatrix.length === 0 || xMatrix.length === 0) return [];

  const {
    maxIterations = 100,
    tolerance = 1e-5,
    slipInit = 0.1,
    guessInit = 0.2,
  } = options;

  // 推断维度。学生 ID 可能因为导入/离班而不连续，因此显式保留真实 ID。
  const nItems = Math.max(...qMatrix.map((e) => e.questionId));
  const nAttrs = Math.max(...qMatrix.map((e) => e.knowledgePointId));
  const studentIds = [...new Set(xMatrix.map((e) => e.studentId))].sort((a, b) => a - b);
  const nStudents = studentIds.length;

  const Q = buildDenseQ(qMatrix, nItems, nAttrs);
  const X = buildDenseX(xMatrix, studentIds, nItems);
  const patterns = generateAttributePatterns(nAttrs);
  const nPatterns = patterns.length;

  // 预计算所有模式、所有题目的 η
  const eta: number[][] = Array.from({ length: nPatterns }, () => Array(nItems).fill(0));
  for (let m = 0; m < nPatterns; m++) {
    for (let i = 0; i < nItems; i++) {
      let val = 1;
      for (let k = 0; k < nAttrs; k++) {
        if (Q[i][k] === 1 && patterns[m][k] === 0) {
          val = 0;
          break;
        }
      }
      eta[m][i] = val;
    }
  }

  // 初始化参数
  let s = Array(nItems).fill(slipInit);
  let g = Array(nItems).fill(guessInit);
  let p = Array(nPatterns).fill(1 / nPatterns);

  // EM 迭代
  for (let iter = 0; iter < maxIterations; iter++) {
    const sPrev = s.slice();
    const gPrev = g.slice();

    // E-step: 计算后验概率 posterior[j][m]
    const posterior: number[][] = Array.from({ length: nStudents }, () => Array(nPatterns).fill(0));
    for (let j = 0; j < nStudents; j++) {
      const logPosts: number[] = [];
      for (let m = 0; m < nPatterns; m++) {
        const logLik = computeLogLikelihood(eta[m], X[j], s, g);
        logPosts.push(logLik + Math.log(Math.max(1e-12, p[m])));
      }
      const maxLog = Math.max(...logPosts);
      const posts = logPosts.map((lp) => Math.exp(lp - maxLog));
      const sum = posts.reduce((a, b) => a + b, 0);
      for (let m = 0; m < nPatterns; m++) {
        posterior[j][m] = posts[m] / sum;
      }
    }

    // M-step: 更新 p, s, g
    // 更新模式先验 p[m]
    for (let m = 0; m < nPatterns; m++) {
      let sum = 0;
      for (let j = 0; j < nStudents; j++) {
        sum += posterior[j][m];
      }
      p[m] = sum / nStudents;
    }

    // 更新 slip s[i] 和 guess g[i]
    for (let i = 0; i < nItems; i++) {
      let numerS = 0;
      let denomS = 0;
      let numerG = 0;
      let denomG = 0;
      for (let m = 0; m < nPatterns; m++) {
        for (let j = 0; j < nStudents; j++) {
          const post = posterior[j][m];
          if (eta[m][i] === 1) {
            denomS += post;
            if (X[j][i] === 0) numerS += post;
          } else {
            denomG += post;
            if (X[j][i] === 1) numerG += post;
          }
        }
      }
      s[i] = denomS > 1e-8 ? numerS / denomS : slipInit;
      g[i] = denomG > 1e-8 ? numerG / denomG : guessInit;
      // 裁剪到合理范围，避免退化
      s[i] = clamp(s[i], 0.01, 0.4);
      g[i] = clamp(g[i], 0.01, 0.4);
    }

    // 收敛判断
    const diffS = s.reduce((sum, val, i) => sum + Math.abs(val - sPrev[i]), 0);
    const diffG = g.reduce((sum, val, i) => sum + Math.abs(val - gPrev[i]), 0);
    if ((diffS + diffG) / nItems < tolerance) {
      break;
    }
  }

  // 最终 E-step：基于收敛后的参数重新计算 posterior
  const finalPosterior: number[][] = Array.from({ length: nStudents }, () => Array(nPatterns).fill(0));
  for (let j = 0; j < nStudents; j++) {
    const logPosts: number[] = [];
    for (let m = 0; m < nPatterns; m++) {
      const logLik = computeLogLikelihood(eta[m], X[j], s, g);
      logPosts.push(logLik + Math.log(Math.max(1e-12, p[m])));
    }
    const maxLog = Math.max(...logPosts);
    const posts = logPosts.map((lp) => Math.exp(lp - maxLog));
    const sum = posts.reduce((a, b) => a + b, 0);
    for (let m = 0; m < nPatterns; m++) {
      finalPosterior[j][m] = posts[m] / sum;
    }
  }

  // 输出：每个学生的每个知识点的掌握概率
  const result: MasteryProbability[] = [];
  for (let j = 0; j < nStudents; j++) {
    for (let k = 0; k < nAttrs; k++) {
      let prob = 0;
      for (let m = 0; m < nPatterns; m++) {
        prob += finalPosterior[j][m] * patterns[m][k];
      }
      result.push({
        studentId: studentIds[j],
        knowledgePointId: k + 1,
        probability: Math.round(prob * 1000) / 1000,
      });
    }
  }

  return result;
}
