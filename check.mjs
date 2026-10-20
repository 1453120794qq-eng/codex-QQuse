import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const root = new URL('./', import.meta.url);
const serverFile = process.env.QQUSE_SERVER_FILE
  || fileURLToPath(new URL('./plugins/codex-qquse/server/index.mjs', root));
const calls = [];
const mock = createServer(async (request, response) => {
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const action = request.url.slice(1);
  const params = JSON.parse(raw || '{}');
  calls.push({ action, params, authorization: request.headers.authorization });
  const data = {
    get_login_info: { user_id: 10001, nickname: 'Mock QQ' },
    get_status: { online: true, good: true },
    get_friend_list: [{ user_id: 456, nickname: 'Alice', remark: 'friend' }],
    get_group_list: [{ group_id: 123, group_name: 'Test Group' }],
    get_group_msg_history: { messages: [{ message_id: 11, time: 12345, sender: { user_id: 456, nickname: 'Alice' }, message: [{ type: 'text', data: { text: 'hello' } }] }] },
    get_friend_msg_history: { messages: [{ message_id: 12, time: 12346, sender: { user_id: 456, nickname: 'Alice' }, message: [{ type: 'image', data: { file: 'private' } }] }] },
    send_group_msg: { message_id: 13 },
    send_private_msg: { message_id: 14 }
  }[action];
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(data === undefined
    ? { status: 'failed', retcode: 404, wording: 'unknown action' }
    : { status: 'ok', retcode: 0, data }));
});

mock.listen(0, '127.0.0.1');
await once(mock, 'listening');
const port = mock.address().port;
const child = spawn(process.execPath, [serverFile], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    CODEX_QQUSE_HTTP_URL: `http://127.0.0.1:${port}/`,
    CODEX_QQUSE_TOKEN: 'test-secret',
    CODEX_QQUSE_GROUPS: '123',
    CODEX_QQUSE_USERS: '456'
  }
});
let nextId = 0;
const pending = new Map();
const output = createInterface({ input: child.stdout, crlfDelay: Infinity });
output.on('line', (line) => {
  const message = JSON.parse(line);
  const task = pending.get(message.id);
  if (task) {
    pending.delete(message.id);
    task.resolve(message);
  }
});
const errors = [];
child.stderr.on('data', (chunk) => errors.push(String(chunk)));

function rpc(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`MCP ${method} timed out; stderr: ${errors.join('')}`));
    }, 5000);
    pending.set(id, { resolve: (result) => { clearTimeout(timer); resolve(result); } });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

function tool(name, args = {}) {
  return rpc('tools/call', { name, arguments: args });
}

try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
  assert.equal(init.result.serverInfo.name, 'codex-qquse');
  const catalog = await rpc('tools/list');
  assert.deepEqual(catalog.result.tools.map((item) => item.name), [
    'qq_status', 'qq_ensure_gateway', 'qq_list_friends', 'qq_list_groups', 'qq_recent_messages', 'qq_send_message',
    'qq_auto_reply_configure', 'qq_auto_reply_status'
  ]);
  const status = await tool('qq_status');
  assert.equal(status.result.structuredContent.accountId, 10001);
  assert.equal(status.result.structuredContent.online, true);
  assert.equal(JSON.stringify(status).includes('test-secret'), false);
  const friends = await tool('qq_list_friends', { query: 'alice' });
  assert.equal(friends.result.structuredContent.items[0].id, '456');
  const groups = await tool('qq_list_groups', { query: 'Test' });
  assert.equal(groups.result.structuredContent.items[0].id, '123');
  const history = await tool('qq_recent_messages', { kind: 'group', targetId: '123', count: 3 });
  assert.equal(history.result.structuredContent.messages[0].text, 'hello');
  const privateHistory = await tool('qq_recent_messages', { kind: 'private', targetId: 456 });
  assert.equal(privateHistory.result.structuredContent.messages[0].text, '[图片]');
  const denied = await tool('qq_send_message', { kind: 'group', targetId: 999, text: 'blocked' });
  assert.equal(denied.result.isError, true);
  assert.equal(calls.filter((call) => call.action === 'send_group_msg').length, 0);
  const sent = await tool('qq_send_message', { kind: 'group', targetId: 123, text: '[CQ:at,qq=all]' });
  assert.equal(sent.result.structuredContent.messageId, 13);
  const sendCall = calls.find((call) => call.action === 'send_group_msg');
  assert.equal(sendCall.authorization, 'Bearer test-secret');
  assert.deepEqual(sendCall.params.message, [{ type: 'text', data: { text: '[CQ:at,qq=all]' } }]);
  const duplicate = await tool('qq_send_message', { kind: 'group', targetId: 123, text: '[CQ:at,qq=all]' });
  assert.equal(duplicate.result.isError, true);
  assert.equal(calls.filter((call) => call.action === 'send_group_msg').length, 1);
  console.log('MCP and OneBot mock smoke passed');
} finally {
  child.kill();
  mock.close();
}
