'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Palace, ZiweiChart } from '@/lib/ziwei/types';
import { getPalaceContext, type PalaceSnapshot } from '@/lib/ziwei/palace-context';
import { createChartHash } from '@/lib/commerce/chart-hash';
import type { EntitlementResponse } from '@/lib/commerce/types';

interface PalaceDetailPanelProps {
  chart: ZiweiChart;
  selectedPalace?: Palace | null;
}

interface PalaceAnalysisResponse {
  analysis?: string;
  previewContent?: string;
  locked?: boolean;
  error?: string;
}

interface ServiceStatus {
  ai: { configured: boolean; missing: string[]; model: string | null };
  features: { paymentEnabled: boolean; mockPaymentEnabled: boolean };
  rateLimit: { hourlyLimit: number; dailyLimit: number; publicStoreConfigured: boolean };
  knowledge: {
    loaded: boolean;
    classicBooks: number;
    classicParagraphs: number;
    tianjiChapters: number;
  };
}

interface SavedAnalysis {
  content: string;
  locked: boolean;
}

const DISCLAIMER = '本工具仅供传统文化学习、娱乐和自我观察参考，不构成医学、法律、投资、婚恋或人生重大决策建议。AI 解读可能存在偏差，请理性参考。';

function getStorageKey(chartHash: string, palaceName: string) {
  return `ziwei_ai_palace_analysis_${chartHash}_${palaceName}`;
}

function StarList({ title, stars }: { title: string; stars: string[] }) {
  if (stars.length === 0) return null;
  return (
    <div>
      <div className="text-[9px] mb-1 text-muted">{title}</div>
      <div className="flex flex-wrap gap-1">
        {stars.map(star => <span key={star} className="palace-star-chip">{star}</span>)}
      </div>
    </div>
  );
}

function PalaceCard({ palace, label }: { palace: PalaceSnapshot; label: string }) {
  return (
    <div className="palace-data-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <strong className="text-[11px] text-gold">{label} · {palace.name}</strong>
        <span className="text-[9px] font-mono text-muted">{palace.ganzhi}</span>
      </div>
      <div className="space-y-2">
        <StarList title="主星" stars={palace.majorStars.length ? palace.majorStars : ['空宫']} />
        <StarList title="吉曜" stars={palace.luckyStars} />
        <StarList title="煞曜" stars={palace.shaStars} />
        {palace.sihuaStars.length > 0 && <p className="text-[10px] text-secondary">四化：{palace.sihuaStars.map(item => `${item.starName}化${item.siHua}`).join('、')}</p>}
        {palace.borrowedStars?.length ? <p className="text-[10px] text-secondary">借对宫：{palace.borrowedFromName}（{palace.borrowedStars.join('、')}）</p> : null}
      </div>
    </div>
  );
}

function AnalysisContent({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1" />;
        const heading = /^([一二三四五六七八九]、)/.test(line.trim());
        return <p key={index} className={heading ? 'analysis-heading' : 'analysis-line'}>{line}</p>;
      })}
    </div>
  );
}

