# 官方 H5 活动相关接口清单

> 调查对象：`https://gqhw.jxmediacenter.com/` 的官方 H5 客户端（uni-app 构建产物）
> 调查时间：2026-11-02
> 接口 Base URL：`https://gqhw.jxmediacenter.com/prod-api`
> 说明：方法/路径均来自官方 chunk 内的接口定义函数；“用途”只有在页面调用点可确认时才标为已证实，否则标注“未证实”。

## 证据文件

| 简称 | 官方 chunk URL | 对应页面 |
|---|---|---|
| mine-list | `https://gqhw.jxmediacenter.com/static/js/pages-mine-activity-list.c06fc2da.js` | 官方“我的活动”（文体）列表页 |
| home-activity | `https://gqhw.jxmediacenter.com/static/js/pages-home-activity.7ef7d668.js` | 官方活动首页/详情相关 |
| volunteer-mine | `https://gqhw.jxmediacenter.com/static/js/pages-home-volunteer-myVolunteer.d2a01bfd.js` | 官方“我的志愿活动”列表页 |
| volunteer-shared | `https://gqhw.jxmediacenter.com/static/js/pages-home-volunteer-index~pages-home-volunteer-myVolunteer.4741f1f8.js` | 志愿活动共享 API 模块 |

主入口：`https://gqhw.jxmediacenter.com/static/js/index.d7829a92.js`

## 列表 type 与 userType

官方“我的活动”页面 `seachList`（evidence: mine-list）：

| type | 含义 |
|---|---|
| 1 | 全部 |
| 9 | 我指导的 |
| 10 | 我创建的 |
| 2 | 待报名 |
| 3 | 报名中 |
| 4 | 待开始 |
| 5 | 进行中 |
| 6 | 已结束 |

官方分流逻辑（evidence: mine-list，`mounted` 与 `handleActivitiyListData`）：

- `this.userType = JSON.parse(sessionStorage.user).userType`
- `userType == 1`：调用 `myActivitiyInfoByStudent`（学生端）
- `userType != 1`：调用 `myActivitiyInfoByManage`（管理端）
- 学生端会隐藏 `id=9`（我指导的）Tab

### 目标集合与候选方案（2026-11-02 澄清，11-03 实测）

- 目标集合：当前账号**能管理**的活动，即**本组织主办**的活动，包含组织内其他成员创建的。
- 需要排除：其它组织主办、当前账号仅以成员/参与者身份加入的活动。
- `type=10`：实测确认只返回**本人创建**的活动（`createBy==userId` 100%）；同组织其他成员创建的活动不会返回 → **范围过窄，不能作为最终方案**。
- `type=1`：会混入其它组织的活动 → **范围过宽**。
- `myActivitiyInfoByManage`：**实测排除**。无论 `type=1` 还是 `type=10`，返回行 `createBy==userId` 均为 100%，只含本人创建，不覆盖组织内他人创建的活动；不能作为“我能管理的活动”的服务端过滤。
- 组织归属字段实测：活动行 `orgId`、`deptId`、`orgName` **均为 null**；`schoolId` 全校相同（过宽）；`maintainerId` 是主办方 id，**可作为组织归属判定字段**。
- 最终方案：`type=1` + 客户端按 `maintainerId` 过滤。当前用户的主办组织 id 集合取自 `type=1` 返回行中 `createBy==userId`（本人创建）行的 `maintainerId` 去重；不再请求 `type=10`。用户记录 `orgId` 为空，`/system/team/list` 的 `teamId` 与 `maintainerId` 的对应关系**未实测**，故不采用。
- 加载方式：页大小 10，手动“加载更多”；每批过滤后入列表，若该批属于本组织的行少于 3 条则额外补拉 1 页合并（只补一次、不递归）；按 `activityId` 去重；服务端 `total` 不可信（是未过滤总数），以“服务端页返回不足 10 行”作为结束态。

## 接口清单

