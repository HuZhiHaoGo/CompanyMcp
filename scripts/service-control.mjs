import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readConfig } from '../src/config.ts';
import { configIdentity, RUNTIME_PROTOCOL } from '../src/runtime.ts';

async function request(base, endpoint, options = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(new URL(endpoint, base), {
        ...options, redirect: 'error', signal: AbortSignal.timeout(2000),
        headers: { Connection: 'close', ...options.headers },
      });
    } catch (error) {
      if (error.cause?.code === 'ECONNREFUSED') return null;
      // 关闭期间旧 HTTP 连接可能被重置，只重试读取状态。
      if (!options.method && attempt === 0 && ['ECONNRESET', 'EPIPE', 'UND_ERR_SOCKET'].includes(error.cause?.code)) continue;
      throw new Error('无法核对本机知识服务状态，请检查本机端口和网络权限');
    }
  }
}

async function runtime(base, authorization, identity) {
  const health = await request(base, '/health');
  if (!health) return null;
  const service = await health.json().catch(() => null);
  if (!health.ok || service?.name !== 'tbea-knowledge' || service.protocol !== 'tbea-knowledge/v1') {
    throw new Error('该端口并非本项目的知识服务，未执行关停');
  }
  const response = await request(base, '/runtime', { headers: { Authorization: authorization } });
  if (!response) return null;
  const info = await response.json().catch(() => null);
  if (!response.ok || info?.schema !== RUNTIME_PROTOCOL || info.configIdentity !== identity || !['dsh', 'manual'].includes(info.owner)) {
    throw new Error('知识服务身份与当前配置不匹配，请核对端口及配置，或退出匠宝、在原手动窗口按 Ctrl+C');
  }
  return info;
}

async function setAutoStart(file, enabled) {
  const raw = JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  raw.service = { ...raw.service, autoStart: enabled };
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
    await fs.rename(temporary, file);
  } finally {
    await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  console.log(`匠宝随启动设置已${enabled ? '启用' : '关闭'}，完全退出并重新打开匠宝后生效。`);
}

async function main(action, filename) {
  const file = path.resolve(filename);
  const config = await readConfig(file);
  if (action === 'enable-auto-start' || action === 'disable-auto-start') {
    await setAutoStart(file, action === 'enable-auto-start');
    return;
  }
  const base = `http://127.0.0.1:${config.port}`;
  const identity = configIdentity(config);
  const authorization = `Bearer ${config.serviceToken}`;
  const info = await runtime(base, authorization, identity);
  if (!info) { console.log('当前配置的知识服务未运行。'); return; }
  if (action === 'check-stopped') throw new Error('请先完全退出匠宝并关停独立 MCP，再清理数据');
  if (action === 'stop-for-uninstall' && info.owner === 'manual') {
    console.log('插件已移除。独立 MCP 仍在运行，可在原窗口按 Ctrl+C 单独关停。');
    return;
  }
  const owner = action === 'stop-manual' ? 'manual' : 'dsh';
  if (info.owner !== owner) {
    throw new Error(info.owner === 'manual'
      ? '当前为独立 MCP。如需关停，请使用 Stop-Service.ps1 -Manual，或在原窗口按 Ctrl+C'
      : '当前服务由匠宝托管，请运行不带 -Manual 的 Stop-Service.ps1');
  }
  const stopped = await request(base, '/shutdown', {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ configIdentity: identity, owner }),
  });
  if (stopped && stopped.status !== 202) throw new Error('服务未接受关停，请检查版本。旧版本可通过完全退出匠宝或在独立窗口按 Ctrl+C 关闭');
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!await request(base, '/health')) {
      console.log(owner === 'dsh' ? '公司知识服务已暂停。完全退出并重新打开匠宝后，按现有自动启动设置恢复。' : '独立 MCP 已关停。');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('未确认知识服务端口释放，请完全退出拥有该服务的程序');
}

const [action, filename] = process.argv.slice(2);
if (!['stop-managed', 'stop-manual', 'stop-for-uninstall', 'check-stopped', 'enable-auto-start', 'disable-auto-start'].includes(action) || !filename) {
  console.error('用法：service-control.mjs <操作> <配置文件>');
  process.exitCode = 1;
} else {
  await main(action, filename).catch(error => {
    console.error(error.code === 'ENOENT' ? '未找到本地配置，请在实际安装目录运行脚本' : error.message);
    process.exitCode = 1;
  });
}
