export const USERNAME_STORAGE_KEY = 'username'
export const TOKEN_STORAGE_KEY = 'token'
export const REFRESH_STORAGE_KEY = 'refresh_token'

// 解码 JWT token 的 payload 部分
function decodeJWTPayload(token: string): any {
  try {
    if (!token) {
      console.error('Token is empty or undefined')
      return null
    }
    
    const parts = token.split('.')
    
    if (parts.length !== 3) {
      console.error('Invalid JWT format: expected 3 parts, got', parts.length)
      return null
    }
    
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT payload:', error)
    return null
  }
}

export function setAuthInfoFromUrl() {
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token') || ''
  
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    // 从 token 中解析出 username.
    try {
      const tokenParts = token.split(" ")
      const actualToken = tokenParts[tokenParts.length - 1]
      
      const tokenInfo = decodeJWTPayload(actualToken)
      if (tokenInfo) {
        const username = tokenInfo.preferred_username
        if (username) {
          localStorage.setItem(USERNAME_STORAGE_KEY, username)
          console.log('Successfully extracted username:', username)
        }
      }
    } catch (error) {
      console.error('Failed to decode token:', error)
    }
    // 在 url 中存放 token 不安全, 将 url 中的 token 删除
    urlParams.delete('token')
    const newUrl = urlParams.toString() 
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }
}

export function setAuthToken(username: string, accessToken: string, refreshToken: string) {
  localStorage.setItem(USERNAME_STORAGE_KEY, username)
  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
  localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken)
}

export function getLoginUsername(): string  {
  return localStorage.getItem(USERNAME_STORAGE_KEY) || 'anonymous'
}

export function getAuthToken(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  return token
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_STORAGE_KEY)
}

export function removeAuthToken() {
  localStorage.removeItem(USERNAME_STORAGE_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_STORAGE_KEY)
}

export function hasToken(): boolean {
  return !!getAuthToken()
}

// 为创建请求添加公共字段
export function addCreateFields<T extends Record<string, any>>(data: T): T & { creator: string, created: string, updated: string } {
  const now = new Date().toISOString()
  return {
    ...data,
    creator: getLoginUsername(),
    created: now,
    updated: now
  }
}

// 为更新请求添加公共字段
export function addUpdateFields<T extends Record<string, any>>(data: T): T & { updated: string } {
  return {
    ...data,
    updated: new Date().toISOString()
  }
} 

