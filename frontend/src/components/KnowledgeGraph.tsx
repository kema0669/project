import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { KnowledgeTrendPoint, SubjectKnowledgeAnalysis } from '../types';
import styles from './KnowledgeGraph.module.css';

interface Props {
  analysis: SubjectKnowledgeAnalysis | null;
  trends: KnowledgeTrendPoint[];
}

export default function KnowledgeGraph({ analysis, trends }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);
  const mapChart = useRef<echarts.ECharts | null>(null);
  const trendChart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!analysis || !mapRef.current || !trendRef.current) return;
    if (!mapChart.current) mapChart.current = echarts.init(mapRef.current);
    if (!trendChart.current) trendChart.current = echarts.init(trendRef.current);

    mapChart.current.setOption({
      title: { text: '考点掌握地图', left: 12, top: 8, textStyle: { fontSize: 15, color: '#0f172a' } },
      tooltip: { trigger: 'axis' },
      grid: { left: 96, right: 24, top: 58, bottom: 28 },
      xAxis: { type: 'value', min: 0, max: 100 },
      yAxis: {
        type: 'category',
        data: analysis.knowledges.map((item) => item.knowledgePointName),
      },
      series: [
        {
          type: 'bar',
          data: analysis.knowledges.map((item) => Math.round(item.masteryRate * 100)),
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              analysis.knowledges[params.dataIndex].masteryRate < 0.7 ? '#dc2626' : '#2563eb',
          },
        },
      ],
    });

    const labels = [...new Set(trends.map((item) => item.examName))];
    const names = [...new Set(trends.map((item) => item.knowledgePointName))];
    trendChart.current.setOption({
      title: { text: '考点掌握趋势', left: 12, top: 8, textStyle: { fontSize: 15, color: '#0f172a' } },
      tooltip: { trigger: 'axis' },
      legend: { top: 36, type: 'scroll' },
      grid: { left: 48, right: 24, top: 82, bottom: 34 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', min: 0, max: 100 },
      series: names.map((name) => ({
        name,
        type: 'line',
        smooth: true,
        data: labels.map((label) => {
          const point = trends.find((item) => item.examName === label && item.knowledgePointName === name);
          return point ? Math.round(point.masteryRate * 100) : null;
        }),
      })),
    });

    const resize = () => {
      mapChart.current?.resize();
      trendChart.current?.resize();
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [analysis, trends]);

  if (!analysis) {
    return (
      <section className={styles.card}>
        <h3 className={styles.title}>单科考点掌握</h3>
        <div className={styles.empty}>请选择一个科目查看考点掌握情况</div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <span>{analysis.subject.subjectName}</span>
          <h3>单科考点掌握</h3>
        </div>
        <div className={styles.weakList}>
          <span>薄弱考点：</span>
          {analysis.weakKnowledges.length > 0
            ? analysis.weakKnowledges.map((item) => item.knowledgePointName).join('、')
            : '暂无明显薄弱考点'}
        </div>
      </div>
      <div className={styles.grid}>
        <div ref={mapRef} className={styles.chart} />
        <div ref={trendRef} className={styles.chart} />
      </div>
    </section>
  );
}
