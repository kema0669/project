import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { KnowledgeMastery } from '../types';
import { mockKnowledgePoints, mockKnowledgeRelations } from '../data/mock';
import styles from './KnowledgeGraph.module.css';

interface Props {
  knowledges: KnowledgeMastery[];
}

export default function KnowledgeGraph({ knowledges }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const masteryMap = new Map(knowledges.map((k) => [k.knowledgePointId, k.masteryProbability]));

    const nodes = mockKnowledgePoints.map((kp) => {
      const mastery = masteryMap.get(kp.id) ?? 0;
      let color = '#EF4444';
      if (mastery >= 0.8) color = '#10B981';
      else if (mastery >= 0.5) color = '#F59E0B';

      return {
        id: String(kp.id),
        name: kp.name,
        value: Math.round(mastery * 100),
        symbolSize: 40 + mastery * 40,
        itemStyle: { color },
        label: {
          show: true,
          fontSize: 13,
          fontWeight: 500,
        },
      };
    });

    const links = mockKnowledgeRelations.map((rel) => ({
      source: String(rel.fromId),
      target: String(rel.toId),
      lineStyle: {
        curveness: 0.2,
        color: '#94a3b8',
      },
      label: {
        show: true,
        formatter: '前序',
        fontSize: 10,
        color: '#64748b',
      },
    }));

    const option: echarts.EChartsOption = {
      title: {
        text: '🧠 知识掌握地图',
        left: 'center',
        top: 8,
        textStyle: { fontSize: 16, fontWeight: 600, color: '#1e293b' },
      },
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `<b>${params.name}</b><br/>掌握度：${params.value}%`;
          }
          return '';
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: nodes,
          links,
          roam: true,
          label: { position: 'bottom' },
          force: {
            repulsion: 300,
            edgeLength: 120,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 3 },
          },
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
