import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { SubjectScoreSummary } from '../types';
import styles from './RadarChart.module.css';

interface Props {
  subjects: SubjectScoreSummary[];
}

export default function RadarChart({ subjects }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) chartInstance.current = echarts.init(chartRef.current);

    chartInstance.current.setOption({
      title: {
        text: '学科成绩雷达图',
        left: 'center',
        top: 8,
        textStyle: { fontSize: 16, fontWeight: 600, color: '#1e293b' },
      },
      tooltip: {
        trigger: 'item',
        formatter: () =>
          subjects
            .map((subject) => `${subject.subjectName}: ${subject.score}/${subject.totalScore}`)
            .join('<br/>'),
      },
      radar: {
        indicator: subjects.map((subject) => ({
          name: subject.subjectName,
          max: subject.totalScore,
        })),
        radius: '65%',
        center: ['50%', '56%'],
        axisName: { color: '#475569', fontSize: 12 },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        splitLine: { lineStyle: { color: '#cbd5e1' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: subjects.map((subject) => subject.score),
              name: '成绩',
              areaStyle: { color: 'rgba(37, 99, 235, 0.22)' },
              lineStyle: { color: '#2563eb', width: 2 },
              itemStyle: { color: '#2563eb' },
            },
          ],
        },
      ],
    });

    const resize = () => chartInstance.current?.resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [subjects]);

  return (
    <div className={styles.card}>
      <div ref={chartRef} className={styles.chart} />
    </div>
  );
}
