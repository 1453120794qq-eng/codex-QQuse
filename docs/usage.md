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
| `CODEX_QQUSE_AGENT_WORKDIR` | 可选；自动回复 agent 使用的空工作目录绝对路径。 |

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

自动回复默认关闭。先确认已安装并登录 Codex CLI（运行 `codex --version`），然后明确指定一个好友或群来启用。例如：

- “给好友 123456789 开启自动回复，使用 Codex profile `qq-helper`，风格是简短、友好，不主动谈工作。”
- “关闭群 1122334455 的自动回复。”
- “查看自动回复状态。”

Codex 会调用 `qq_auto_reply_configure`，启用时核对当前 QQ 账号、目标是否仍在好友/群列表中，并读取最近消息作为去重起点；不会把启用之前的历史消息当作新消息回复。之后插件每 5 秒读取已启用会话的最近消息，按每个会话单独保存 Codex CLI 上下文。私聊中新消息会触发回复；群聊只有在消息 @当前机器人时才触发。输入超过 4000 字会截断；每次只发送一条纯文本，最多 1000 字。每个会话限速为每分钟 6 条、每小时 30 条，防止异常循环。

`codexProfile` 选择本机 Codex CLI 的配置 profile（模型与运行时配置）；`agentInstructions` 用来设置这个会话的 agent 风格、角色和关注点。它会启动一个专属 Codex CLI 会话，不会接管当前桌面聊天或调用桌面里的子 agent。未提供 profile 时使用默认 profile。Codex CLI 通过当前用户已有的 Codex 登录状态运行，使用只读沙箱，关闭已配置的 MCP servers，并且不向 agent 启动的 shell 命令传递环境变量；QQ 消息文本仍会进入 Codex CLI 的会话记录，保存在本机 `$CODEX_HOME` 下（未设置时为用户目录下的 `.codex`）。

**安全边界：**只读沙箱阻止写入，但不限制读取当前 Windows 用户本来就能访问的文件。QQ 消息可能包含诱导 agent 的内容；自动回复中的提示词约束不是文件访问控制。只对你信任的会话启用，并避免让自动回复会话处理凭据、私密文件等敏感内容。

启用只针对一个明确的好友或群，是这一个会话未来自动发送回复的持续授权。`CODEX_QQUSE_USERS=all` 或 `CODEX_QQUSE_GROUPS=all` 只扩大手动访问范围，不会启用自动回复。需要停止时，对同一个 `kind` 和 `targetId` 调用 `qq_auto_reply_configure` 并设 `enabled=false`。也可用 `qq_auto_reply_status` 查看运行状态、最近错误和已启用目标；状态不包含消息正文或令牌。

自动回复依赖 OneBot 的 `get_friend_msg_history` / `get_group_msg_history` 接口。Codex Desktop 和插件 MCP 进程需要保持运行。若 OneBot 断开，worker 会按现有 NapCat 自动恢复配置尝试恢复网关；若未启用自动启动或 QQ 正在等待扫码登录，按工具返回提示在本机完成登录。每个会话的最近消息 ID、Codex 会话 ID 和配置保存在本机自动回复状态文件中，不会保存到仓库。

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
