# 全站内容 SEO 优化范围与词条承接表

状态：业主于 2026-10-10 明确回复“按方案执行”；授权本地实现，不授权发布。

## 目标与依据

按业主要求优化全站搜索意图匹配、标题层级、E-E-A-T、FAQ、内链和咨询转化，保留 MEL ONE 原有克制、务实、清晰的英文品牌语气。

词条来源：C:/Users/UFTR/Desktop/Entry/7、adelaidecarpentry/Adelaide_Carpentry_AI_Keyword_Map.md，研究日期 2026-09-29。该表含 571 条主词、31 个 Owner 路由簇，主词没有实测月搜索量；501 个地名是研究候选，不是已确认覆盖。Owner 是内部规划概念，不是 Google 排名标签。下表是语义承接建议，不代表已通过 GSC 证明抢词，也不证明新增服务能力。

代码基线：4678f2ab345274982acff7768ab3142467bf7e81。当前生成 sitemap 为 38 页：7 核心页、18 服务页、8 指南、5 地区页；另有不收录的 404。保留这些网址与结构，不迁移 URL、不批量建新页。

## 共同约束

- 仅本地实现、测试和预览。禁止 git push、GitHub API 写入、PR 合并、Vercel 部署及正式域名修改；必须等业主看过本地结果并明确确认后，另行发布。
- 英文面向客户，中文用于内部报告。保留品牌名称、视觉设计、真实联系方式、四个平台链接及 Logo、真实办公室 63 Pirie St 和七天 09:00–21:00（Australia/Adelaide）。
- 不制造执照、监督资质、评价、评分、案例、工程地址、获奖、审核人、统计数据、响应时限或发布日期。已有公司/保险资料保留并注明其证据边界，不能推导成所有工程均具资质。
- 未证实的价格、免费报价、固定工期、保修年限及审批承诺，改成具体报价变量、范围和确认流程；需要业主提供证据的项目写进内部清单，不把“待核实”批注展示给客户。
- 技术与安全内容采用决策说明，不发布结构、护栏、虫害、防火门、旧材料等高风险 DIY 施工步骤或统一合规阈值。法规事实引用实施时核实的南澳官方来源。
- 词库仅供选题；不新增未确认服务，不扩大地区覆盖，不承诺所有工种由同一人员执行，不强行使用 near me、best、cheap、24/7。
- 照片、尺寸和图纸在初次咨询中为可选项；沿用现有邮件接收方式，不加上传功能、不改表单后端、不发送真实测试询盘。
- 不为字数或关键词密度凑内容。正文要解决对象、症状、选择、边界、报价资料和下一步；FAQ 不承诺搜索富结果或 AI 引用。

## 页面与主要意图

服务路径均保留 /services/ 前缀，指南路径均保留 /insights/ 前缀。主词为编辑方向，可自然语序表达，不必逐字重复。

| 现有服务 slug | Owner | 主要意图/主词 | 内容重点与分流 |
|---|---|---|---|
| house-framing | O25 | framing carpenter Adelaide | 图纸、结构责任、进场及检查；不写通用材料/连接规则 |
| outdoor-living | O14/O16 | outdoor carpentry Adelaide | 新建 decking/pergola 范围；现有 deck 翻新转专页 |
| fix-out-second-fix | O09 | second fix carpentry Adelaide | 完工阶段的整体木作包；具体饰条维修转专页 |
| formwork-carpentry | 现有独立意图 | formwork carpenter Adelaide | 图纸、浇筑界面、责任和施工安排；词库无完全对应簇 |
| fitout-refurbishment | O27 | commercial carpenter Adelaide | 商业木作范围、运营期间进场、专业交接 |
| custom-kitchen-bathroom | O23 | kitchen cabinet installation Adelaide | 柜体、laundry/vanity、材料五金及报价；不扩大成整屋/全浴室装修 |
| architectural-joinery | O23/O10 | architectural joinery Adelaide | 定制饰面与建筑细木作；厨房/衣柜分流到对应页 |
| storage-solutions | O22/O24 | built in wardrobes Adelaide | 衣柜、书架、空间布局、选材、签图和安装 |
| custom-doors-furniture | O03/O04 | custom timber doors Adelaide | 新制门与定制木作；现有门窗故障转维修页 |
| restoration-maintenance | O08/O26 | timber rot repairs Adelaide | 水源、腐朽范围、隐藏损伤、虫害后木作与结构分流 |
| heritage-carpentry | O17 | heritage carpentry Adelaide | 原材保留、型材匹配、建筑状态及审批责任 |
| decking-restoration-flooring | O13/O11 | deck restoration Adelaide | 现有 deck 与室内木地板分别设区；新建转户外页 |
| door-window-repairs | O02/O05 | timber door and window repairs Adelaide | 门扇/木窗操作、材料、局修/更换；门框结构与饰条转门梃页 |
| skirting-board-installation-repairs | O09 | skirting board replacement Adelaide | 型材、材料、长度、地面工序与涂饰界面 |
| door-jamb-interior-trim | O02/O09 | door frame repairs Adelaide | jamb/frame、architrave、门扇复用与开口边界 |
| timber-fencing-repairs-replacement | O18 | timber fence repairs Adelaide | 栏板、横梁、立柱、边界授权与更换范围 |
| timber-gates-installation-repairs | O18 | timber gate repairs Adelaide | 下垂、门柱、铰链门闩；自动门/泳池屏障另核验 |
| renovation-carpentry | O01/O26 | renovation carpenter Adelaide | 改造木作协调、阶段施工与授权；不复制所有维修内容 |

