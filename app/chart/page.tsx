'use client';
import { useState } from 'react';
import BirthForm from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import PalaceDetailPanel from '@/components/PalaceDetailPanel';
import { useTheme } from '@/components/ThemeProvider';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart, Palace } from '@/lib/ziwei/types';

/**
 * 命盘页 —— 开源版「排盘引擎 Demo」
 *
 * 这是一个最小可运行示例：用本仓库的排盘引擎 generateChart() 配合基础 UI
 * 组件，渲染一张完整紫微命盘 + 基础解读，并支持本命 / 大限 / 流年切换。
 *
 * 说明：线上商业版的完整交互界面（重设计的新 UI、AI 流式解读、合盘、分享
 * 卡片等）不在开源范围内；但排盘内核——安星算法、四化、格局识别、古籍库——
 * 完全开放（见 lib/ziwei/*），可自由二次开发出你自己的界面。
 */
export default function ChartPage() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const { theme, toggle } = useTheme();

  const handleChartGenerated = (info: BirthInfo) => {
    const nextChart = generateChart(info);
    setChart(nextChart);
    setSelectedPalace(nextChart.palaces.find(p => p.branch === nextChart.mingGongBranch) ?? null);
  };

  // ── 未起盘：展示出生信息表单 ──
  if (!chart) {
    return (
      <main className="birth-page">
        <div className="birth-shell">
          <div className="birth-header">
            <div className="birth-eyebrow">本地排盘 · 知识库增强</div>
            <h1 className="birth-title">紫微斗数排盘</h1>
            <p className="birth-subtitle">填写出生信息后生成十二宫命盘。AI 单宫分析只使用当前命盘与项目内置知识资料。</p>
          </div>
          <BirthForm onSubmit={handleChartGenerated} />
        </div>
      </main>
    );
  }

  // ── 已起盘：命盘 + 解读 ──
  return (
    <main className="palace-workbench">
      <header className="palace-workbench-header">
        <div className="palace-workbench-brand">
          <div className="palace-workbench-title">紫微斗数 · 十二宫工作台</div>
          <div className="palace-workbench-meta">{chart.birthInfo.name || '未命名命盘'} · {chart.wuxingJuName} · 本地知识库分析</div>
        </div>
        <div className="palace-workbench-actions">
          <button type="button" className="workbench-button" onClick={toggle}>
            {theme === 'dark' ? '浅色' : '深色'}
          </button>
          <button type="button" className="workbench-button" onClick={() => { setChart(null); setSelectedPalace(null); }}>
            重新起盘
          </button>
        </div>
      </header>

      <div className="palace-workbench-grid">
        <section className="workbench-surface">
          <ChartBoard chart={chart} onPalaceSelect={setSelectedPalace} />
        </section>
        <aside className="workbench-detail">
          <PalaceDetailPanel chart={chart} selectedPalace={selectedPalace} />
        </aside>
      </div>
    </main>
  );
}
