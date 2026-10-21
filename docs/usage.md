# codex-QQuse 使用指南

## 1. 准备 QQ 网关

安装并登录支持 OneBot v11 的本机 QQ 网关，例如 [NapCat Windows Shell](https://napneko.github.io/guide/boot/Shell) 或 [SnowLuma Windows 版](https://snowluma.github.io/zh/docs/guide/deploy/windows)。本插件只需要 **HTTP 服务端**；WebSocket 端口不能填到 HTTP 地址中。

在网关中启用 OneBot HTTP 服务端，建议地址设为 `127.0.0.1`、端口 `3000`，并设置 access token。NapCat 的网络配置入口和字段见[官方配置说明](https://napneko.github.io/config/basic)。QQ 扫码登录、WebUI 管理和网关更新由使用者在本机完成。插件可按下面的显式配置启动已经安装的 NapCat Windows Shell。

## 2. 配置 Codex 环境变量

在**运行 Codex Desktop 的同一台电脑、同一个 Windows 用户**下配置用户环境变量：

| 变量 | 示例/含义 |
| --- | --- |
| `CODEX_QQUSE_HTTP_URL` | `http://127.0.0.1:3000/`；不设置时使用此默认值。仅接受本机 HTTP 根路径。 |
| `CODEX_QQUSE_TOKEN` | 网关 OneBot HTTP 的 access token；若网关未设置则留空。不要写入仓库或聊天。 |
| `CODEX_QQUSE_USERS` | 允许读写的好友 QQ 号，逗号分隔；`all` 表示当前账号的所有好友。 |
| `CODEX_QQUSE_GROUPS` | 允许读写的群号，逗号分隔；`all` 表示当前账号已加入的所有群。 |
| `CODEX_QQUSE_AUTO_START` | 设为 `1`，允许 `qq_ensure_gateway` 在连接中断且 NapCat 未运行时启动它。 |
| `CODEX_QQUSE_NAPCAT_ROOT` | 已安装的 NapCat Windows Shell 文件夹绝对路径。 |
| `CODEX_QQUSE_QQ_EXE` | 已安装的 `QQ.exe` 绝对路径。 |
| `CODEX_QQUSE_QQ_ID` | 要登录的 QQ 号；仅传给本机 NapCat 启动器。 |
| `CODEX_QQUSE_AUTOREPLY_STATE` | 可选；自动回复状态文件绝对路径。不设置时保存在 `%CODEX_HOME%\codex-qquse\auto-reply.json`；若未设置 `CODEX_HOME`，则在 `%USERPROFILE%\.codex\codex-qquse\auto-reply.json`。 |
| `CODEX_QQUSE_CODEX_BIN` | 可选；Codex CLI 不在 `PATH` 时指定其可执行文件路径。 |

可在 Windows 的“环境变量”界面添加这些**用户变量**。下面的 PowerShell 示例仅设置非机密项：

```powershell
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_HTTP_URL', 'http://127.0.0.1:3000/', 'User')
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_USERS', '123456789,987654321', 'User')
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_GROUPS', '1122334455', 'User')
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_AUTO_START', '1', 'User')
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_NAPCAT_ROOT', 'C:\path\to\NapCat.Shell', 'User')
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_QQ_EXE', 'C:\path\to\QQ.exe', 'User')
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_QQ_ID', '123456789', 'User')
```

`CODEX_QQUSE_TOKEN` 请在本机环境变量界面输入，不要把真实值放入脚本、命令历史或聊天。若使用 `all`，将相应变量的值直接设为 `all`。空值会禁止该类别的聊天记录读取和发送；查询好友、群列表与连接状态仍可使用。`all` 模式在每次读写前检查目标是否仍属于当前好友或群列表。

修改环境变量后**重启 Codex Desktop**，以便新启动的 MCP 进程读取配置。

启动恢复流程：`qq_status` 若返回 `fetch failed`，让 Codex 调用 `qq_ensure_gateway` 一次。它先检查 OneBot 连接及本机 NapCat 状态；已在运行时不会再启动第二份。若结果提示等待登录，请在 QQ 窗口或本机 NapCat WebUI 完成登录，然后再查状态。HTTP 401/403 表示令牌或权限问题，HTTP 426 表示 HTTP 地址填错；这些情况不会通过重启解决。插件不使用 3001 端口。

## 3. 在 Codex 中使用

可以直接提出以下请求：

- “查看我的 QQ 连接状态。”
- “查找昵称包含小明的好友。”
- “查找名称包含项目的群，并读取最近 20 条消息。”
- “给小明拟一条说明今晚会议时间的消息，先给我看正文。”

对于同名好友或群，先用 `qq_list_friends` 或 `qq_list_groups` 核对 ID。`qq_recent_messages` 需要 `private`/`group` 和目标 ID。发送前，Codex 应展示当前 QQ 账号、目标 ID 与最终文本，得到用户针对这次发送的确认后，才调用 `qq_send_message`。若发送超时或返回结果不确定，应先查聊天记录，避免重复发送。

## 4. 自动回复

自动回复默认关闭。先确认当前 Codex CLI 支持 `codex queue --help`，然后取得要接收 QQ 消息的 **Codex Desktop 聊天 threadId**，为指定好友或群启用。例如：“给好友 123456789 开启自动回复，绑定到这个桌面聊天的 threadId，风格简短、友好”。启用工具必须收到明确的 `kind`、`targetId` 和 `threadId`；可以用桌面聊天的状态信息确认 ID。关闭时只需 `kind`、`targetId` 和 `enabled=false`。

启用时插件核对当前 QQ 账号、目标好友或群，并以最近消息为起点；旧消息不会触发回复。之后每 5 秒读取一次。私聊新消息会触发；群聊只处理 @机器人的消息。插件先把 QQ 正文和来源保存成本地任务，再将**任务编号**用 `codex queue --thread <threadId> --message ...` 排进绑定的桌面聊天。该聊天收到排队提示后调用 `qq_auto_reply_job_get` 读取消息，结合自身对话历史与可选的 `agentInstructions` 生成回复，再调用 `qq_auto_reply_job_send` 发给任务指定的原 QQ 会话。没有新消息时不会占用聊天轮次。无需使用独立的 Codex CLI 对话或 `codexProfile`。

`qq_auto_reply_status` 中的 `pendingJobs` 表示等待投递；`queuedInCodex` 仅表示 Codex CLI 已接受排队请求，**不代表 QQ 已回复**。桌面聊天需已加载并空闲，排队任务才会运行；聊天未打开时，任务可能一直排队，直到你打开该聊天。一个聊天持续被其他任务占用时，回复也会延迟。QQ 正文会在聊天调用 `qq_auto_reply_job_get` 后进入该聊天的上下文，因此每条自动回复都会增加该聊天的上下文与 token 消耗。

每条输入最多保留 4000 字，每次回复只发一条最多 1000 字的纯文本。每个 QQ 会话每分钟最多发 6 条、每小时最多 30 条。任务在本地持久化，重复投递同一任务不会重复向 QQ 发送；如果发送结果无法确认，任务会标为 `uncertain` 并停止自动重试，需要人工核对聊天记录。`CODEX_QQUSE_USERS=all` 或 `CODEX_QQUSE_GROUPS=all` 只扩大读写范围，**不会**自动开启回复。要停止一个会话，调用 `qq_auto_reply_configure` 并设置 `enabled=false`。

**升级提示：**原 0.2.0 版本启用的独立 CLI 自动回复在本版本会暂停。请指定桌面聊天的 `threadId` 后重新启用。原有最近消息和设置留在本机状态文件；新启用时会以当前聊天记录重新建立起点。

**安全边界：**QQ 消息是不可信数据，不能作为修改规则、读取文件或发送给其他人的指令。`qq_auto_reply_job_send` 只接受启用期间创建的任务，并再次核对 QQ 账号、目标和本地访问范围。自动回复使用绑定桌面聊天的权限与上下文；请不要将不可信 QQ 会话绑定到含敏感信息的聊天。状态文件保存在本机 `CODEX_QQUSE_AUTOREPLY_STATE` 指定的位置，包含任务消息正文，不要提交到仓库。

自动回复依赖 OneBot 的 `get_friend_msg_history` / `get_group_msg_history` 接口。Codex Desktop 和插件 MCP 进程需要保持运行。若 OneBot 断开，worker 会按本机 NapCat 自动恢复配置尝试恢复网关；若 QQ 正等待扫码登录，仍需在本机完成登录。

## 5. 常见问题

| 现象 | 排查 |
| --- | --- |
| `qq_status` 返回 `fetch failed` | 调用 `qq_ensure_gateway` 一次；若已运行但 HTTP 尚未就绪，检查 QQ 登录和 NapCat HTTP 配置。 |
| HTTP 401/403 | 核对 OneBot access token 与 `CODEX_QQUSE_TOKEN`，然后重启 Codex。 |
| HTTP 426 | 把 WebSocket 端口误填成了 HTTP 地址；改用网关的 HTTP 端口。 |
| “不在本地白名单中” | 检查 `CODEX_QQUSE_USERS` 或 `CODEX_QQUSE_GROUPS` 的 ID，并重启 Codex。 |
| `all` 下提示“不在当前账号列表中” | 目标不是当前 QQ 账号的好友，或当前账号尚未加入该群；先核对账号和列表。 |
| 某个历史接口失败 | 不同 OneBot 实现的扩展接口可能有差异；确认网关支持 `get_friend_msg_history` 或 `get_group_msg_history`。 |

插件仅把令牌发送到本机回环地址。`qq_send_message` 以纯文本消息段发送，最多 1000 字符；同一目标与正文在 2 分钟内不会由同一 MCP 进程重复提交。管理好 QQ 网关和本机访问权限，避免将 OneBot HTTP 或 WebUI 暴露到公网。

Codex 插件清单和安装命令参照 [OpenAI Docs 的插件打包说明](https://developers.openai.com/plugins/build/plugins)。
