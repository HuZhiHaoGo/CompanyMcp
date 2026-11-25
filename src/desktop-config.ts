import path from 'node:path';

const DESKTOP_CONFIG = 'dsh-mcp-tbea-knowledge.json';
export const DESKTOP_DEPLOYMENT_CONFIG = 'desktop-deployment.json';
export const DESKTOP_CONFIG_TEMPLATE = 'config/example.json';

export function desktopConfigLocations(harnessHome: string | undefined) {
  if (!harnessHome || !path.isAbsolute(harnessHome)) {
    throw new Error('无法定位匠宝 Harness 目录，请检查 DSH_HOME 或指定 Harness 的绝对路径');
  }
  return {
    filename: path.join(harnessHome, DESKTOP_CONFIG),
    options: {
      defaultDataDirectory: path.join(harnessHome, 'dsh-mcp-tbea-knowledge-data'),
      defaultDiagnosticsDirectory: path.join(harnessHome, 'logs'),
    },
  };
}

/** 管理脚本也可以从匠宝外部运行。插件激活时只使用宿主传入的 DSH_HOME。 */
export function commandHarnessHome(override?: string) {
  return override ?? process.env.DSH_HOME ?? (process.platform === 'win32' && process.env.APPDATA
    ? path.join(process.env.APPDATA, 'dsh-desktop', 'harness')
    : undefined);
}
