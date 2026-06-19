import Link from 'next/link';

const DISCLAIMER = '本工具仅供传统文化学习、娱乐和自我观察参考，不构成医学、法律、投资、婚恋或人生重大决策建议。AI 解读可能存在偏差，请理性参考。';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>{DISCLAIMER}</p>
      <p>
        数据来源：紫微斗数开源样本数据集 v3.0（518,400 条） ·{' '}
        <a href="https://github.com/Renhuai123/ziwei-doushu" target="_blank" rel="noreferrer">Renhuai123/ziwei-doushu</a>
        {' '}· 作者：王多鱼AI · <Link href="/data-source">完整来源说明</Link>
      </p>
    </footer>
  );
}
