import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { StudentTrends } from '../types';
import styles from './TrendChart.module.css';

interface Props {
  trends: StudentTrends;
}

export default function TrendChart({ trends }: Props) {
  const scoreRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLDivElement>(null);
  const scoreChart = useRef<echarts.ECharts | null>(null);
  const subjectChart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!scoreRef.current || !subjectRef.current) return;
    if (!scoreChart.current) scoreChart.current = echarts.init(scoreRef.current);
    if (!subjectChart.current) subjectChart.current = echarts.init(subjectRef.current);

    const labels = trends.scoreTrend.map((point) => point.examName);

    scoreChart.current.setOption({
      title: { text: '总分与排名变化', left: 12, top: 8, textStyle: { fontSize: 15, color: '#0f172a' } },
      tooltip: { trigger: 'axis' },
      legend: { top: 36 },
      grid: { left: 48, right: 48, top: 78, bottom: 36 },
      xAxis: { type: 'category', data: labels },
      yAxis: [
        { type: 'value', name: '总分' },
        { type: 'value', name: '排名', inverse: true, minInterval: 1 },
      ],
      series: [
        {
          name: '总分',
          type: 'line',
          smooth: true,
          data: trends.scoreTrend.map((point) => point.totalScore),
          color: '#2563eb',
        },
        {
          name: '班级排名',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: trends.scoreTrend.map((point) => point.classRank),
          color: '#16a34a',
        },
        {
          name: '年级排名',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: trends.scoreTrend.map((point) => point.gradeRank),
          color: '#dc2626',
        },
      ],
    });

    const subjectNames = [...new Set(trends.subjectTrends.map((point) => point.subjectName))];
    subjectChart.current.setOption({
      title: { text: '各科成绩趋势', left: 12, top: 8, textStyle: { fontSize: 15, color: '#0f172a' } },
      tooltip: { trigger: 'axis' },
      legend: { top: 36, type: 'scroll' },
      grid: { left: 48, right: 24, top: 82, bottom: 36 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', name: '得分率', min: 0, max: 100 },
      series: subjectNames.map((name) => ({
        name,
        type: 'line',
        smooth: true,
        data: labels.map((label) => {
          const point = trends.subjectTrends.find((item) => item.examName === label && item.subjectName === name);
          return point ? Math.round((point.score / point.totalScore) * 100) : null;
        }),
      })),
    });

    const resize = () => {
      scoreChart.current?.resize();
      subjectChart.current?.resize();
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [trends]);

  return (
    <div className={styles.card}>
      <div ref={scoreRef} className={styles.chart} />
      <div ref={subjectRef} className={styles.chart} />
    </div>
  );
}
