import Link from 'next/link';

export const metadata = {
  title: '数据来源与致谢',
  description: '本项目使用的开源代码、紫微斗数样本数据集与古籍资料来源说明。',
};

export default function DataSourcePage() {
  return (
    <main className="data-source-page">
      <article>
        <Link href="/" className="data-source-back">← 返回首页</Link>
        <p className="panel-eyebrow">ATTRIBUTION</p>
        <h1>数据来源与致谢</h1>
        <p className="data-source-lead">本项目是在开源项目基础上进行的二次开发。</p>

        <section>
          <h2>样本数据集</h2>
          <p>本项目使用了紫微斗数开源样本数据集 v3.0（518,400 条），来源：<a href="https://github.com/Renhuai123/ziwei-doushu" target="_blank" rel="noreferrer">https://github.com/Renhuai123/ziwei-doushu</a>，作者：王多鱼AI。</p>
        </section>

        <section>
          <h2>代码与传统文献</h2>
          <p>本项目使用了 Renhuai123/ziwei-doushu 中以 MIT License 开源的排盘代码、应用代码与组件，并保留原项目 LICENSE 和来源信息。古籍原文属于 Public Domain。</p>
          <p>原作者未开源的 AI prompt、后端 API、用户系统、会员、支付、安全校验及部署配置不属于本项目使用范围；本项目不复制、不调用这些内容。</p>
        </section>

        <section>
          <h2>二次开发内容</h2>
          <p>本项目在开源基础上新增了个人自研的 AI 单宫解读、知识库检索组合、按命盘付费解锁、交互体验和产品化功能。上述新增内容不改变对原项目及数据来源的署名。</p>
        </section>

        <aside>本工具仅供传统文化学习、娱乐和自我观察参考，不构成医学、法律、投资、婚恋或人生重大决策建议。AI 解读可能存在偏差，请理性参考。</aside>
      </article>
    </main>
  );
}
