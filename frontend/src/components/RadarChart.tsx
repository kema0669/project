import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { KnowledgeMastery } from '../types';
import styles from './RadarChart.module.css';

interface Props {
  knowledges: KnowledgeMastery[];
}

export default function RadarChart({ knowledges }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const indicator = knowledges.map((k) => ({
      name: k.knowledgePointName,
      max: 1,
    }));

    const values = knowledges.map((k) => Number(k.masteryProbability.toFixed(2)));

    const option: echarts.EChartsOption = {
      title: {
        text: '📊 认知雷达图',
        left: 'center',
        top: 8,
        textStyle: { fontSize: 16, fontWeight: 600, color: '#1e293b' },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.value as number[];
          return knowledges
            .map((k, i) => `${k.knowledgePointName}: ${(data[i] * 100).toFixed(0)}%`)
            .join('<br/>');
        },
      },
      radar: {
        indicator,
        radius: '65%',
        center: ['50%', '55%'],
        axisName: {
          color: '#475569',
          fontSize: 12,
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(37, 99, 235, 0.02)', 'rgba(37, 99, 235, 0.06)'],
          },
        },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        splitLine: { lineStyle: { color: '#cbd5e1' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '掌握概率',
              areaStyle: {
                color: 'rgba(37, 99, 235, 0.25)',
              },
              lineStyle: {
                color: '#2563EB',
                width: 2,
              },
              itemStyle: {
                color: '#2563EB',
              },
            },
          ],
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [knowledges]);

  return (
    <div className={styles.card}>
      <div ref={chartRef} className={styles.chart} />
    </div>
  );
}
