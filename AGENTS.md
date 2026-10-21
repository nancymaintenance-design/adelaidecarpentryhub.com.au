# Adelaide Carpentry Hub 中英文同步维护

本站遵守上级 `E:/Ellis-Services/AGENTS.md` 和 `00-总览.md`。品牌为 MEL ONE，工作副本仅为本目录。

- 英文页面沿用根目录网址，简体中文页面使用 `/zh/`，由同一份页面结构生成，语言切换入口位于 Contact／联系我们之后。
- 英文内容来源为 `src/content-pack`、`build.mjs`、`src/assets/asset-manifest.json`；中文对应翻译集中在 `src/i18n/*.json`，键为完整英文原文，值为完整中文译文。
- 后续任何影响页面含义的正文、标题、摘要、导航、问答、图片说明或表单提示变更，必须同时审查英文与中文。英文原文修改后须更新对应中文键和值；不得用旧翻译覆盖新内容，也不得只保留自动翻译入口。
- 构建会拒绝缺失翻译的新英文文案。执行 `npm run i18n:extract` 可在本站 reports 目录查看缺失原文，翻译完成后重新 `npm run build`。抽取命令只用于维护，输出的单语中间页面不可发布。
- 动态表单、地区搜索与地点上下文文案在 `src/assets/base.js` 的 `ui()` 及中文分支同步维护。不得更改 API 合同、邮箱、拨号目标或可选分析授权行为来实现翻译。
- 正式街道、法定公司及保险机构名称保留准确英文；中文不得增添未经证实的保护状态、资质、价格或保证。术语以词库和当前服务范围为准，标题保持具体服务词，不写软文空话。
- 变更后核查中英文页面对应、hreflang、canonical、中文内链、表单状态、地区搜索与 PC／手机布局。`npm test`、`npm run check` 和双语测试应通过。
- 2026-10-16 最新用户已明确授权：顾问介绍与关于页精简完成、中英文同步后直接上线部署。此授权仅涵盖本站本轮双语实现及关于页变更；后续发布仍须按当次用户授权执行。

## 2026-10-20 精选双语 llms.txt

- 根目录 `/llms.txt` 为单一精选中英索引；既有 `/zh/llms.txt` 保留为相同内容的兼容副本，不删除或改路由。
- 精选 Owner 路由及纳入理由维护在 `src/content-pack/llms-selection.json`；标题和简短摘要由 `tools/llms-resources.mjs` 从当前生成页面 H1 和指定正文选择器取得，不另建品牌事实库。
- 修改页面后执行 `npm run build`；缺页、noindex、canonical 或 hreflang 配对不符会阻止精选索引生成。不要恢复为全量 sitemap 清单，不新增 llms-full.txt 或批量 Markdown 副本。
- 本地测试：`node --test test/llms-curated.test.cjs`。只读线上链接核查：`node tools/audit-llms.mjs`，结果写入本站 reports；如环境需要代理，可明确传 `--proxy=http://127.0.0.1:7897`。模拟 UA 不证明真实机器人来访。
- 2026-10-20 用户在本地交付后明确要求“部署上线”，授权本轮精选双语 llms.txt 经 GitHub → Vercel 发布；不延伸至后续发布。训练爬虫政策、robots、WAF、URL、canonical 和可见页面保持原状。

## 2026-10-20 双语服务导航与咨询路径

- 本轮用户授权优化面包屑、上下级服务入口及咨询路径，仅本地工作分支交付；未授权推送、Preview、合并 main 或生产发布，不沿用上一轮 llms 发布授权。
- `src/content-pack/customer-paths.json` 维护明确的中英短标签、真实父级、服务归属及编辑依据；不要通过 URL 分段自动推断。首页继续承接综合城市业务，优先服务保留已有直达入口；其余服务使用真实服务目录。
- `tools/customer-paths.mjs` 在双语页面生成后统一输出可见路径和唯一 BreadcrumbList。不要恢复旧的分散生成器或只改 JSON-LD；不得改变现有 canonical/hreflang。首页、隐私工具页与 404 不硬塞商业面包屑。
- 单服务指南归属必须经正文核实；服务父页在可见相关导航中给出指南入口，不能仅依靠收起的 FAQ。综合指南保留其栏目。真实案例仍为现有服务页图库，不编造独立案例 URL。
- 任何标签、关系、正文服务入口修改都同时审查中英配对。`breadcrumb_click` 只复用现有 gtag，不新增追踪系统、不上传查询串或个人资料、不当作获客转化。
- 测试：`npm test`；然后 `npm run build`（恢复 Clarity 注入）、`node --test tests/*.test.mjs`、`npm run check`。映射/链接图用 `node tools/customer-paths-audit.mjs after` 导出到本站 reports；候选 HTTP 和浏览器验证工具为 `tools/verify-customer-paths-http.mjs` 与 `tools/verify-customer-paths-browser.mjs`。这些结果不能证明正式站已发布或搜索增长。

## 2026-10-20 参考站对比后的服务目录

- 用户已确认：25项服务添加紧凑页内目录，门窗页调整具体维修小标题，强化既有指南的服务入口；中英文同步，仅本地预览，不改URL、不增加大片区块。本轮不授权推送或部署。
- `src/content-pack/service-navigation.json` 的三个短标签分别对应前三个正文主题；其他入口指向实际报价、相关导航及存在的项目照片。修改服务顺序或增加服务时同步核对标签和目标，不照搬其他品牌/地区事实。
- 翻译继续复用 `src/i18n`，不覆盖相同英文键的已确认翻译。维护目录后运行 `node --test test/service-navigation.test.cjs` 及 `node tools/verify-service-navigation.mjs`，再执行原有全量测试与构建。

## 2026-10-21 本地确认版本发布授权

- 用户本轮明确要求“部署上线”，授权上述已确认的双语面包屑、服务目录和咨询路径经本站 GitHub → Vercel 链路发布。此前“仅本地”的记录为授权前状态，不延伸至其他网站或后续改动。
- 只提交本轮清单及实际引用的静态资源；保留无关未跟踪文件，不强制推送，不修改安全政策、域名或业务事实。

## 2026-10-21 客户文案优化发布授权

- 用户明确要求将本轮 Adelaide Carpentry Hub 中英文文案优化按 GitHub → Vercel 部署上线，并核验正式网站、更新交接资料。授权仅涵盖本轮已确认候选，不延伸至其他站点或后续修改。
- 客户文案的源内容、配套翻译、共享模板和精确修订测试夹具一并发布；Feed/RSS及llms仍按当前正文生成，不新增功能或业务承诺。原18个无关未跟踪散列资源继续保留，不整包提交。
- 本轮内部覆盖、事实依据、修改表及验证证据在本站 reports/customer-first-copy-2026-10-21；复用写作约定在同级 obsidian/客户文案写作规则.md，均不纳入公开构建。