| 现有指南 slug | Owner | 信息型任务与承接页 |
|---|---|---|
| why-integrated-carpentry-joinery | O29/O01 | carpenter / joiner / cabinet maker 的选择及交接，链接对应服务 |
| kitchen-renovation-cost-guide | O28/O23 | 柜体报价构成与排除项，链接 custom-kitchen-bathroom；不虚构市场价 |
| heritage-building-timber-restoration | O17 | 保留原则、传统木作与普通改造的区别，链接 heritage-carpentry |
| timber-flooring-oiling-guide | O11相邻意图 | 实木与 engineered flooring 决策及维修/翻新条件，链接 decking-restoration-flooring |
| commercial-fitout-process | O27 | 商业木作工序与各方责任，链接 fitout-refurbishment |
| adelaide-deck-replacement-guide | O13/O14 | 维修还是更换；分别链接 restoration 与 outdoor-living |
| adelaide-custom-wardrobe-planning | O22 | 测量、门型、布局与签图，链接 storage-solutions |
| adelaide-heritage-timber-repairs | O17 | 现场记录与维修范围准备，区别于保护原则指南，链接 heritage-carpentry |

| 核心/地区页 | 意图与改进 |
|---|---|
| / | O01 carpenter Adelaide；快速说明木作范围、选择服务和咨询下一步；保留原品牌表达 |
| /services/ | carpentry services Adelaide；按维修/新制/改造组织选择，不与每个服务争同一主词 |
| /insights/ | 木作决策指南目录；按工种选择、报价、材料及维修方案组织 |
| /faq/ | O28/O29 报价、安排、身份与专业边界；具体任务答案链接唯一服务页 |
| /about/ | MEL ONE 身份与可核实证据；保留已提供公司和保险资料，不虚构作者资历 |
| /contact/ | carpentry quote Adelaide；说明准备信息、预约与书面范围，照片可选 |
| /service-areas/ | 地点咨询与服务路由；不把候选地名当承诺 |
| /service-areas/adelaide-cbd/ | CBD 任务和实际进场问题；不编造当地项目 |
| /service-areas/east-end/ | East End 地点咨询；以项目实际条件写，避免所有建筑一概而论 |
| /service-areas/west-end/ | West End 地点咨询；授权、进场和工作范围核对 |
| /service-areas/north-terrace-riverbank/ | 地点咨询及场所进场条件；不冒称公共机构项目经验 |
| /service-areas/north-adelaide/ | 地点咨询、旧木作/型材核对；不默认每栋建筑受遗产保护 |
| /404.html | 工具页，仅检查导航和页脚不退化，不设 SEO 主词 |

## 已识别内容缺口

1. 18 个服务页目前没有独立服务 FAQ；通用 CTA 多，任务专属决策答案不足。
2. 指南 FAQ 的标题在模板里写死成衣柜问答，扩展前需改成每篇可配置。
3. 全站 16 条 FAQ 含无法仅凭词表和现有资料确认的执照、价格、免费设计、固定工期、24 小时响应、法定/商业保修和审批承诺；还提到不存在的 projects 页面。需要改为有证据或有条件的客户说明。
4. 部分技术句子泛化处理等级、cyclone-rated fixing、持久外观等，应改为按位置、设计和现场确认，不放大未经核实承诺。
5. 现有最低字数测试包含导航与页脚，不能代替正文质量检查。新增报告要单独审阅正文，不将分数当排名预测。
6. 部分主题相邻但不应强行合并 URL：门窗/门框、新 deck/翻新、围栏/门、两篇 heritage 指南。用差异化标题、段落和链接明确分工。

## 验收与交付

- 38 个规范路径不变；每页一个 H1、唯一且描述准确的 title/description，标题层级连续、正文与结构化数据一致。
- 18 服务页、8 指南均有独特、答案优先的 FAQ 与任务专属咨询引导；保留原有有效信息，避免复制模板套词。
- 内链真实可抓取、锚文本明确、路由及片段存在，支持内容回到主要承接服务；无孤立主要服务页。
- 保留真实照片、原有说明与授权边界，不将示意图当真实项目；不新增虚构日期、审稿人或认证。
- npm test、npm run build、npm run check 成功；补充检查非默认测试入口是否相关。独立任务审查和最终全站审查通过。
- 桌面/390px 手机端抽查：首页、两类服务、指南、地区和 Contact；FAQ/焦点/咨询参数正常，无新增横向溢出。
- 提供 Markdown 优化报告、页面/词条映射、待业主补证清单、变更前后内容质量/E-E-A-T/AI 可引用性人工评分（标明方法与局限，不是 Google 指标）。
- 拉起或复用仅本机可访问的预览端口，最终发给业主确认；不部署。

## 参考依据及限制

- [Google people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)：强调有用、可靠、可信来源及描述性标题；不承诺排名提升。
- [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)：避免地名门页、堆词及规模化低价值内容。
- 法规、资质和收费的事实性内容，实施时查南澳官方资料与业主证据；词库中的供应商网站只能帮助理解语言，不能证明 MEL ONE 的能力。
- 当前无 GSC 查询/页面数据、实际线索归因及实测关键词搜索量；不能给出排名、流量或转化增长保证。