export default function PalaceDetailPanel({ chart, selectedPalace }: PalaceDetailPanelProps) {
  const [chartHash, setChartHash] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [locked, setLocked] = useState(true);
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  const context = useMemo(
    () => selectedPalace ? getPalaceContext(chart, selectedPalace.name) : null,
    [chart, selectedPalace],
  );
  const storageKey = selectedPalace && chartHash ? getStorageKey(chartHash, selectedPalace.name) : '';
  const paymentEnabled = serviceStatus?.features.paymentEnabled === true;
  const mockPaymentEnabled = serviceStatus?.features.mockPaymentEnabled === true;

  useEffect(() => {
    let active = true;
    createChartHash(chart).then(hash => active && setChartHash(hash));
    return () => { active = false; };
  }, [chart]);

  const refreshEntitlement = useCallback(async (hash: string) => {
    const response = await fetch(`/api/entitlement?chartHash=${encodeURIComponent(hash)}`, { cache: 'no-store' });
    const data = await response.json() as EntitlementResponse & { error?: string };
    if (!response.ok) throw new Error(data.error ?? '无法读取当前命盘解锁状态');
    setEntitlement(data);
    return data;
  }, []);

  useEffect(() => {
    if (!chartHash || !serviceStatus) return;
    if (!paymentEnabled) {
      setEntitlement({ chartHash, entitlement: 'FREE', unlocked: false });
      return;
    }
    refreshEntitlement(chartHash).catch(err => setError(err instanceof Error ? err.message : '无法读取解锁状态'));
  }, [chartHash, paymentEnabled, refreshEntitlement, serviceStatus]);

  useEffect(() => {
    Promise.all([
      fetch('/api/ai/status', { cache: 'no-store' }).then(response => response.ok ? response.json() as Promise<ServiceStatus> : Promise.reject()),
    ]).then(([status]) => {
      setServiceStatus(status);
      setStatusUnavailable(false);
    }).catch(() => setStatusUnavailable(true));
  }, []);

  useEffect(() => {
    setError('');
    setNotice('');
    setCopied(false);
    setAnalysis('');
    setLocked(paymentEnabled && !entitlement?.unlocked);
    if (!storageKey || !entitlement) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedAnalysis;
      if (!paymentEnabled && saved.locked) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      if (!paymentEnabled || saved.locked || entitlement.unlocked) {
        setAnalysis(saved.content);
        setLocked(paymentEnabled && saved.locked && !entitlement.unlocked);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey, entitlement, paymentEnabled]);

  const requestAnalysis = async (regenerate: boolean) => {
    if (!selectedPalace || !chartHash) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/ai/palace-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart, palaceName: selectedPalace.name, chartHash, regenerate }),
      });
      const data = await response.json() as PalaceAnalysisResponse;
      const content = data.locked ? data.previewContent : data.analysis;
      if (!response.ok || !content) throw new Error(data.error ?? 'AI 解读失败');
      const nextLocked = paymentEnabled && data.locked === true;
      setAnalysis(content);
      setLocked(nextLocked);
      window.localStorage.setItem(storageKey, JSON.stringify({ content, locked: nextLocked } satisfies SavedAnalysis));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 解读失败');
    } finally {
      setLoading(false);
    }
  };

  const mockUnlock = async () => {
    if (!chartHash) return;
    setPaying(true);
    setError('');
    setNotice('');
    try {
      const createResponse = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartHash }),
      });
      const checkout = await createResponse.json() as { checkoutId?: string; error?: string };
      if (!createResponse.ok || !checkout.checkoutId) throw new Error(checkout.error ?? '创建模拟订单失败');

      const paymentResponse = await fetch('/api/payment/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId: checkout.checkoutId, event: 'payment.succeeded' }),
      });
      const payment = await paymentResponse.json() as { message?: string; error?: string };
      if (!paymentResponse.ok) throw new Error(payment.error ?? '模拟支付失败');
      await refreshEntitlement(chartHash);
      setNotice(payment.message ?? '支付成功，当前命盘已解锁');
      if (selectedPalace && analysis) await requestAnalysis(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '模拟支付失败');
    } finally {
      setPaying(false);
    }
  };

  const copyAnalysis = async () => {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const clearAnalysis = () => {
    if (storageKey) window.localStorage.removeItem(storageKey);
    setAnalysis('');
    setError('');
    setNotice('');
  };

  const aiDisabledReason = loading
    ? '正在生成解读'
    : statusUnavailable
        ? '无法读取 AI 状态，请确认本地服务正在运行'
        : !serviceStatus || !chartHash || (paymentEnabled && !entitlement)
          ? '正在检查 AI 配置'
          : !serviceStatus.ai.configured
            ? `AI 未配置，缺少：${serviceStatus.ai.missing.join('、')}`
            : '';

  if (!selectedPalace || !context) {
    return <div className="palace-empty-state"><div><strong>选择一个宫位</strong><p>十二宫均可查看结构数据并生成免费 AI 解读。</p></div></div>;
  }

  return (
    <div className="palace-detail-panel">
      <header className="palace-detail-header">
        <div><span className="panel-eyebrow">PALACE DETAIL</span><h2>{selectedPalace.name}</h2></div>
        {paymentEnabled && (
          <span className={`entitlement-badge ${entitlement?.unlocked ? 'is-unlocked' : ''}`}>
            {entitlement?.unlocked ? '当前命盘已解锁' : '付费解读'}
          </span>
        )}
      </header>

      <div className="palace-status-grid">
        <div className="status-tile"><strong>知识库 {serviceStatus?.knowledge.loaded ? '已加载' : '检查中'}</strong><span>{serviceStatus?.knowledge.loaded ? `${serviceStatus.knowledge.classicBooks} 部古籍 · ${serviceStatus.knowledge.classicParagraphs} 段资料 · 天纪 ${serviceStatus.knowledge.tianjiChapters} 章` : '正在读取本地资料'}</span></div>
        <div className="status-tile"><strong>AI {serviceStatus?.ai.configured ? '已配置' : '未配置'}</strong><span>{serviceStatus?.ai.configured ? serviceStatus.ai.model : '请填写 .env.local 后重启服务'}</span></div>
      </div>

      <div className="palace-detail-scroll">
        <section className="space-y-2">
          <h3 className="panel-section-title">宫位结构</h3>
          <PalaceCard label="本宫" palace={context.targetPalace} />
          <PalaceCard label="对宫" palace={context.oppositePalace} />
          {context.trianglePalaces.map((palace, index) => <PalaceCard key={palace.branch} label={`三合 ${index + 1}`} palace={palace} />)}
          <p className="chart-summary">全盘摘要：命宫 {context.chartSummary.mingGong}，身宫 {context.chartSummary.shenGong}，{context.chartSummary.wuxingJuName}，当前年龄 {context.chartSummary.currentAge}。</p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="panel-section-title">AI 单宫解读</h3>{analysis && <span className="text-[9px] text-muted">已保存到本机</span>}</div>
          {error && <div className="message-box is-error">{error}</div>}
          {notice && <div className="message-box is-success">{notice}</div>}
          {analysis ? (
            <div className={`analysis-box ${paymentEnabled && locked ? 'is-preview' : ''}`}>
              <AnalysisContent text={analysis} />
              {paymentEnabled && locked && mockPaymentEnabled && <div className="preview-lock"><strong>以下内容已锁定</strong><span>解锁后可查看完整解读</span><button type="button" onClick={mockUnlock} disabled={paying}>{paying ? '模拟支付处理中…' : '模拟支付成功'}</button></div>}
            </div>
          ) : (
            <div className="analysis-placeholder">每个 IP 每小时可免费生成 2 次、每天 3 次。已生成的同一命盘宫位会直接读取缓存，不重复计次。</div>
          )}
          {paymentEnabled && mockPaymentEnabled && !entitlement?.unlocked && !analysis && <button type="button" className="unlock-wide-button" onClick={mockUnlock} disabled={paying || !chartHash}>{paying ? '模拟支付处理中…' : '模拟支付成功'}</button>}
          <p className="ai-disclaimer">{DISCLAIMER}</p>
        </section>
      </div>

      <footer className="palace-actions">
        {aiDisabledReason && <div className="message-box is-warning">{aiDisabledReason}</div>}
        <button type="button" className="primary-action" onClick={() => requestAnalysis(Boolean(analysis))} disabled={Boolean(aiDisabledReason)}>{loading ? '解读中…' : analysis ? (paymentEnabled ? '重新生成' : '重新读取') : 'AI 解读此宫位'}</button>
        <button type="button" onClick={copyAnalysis} disabled={!analysis || loading}>{copied ? '已复制' : '复制'}</button>
        <button type="button" onClick={clearAnalysis} disabled={!analysis || loading}>清空分析</button>
      </footer>
    </div>
  );
}
