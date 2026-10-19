# codex-QQuse 使用指南

## 1. 准备 QQ 网关

安装并登录支持 OneBot v11 的本机 QQ 网关，例如 [NapCat Windows Shell](https://napneko.github.io/guide/boot/Shell) 或 [SnowLuma Windows 版](https://snowluma.github.io/zh/docs/guide/deploy/windows)。本插件只需要 **HTTP 服务端**；WebSocket 端口不能填到 HTTP 地址中。

在网关中启用 OneBot HTTP 服务端，建议地址设为 `127.0.0.1`、端口 `3000`，并设置 access token。NapCat 的网络配置入口和字段见[官方配置说明](https://napneko.github.io/config/basic)。QQ 扫码登录、WebUI 管理和网关更新由使用者在本机完成。

## 2. 配置 Codex 环境变量

在**运行 Codex Desktop 的同一台电脑、同一个 Windows 用户**下配置用户环境变量：

| 变量 | 示例/含义 |
| --- | --- |
| `CODEX_QQUSE_HTTP_URL` | `http://127.0.0.1:3000/`；不设置时使用此默认值。仅接受本机 HTTP 根路径。 |
| `CODEX_QQUSE_TOKEN` | 网关 OneBot HTTP 的 access token；若网关未设置则留空。不要写入仓库或聊天。 |
| `CODEX_QQUSE_USERS` | 允许读写的好友 QQ 号，逗号分隔；`all` 表示当前账号的所有好友。 |
| `CODEX_QQUSE_GROUPS` | 允许读写的群号，逗号分隔；`all` 表示当前账号已加入的所有群。 |

可在 Windows 的“环境变量”界面添加这些**用户变量**。下面的 PowerShell 示例仅设置非机密项：

```powershell
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_HTTP_URL', 'http://127.0.0.1:3000/', 'User')
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_USERS', '123456789,987654321', 'User')
[Environment]::SetEnvironmentVariable('CODEX_QQUSE_GROUPS', '1122334455', 'User')
```

`CODEX_QQUSE_TOKEN` 请在本机环境变量界面输入，不要把真实值放入脚本、命令历史或聊天。若使用 `all`，将相应变量的值直接设为 `all`。空值会禁止该类别的聊天记录读取和发送；查询好友、群列表与连接状态仍可使用。`all` 模式在每次读写前检查目标是否仍属于当前好友或群列表。

修改环境变量后**重启 Codex Desktop**，以便新启动的 MCP 进程读取配置。

## 3. 在 Codex 中使用

可以直接提出以下请求：

- “查看我的 QQ 连接状态。”
- “查找昵称包含小明的好友。”
- “查找名称包含项目的群，并读取最近 20 条消息。”
- “给小明拟一条说明今晚会议时间的消息，先给我看正文。”

对于同名好友或群，先用 `qq_list_friends` 或 `qq_list_groups` 核对 ID。`qq_recent_messages` 需要 `private`/`group` 和目标 ID。发送前，Codex 应展示当前 QQ 账号、目标 ID 与最终文本，得到用户针对这次发送的确认后，才调用 `qq_send_message`。若发送超时或返回结果不确定，应先查聊天记录，避免重复发送。

## 4. 常见问题

| 现象 | 排查 |
| --- | --- |
| `qq_status` 连接失败 | 检查网关是否在运行、QQ 是否登录、HTTP 服务端是否监听 `127.0.0.1:3000`。 |
| HTTP 401/403 | 核对 OneBot access token 与 `CODEX_QQUSE_TOKEN`，然后重启 Codex。 |
| HTTP 426 | 把 WebSocket 端口误填成了 HTTP 地址；改用网关的 HTTP 端口。 |
| “不在本地白名单中” | 检查 `CODEX_QQUSE_USERS` 或 `CODEX_QQUSE_GROUPS` 的 ID，并重启 Codex。 |
| `all` 下提示“不在当前账号列表中” | 目标不是当前 QQ 账号的好友，或当前账号尚未加入该群；先核对账号和列表。 |
| 某个历史接口失败 | 不同 OneBot 实现的扩展接口可能有差异；确认网关支持 `get_friend_msg_history` 或 `get_group_msg_history`。 |

插件仅把令牌发送到本机回环地址。`qq_send_message` 以纯文本消息段发送，最多 1000 字符；同一目标与正文在 2 分钟内不会由同一 MCP 进程重复提交。管理好 QQ 网关和本机访问权限，避免将 OneBot HTTP 或 WebUI 暴露到公网。

Codex 插件清单和安装命令参照 [OpenAI Docs 的插件打包说明](https://developers.openai.com/plugins/build/plugins)。
