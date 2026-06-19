# 紫微斗数 AI 单宫解读

一个基于 Next.js、TypeScript 和 DeepSeek 的紫微斗数学习工具。用户完成排盘后，可以点击十二宫中的任意宫位，查看结构化命盘信息，并生成结合当前命盘与项目内知识库的 AI 单宫分析。

本项目是在开源项目 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu) 基础上的个人二次开发版本。新增内容包括 AI 单宫解读、知识检索组合、服务端缓存与限流、宫位详情交互和公网部署配置。

## 在线体验

- 排盘与 AI 解读：https://ziwei-doushu-main-sigma.vercel.app/chart
- 数据来源说明：https://ziwei-doushu-main-sigma.vercel.app/data-source

当前线上版本是免费公开演示版，不包含会员、付费解锁或模拟支付入口。

## 主要功能

- 免费完成紫微斗数排盘
- 十二宫均可点击并查看结构化详情
- 展示本宫、对宫、三方与三方四正信息
- 提取全盘摘要与已识别格局
- 从项目已有资料中检索星曜、四化、格局、《天纪》及古籍内容
- 使用自己的 DeepSeek API 生成单宫分析
- 相同 `chartHash + palaceName` 优先读取 Redis 缓存
- 公网演示版按 IP 限制 AI 调用次数
- 支持亮色和深色主题
- 保留数据来源、免责声明及独立的数据来源页面

## AI 分析原则

AI 请求由服务端组合以下上下文：

1. 当前宫位数据
2. 对宫与三方四正数据
3. 全盘摘要
4. 项目知识库检索结果

输出被要求只基于传入资料进行分析，不编造星曜、宫位或四化，不使用绝对化断语，并以“倾向”“可能”“可观察”等方式表达。内容不构成医学、法律、投资、婚恋或人生重大决策建议。

本项目不调用上游作者的线上付费 API，不使用其未开源 prompt，也不包含或破解其会员、支付与用户系统。

## 技术栈

- Next.js 15 App Router
- React 19
- TypeScript
- Prisma + SQLite（本地开发）
- Upstash Redis（生产缓存与限流）
- DeepSeek OpenAI-compatible Chat Completions API
- Tailwind CSS / CSS Variables
- iztro 与 lunar-javascript
- Vercel

## 项目结构

```text
app/
  api/ai/palace-analysis/   AI 单宫分析接口
  api/ai/status/            服务端配置状态接口
  chart/                    排盘页面
  data-source/              数据来源说明
components/
  BirthForm.tsx             出生信息表单
  ChartBoard.tsx            十二宫命盘
  PalaceDetailPanel.tsx     宫位详情与 AI 分析
lib/
  ai/                       AI 缓存、限流与服务端逻辑
  classics/                 古籍资料
  nihai/                    《天纪》相关资料
  ziwei/                    排盘、四化、格局与类型
  palace-context.ts         三方四正与全盘上下文提取
  knowledge-retrieval.ts    紫微知识检索
prisma/                     本地数据模型
```

## 本地运行

要求 Node.js 20 或更高版本。

```bash
git clone https://github.com/huixinyue92-del/ziwei-doushu-main.git
cd ziwei-doushu-main
npm install
```

复制环境变量模板：

```bash
cp .env.example .env.local
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

编辑 `.env.local`：

```env
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=你的-DeepSeek-API-Key
AI_MODEL=deepseek-chat
DATABASE_URL=file:./dev.db
ENABLE_PAYMENT=false
ENABLE_MOCK_PAYMENT=false
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

启动开发服务器：

```bash
npm run dev
```

访问 http://localhost:3000/chart。

## 生产部署

推荐部署到 Vercel，并在项目后台配置以下环境变量：

```env
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=你的服务端密钥
AI_MODEL=deepseek-chat
ENABLE_PAYMENT=false
ENABLE_MOCK_PAYMENT=false
NEXT_PUBLIC_SITE_URL=https://你的域名
```

生产环境还需要 Upstash Redis。项目同时兼容手动配置的旧变量名：

```env
UPSTASH_REDIS_REST_URL=你的-Upstash-REST-URL
UPSTASH_REDIS_REST_TOKEN=你的-Upstash-REST-Token
```

以及 Vercel Marketplace 使用 `UPSTASH_REDIS_REST` 前缀自动生成的新变量名：

```env
UPSTASH_REDIS_REST_KV_REST_API_URL=自动生成
UPSTASH_REDIS_REST_KV_REST_API_TOKEN=自动生成
```

环境变量更新后需要重新部署才能生效。

## 免费演示限制

- 每个 IP 每小时最多生成 2 次 AI 解读
- 每个 IP 每天最多生成 3 次 AI 解读
- 已生成的相同命盘与宫位优先读取缓存，不重复调用 DeepSeek
- 生产环境关闭支付与模拟支付接口

这些限制只用于控制公开演示的 API 成本，不影响免费排盘和十二宫结构化信息浏览。

## 安全说明

- `AI_API_KEY` 仅由服务端通过 `process.env.AI_API_KEY` 读取
- 不使用 `NEXT_PUBLIC_AI_API_KEY`
- `.env.local`、`.vercel`、本地数据库、`.next` 和 `node_modules` 均不会提交到 Git
- 客户端只通过 `/api/ai/status` 获取“是否已配置”，不会获得密钥内容
- 公网缓存和限流状态保存在服务端 Redis，不依赖浏览器 localStorage

## 数据来源与致谢

本项目使用了紫微斗数开源样本数据集 v3.0（518,400 条），来源：https://github.com/Renhuai123/ziwei-doushu，作者：王多鱼AI。

排盘算法、四化系统、格局知识、部分星曜资料和界面代码来自上游开源项目 `Renhuai123/ziwei-doushu`，相关代码遵循 MIT License；本仓库保留原项目 `LICENSE` 文件及来源说明。骨髓赋、紫微斗数全集、紫微斗数全书等古籍原文属于 Public Domain。

本项目不声称上述开源代码、数据、古籍或传统排盘算法由本项目原创。个人二次开发部分主要是 AI 单宫解读流程、知识检索组合、缓存限流、交互优化和公网演示部署。

## License

代码使用遵循仓库中的 [MIT License](./LICENSE)。上游数据集的使用需保留上述 attribution；古籍原文按 Public Domain 使用。

## 免责声明

本工具仅供传统文化学习、娱乐和自我观察参考，不构成医学、法律、投资、婚恋或人生重大决策建议。AI 解读可能存在偏差，请理性参考。
