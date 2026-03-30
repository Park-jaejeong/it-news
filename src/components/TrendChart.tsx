import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { Article } from '../services/newsService';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface TrendChartProps {
  news: Article[];
}

const TrendChart: React.FC<TrendChartProps> = ({ news }) => {
  const categoryCounts: Record<string, number> = {};
  
  // Count occurrences of each category (excluding '알림' or missing ones)
  news.forEach(article => {
    if (article.category && article.category !== '알림' && article.category !== '분류 보류') {
      categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
    }
  });

  const labels = Object.keys(categoryCounts);
  const dataValues = Object.values(categoryCounts);

  const data = {
    labels: labels,
    datasets: [
      {
        label: '기사 수',
        data: dataValues,
        backgroundColor: [
          'rgba(189, 194, 255, 0.7)', // primary
          'rgba(68, 221, 193, 0.7)',  // secondary
          'rgba(255, 181, 157, 0.7)', // tertiary
          'rgba(255, 235, 124, 0.7)',
          'rgba(162, 245, 144, 0.7)',
          'rgba(255, 158, 251, 0.7)',
        ],
        borderColor: [
          '#BDC2FF',
          '#44DDC1',
          '#FFB59D',
          '#FFEB7C',
          '#A2F590',
          '#FF9EFB',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'var(--on-surface)',
          font: {
            family: 'Inter, sans-serif'
          }
        }
      },
      title: {
        display: true,
        text: '현재 IT 뉴스 카테고리 분포',
        color: 'var(--on-surface)',
        font: {
          size: 18,
          family: 'Manrope, sans-serif',
          weight: 'bold' as any
        }
      },
    },
    cutout: '70%',
  };

  return (
    <div className="trend-chart-container glass">
      {labels.length > 0 ? (
        <Doughnut data={data} options={options} />
      ) : (
        <div className="no-data-msg">
          <p>분석된 데이터가 없습니다. 기사를 Gemini AI로 먼저 요약해 보세요!</p>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
