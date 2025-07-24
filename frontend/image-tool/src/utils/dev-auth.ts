/**
 * 开发环境认证工具
 * 仅在开发/测试环境中使用，不应在生产环境中调用
 */

export function setDevAuthToken() {
  if (import.meta.env.PROD) {
    console.warn('setDevAuthToken should not be used in production');
    return;
  }

  const hostname = window.location.hostname || window.location.host;
  const tokenName = hostname + ' token';
  
  // 检查是否已有token
  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }
  
  // 如果没有token，设置测试token
  if (!getCookie(tokenName)) {
    const testToken = import.meta.env.VITE_TEST_TOKEN || 'test-token-value';
    document.cookie = `${tokenName}=${testToken}; path=/; SameSite=Lax`;
    document.cookie = `Authorization=Bearer ${testToken}; path=/; SameSite=Lax`;
    console.log('Development: Test authentication token set');
  }
}

/**
 * 清除开发环境认证token
 */
export function clearDevAuthToken() {
  const hostname = window.location.hostname || window.location.host;
  const tokenName = hostname + ' token';
  
  document.cookie = `${tokenName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `Authorization=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  console.log('Development: Test authentication token cleared');
}

/**
 * 检查是否有认证token
 */
export function hasAuthToken(): boolean {
  const hostname = window.location.hostname || window.location.host;
  const tokenName = hostname + ' token';
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${tokenName}=`);
  return parts.length === 2;
} 