| 方法 | 路径 | 用途（确认程度） | 关键参数 | 返回关键字段 | 证据 |
|---|---|---|---|---|---|
| GET | `/getInfo` | 当前登录用户信息（已实测：附件返回 HTTP 200） | 无 | `data.user.userId`、`userType`、`userName`、`deptId`、`orgId`、`roles`、`permissions` | 实测附件；本项目 [auth.ts](file:///c:/Users/Roy-Jin/CODE/Projects/NodeJS/MyGit_Projects/gqek-proxy-app/src/api/modules/auth.ts#L62-L83) |
| GET | `/activity/activityInfo/myActivitiyInfoByStudent` | 学生端“我的活动”（已证实：mine-list 调用；实测 `type=10` 仅本人创建，`type=1` 含多组织） | `pageSize`、`pageNum`、`type` | `total`、`rows`；行内含 `maintainerId`、`createBy`、`studentId`、`schoolId`；`orgId/deptId/orgName` 为 null | mine-list；probe 实测 |
| GET | `/activity/activityInfo/myActivitiyInfoByManage` | 非 `userType=1` 分支的“我的活动”（已证实分支调用；**实测只返回本人创建**，`createBy==userId` 100%，不覆盖组织内他人创建；本项目不采用） | `pageSize`、`pageNum`、`type` | `total`、`rows`；行内字段同 student 接口 | mine-list、home-activity；probe 实测 |
| GET | `/activity/volunteer/myActivitiyInfoByStudent` | 学生端“我的志愿活动”（已证实：volunteer-mine 调用） | `pageSize`、`pageNum`、`type`、`userId` | `total`、`rows` | volunteer-mine（调用点）、volunteer-shared（定义） |
| GET | `/activity/volunteer/myActivitiyInfoBase` | 志愿“我的”基础信息（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared |
| GET | `/activity/volunteer/myInfo` | 志愿个人信息（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared |
| GET | `/activity/volunteer/listByMobile` | 志愿活动移动端列表（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared |
| GET | `/activity/activityInfo/list` | 活动列表（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared、mine-list |
| GET | `/activity/activityInfo/listByMobile` | 移动端活动列表（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared |
| GET | `/activity/activityInfo/listForMobile` | 移动端推荐/列表（函数名 `suggestListByMobile`；用途未证实） | 未核对 | 未抓包 | home-activity |
| GET | `/activity/activityInfo/listCompletedByStudent` | 学生已完成活动（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared、home-activity |
| GET | `/activity/activityInfo/listCompletedByOrg` | 组织已完成活动（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity |
| GET | `/activity/activityInfo/myActivitiyInfoByDraft` | 草稿列表（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity、mine-list |
| GET | `/activity/activityInfo/mySignActivityInfo` | 我报名/签到的活动（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity、mine-list |
| GET | `/activity/activityInfo/{activityId}` | 活动详情（已证实：调用点拼接 `activityId`） | 路径参数 `activityId` | 未抓包 | mine-list、volunteer-shared（`activityInfoDetails`） |
| POST | `/activity/activityInfo` | 新增活动（定义已证实，用途按路径推断） | body `data` | 未抓包 | mine-list、volunteer-shared |
| PUT | `/activity/activityInfo` | 编辑活动（定义已证实，用途按路径推断） | body `data` | 未抓包 | volunteer-shared |
| GET | `/activity/activityInfo/activityCancellation` | 取消活动（路径已证实，用途未证实） | 未核对 | 未抓包 | mine-list、home-activity |
| POST | `/activity/activityInfo/finish` | 活动结项/完成（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared |
| POST | `/activity/activityInfo/reApplyCreateActivity` | 重新申请创建（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity |
| POST | `/activity/activityInfo/reApplyFinishActivity` | 重新申请结项（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared、home-activity |
| POST | `/activity/activityInfo/signFlagChange` | 签到标记变更（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared |
| POST | `/activity/activityInfo/statisticsActivityAndAchievement` | 活动/成果统计（路径已证实，用途未证实） | 未核对 | 未抓包 | volunteer-shared |
| GET | `/activity/activityInfo/getInfoByStudent/{id}` | 学生活动信息（路径已证实，用途未证实） | 路径参数 `id` | 未抓包 | volunteer-shared |
| GET | `/activity/activityInfo/suggest/` | 推荐列表（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity |
| POST | `/activity/evaluate` | 新增评价（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity |
| GET | `/activity/evaluate/list` | 评价列表（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity |
| GET | `/activity/evaluate/score/{id}` | 评价分数（路径已证实，用途未证实） | 路径参数 `id` | 未抓包 | home-activity |
| GET | `/activity/finishReport/queryByActivityId` | 结项报告查询（路径已证实，用途未证实） | `activityId` | 未抓包 | home-activity |
| GET | `/activity/post/list` | 活动帖子列表（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity |
| POST | `/activity/volunteer` | 新增志愿活动（定义已证实，用途按路径推断） | body `data` | 未抓包 | volunteer-shared |
| PUT | `/activity/volunteer` | 编辑志愿活动（定义已证实，用途按路径推断） | body `data` | 未抓包 | volunteer-shared |
| GET | `/statistics/activity-statistics/simpleList` | 活动统计简表（路径已证实，用途未证实） | 未核对 | 未抓包 | home-activity |

## 关键结论（已实测）

1. `type=10` 实测边界为“本人创建”（`createBy==userId` 100%），不含同组织其他成员创建的活动，不满足目标。
2. `myActivitiyInfoByManage` 实测也只返回本人创建（`type=1` 与 `type=10` 的 `createBy==userId` 均为 100%），**不能**作为“我能管理的活动”的服务端过滤。
3. 活动行 `orgId`、`deptId`、`orgName` 全为 null，`schoolId` 全校相同，均不能用于组织过滤；**`maintainerId`（主办方 id）是唯一可用的组织归属字段**。
4. 已采用方案：`type=1` 拉取 + 按 `maintainerId` 过滤；用户组织 id 集合取自 `type=1` 行中 `createBy==userId` 行的 `maintainerId` 去重（不再请求 `type=10`）。手动“加载更多”，页大小 10，按 `activityId` 去重，不使用服务端 `total`。
5. 残余假设：若某组织在本组织活动的排序位置早于“本人创建”的行，该组织活动会在锚点被识别前被过滤掉，需翻到包含本人创建行的那一页后才开始生效。后续若确认 `/system/user/profile`、志愿 `myInfo` 或 `/system/team/list` 能返回可对应的组织/主办方 id，应替换此推导方式。
