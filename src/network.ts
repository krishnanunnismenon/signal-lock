export const serverOrigin = import.meta.env.DEV
  ? `${location.protocol}//${location.hostname}:3107`
  : location.origin;
export const socketUrl = (role: string, token: string) =>
  `${serverOrigin.replace(/^http/, "ws")}/socket?${new URLSearchParams({ role, token })}`;
export interface HostAccess {
  token: string;
  code: string;
  addresses: string[];
  port: number;
  production: boolean;
}
export async function getHostAccess(): Promise<HostAccess> {
  const response = await fetch(`${serverOrigin}/api/host`);
  const data = await response.json();
  if (!response.ok) throw Error(data.error);
  return data;
}
