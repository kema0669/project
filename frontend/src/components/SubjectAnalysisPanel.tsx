import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { SubjectAnalysis } from '../types';
import styles from './SubjectAnalysisPanel.module.css';

interface Props {
  analysis: SubjectAnalysis | null;
}

export default function SubjectAnalysisPanel({ analysis }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !analysis) return;
    if (!chartInstance.current) chartInstance.current = echarts.init(chartRef.current);

    chartInstance.current.setOption({
      title: {
        text: '每题得分率',
        left: 12,
        top: 8,
        textStyle: { fontSize: 15, color: '#0f172a' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const item = Array.isArray(params) ? (params[0] as { dataIndex: number }) : { dataIndex: 0 };
          const question = analysis.questions[item.dataIndex];
          return `${question.title}<br/>得分：${question.score}/${question.maxScore}<br/>得分率：${Math.round(
            question.scoreRate * 100
          )}%`;
        },
      },
      grid: { left: 44, right: 20, top: 58, bottom: 34 },
      xAxis: {
        type: 'category',
        data: analysis.questions.map((question) => `第${question.questionNo}题`),
      },
      yAxis: { type: 'value', min: 0, max: 100 },
      series: [
        {
          type: 'bar',
          data: analysis.questions.map((question) => Math.round(question.scoreRate * 100)),
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              analysis.questions[params.dataIndex].scoreRate < 0.7 ? '#dc2626' : '#2563eb',
          },
        },
      ],
    });

    const resize = () => chartInstance.current?.resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [analysis]);

  if (!analysis) {
    return <div className={styles.empty}>请选择一个科目查看题目分析</div>;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <span>{analysis.exam.name}</span>
          <h2>{analysis.subject.subjectName} 单科分析</h2>
        </div>
        <div className={styles.metrics}>
          <div>
            <span>单科总分</span>
            <strong>
              {analysis.subject.score}/{analysis.subject.totalScore}
            </strong>
          </div>
          <div>
            <span>班级排名</span>
            <strong>{analysis.subject.classRank ?? '-'}</strong>
          </div>
          <div>
            <span>年级排名</span>
            <strong>{analysis.subject.gradeRank ?? '-'}</strong>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div ref={chartRef} className={styles.chart} />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>题号</th>
                <th>题目</th>
                <th>得分</th>
                <th>得分率</th>
              </tr>
            </thead>
            <tbody>
              {analysis.questions.map((question) => (
                <tr key={question.questionId} className={question.scoreRate < 0.7 ? styles.weakRow : undefined}>
                  <td>第{question.questionNo}题</td>
                  <td>{question.title}</td>
                  <td>
                    {question.score}/{question.maxScore}
                  </td>
                  <td>{Math.round(question.scoreRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.weakList}>
        <span>低分题：</span>
        {analysis.weakQuestions.length > 0
          ? analysis.weakQuestions.map((question) => `第${question.questionNo}题`).join('、')
          : '暂无明显低分题'}
      </div>
    </section>
  );
}
