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
- 本轮仅授权本地工作分支交付，未授权推送、合并 main 或发布生产。训练爬虫政策、robots、WAF、URL、canonical 和可见页面保持原状。
