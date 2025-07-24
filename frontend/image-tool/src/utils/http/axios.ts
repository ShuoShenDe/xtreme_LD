import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'
import { getAuthToken, getRefreshToken, setAuthToken, removeAuthToken } from '@/utils/auth'
import mitt from '@/utils/mitt'   


axios.defaults.withCredentials = true

export interface Result<T = any> {
  code: number
  type: 'success' | 'error' | 'warning'
  message: string
  result: T
}

interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// /******方式一*****/
// //允许所有请求
// response.setHeader("Access-Control-Allow-Origin", "*");
// //允许访问类型
// response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT, HEAD");
// //这里设置允许的自定义header参数
// //content-type: 请求参数的编码格式（必填）
// //x-www-form-urlencoded -- name1=value1&name2=value2…
// //multipart/form-data -- 文件上传编码格式
// response.setHeader("Access-Control-Allow-Headers", "content-type,Token");
// //指定本次预检请求的有效期，单位秒，在此期间不用发出另一条预检请求。
// response.setHeader("Access-Control-Max-Age", "3600");

export class VAxios {
  private axiosInstance: AxiosInstance
  private options: AxiosRequestConfig
  private isRefreshing = false
  private refreshSubscribers: ((token: string) => void)[] = []

  constructor(options?: AxiosRequestConfig) {
    this.options = options || {}
    this.axiosInstance = axios.create(options)
    this.setupInterceptors()
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) return null

      const response = await axios.post<RefreshTokenResponse>(
        '/api/v1/keycloak/realms/ld/protocol/openid-connect/token',
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: 'ldp'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      const { access_token, refresh_token } = response.data
      setAuthToken(localStorage.getItem('login_username') || '', access_token, refresh_token)
      return access_token
    } catch (error) {
      console.error('Token refresh failed:', error)
      removeAuthToken()
      return null
    }
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token))
    this.refreshSubscribers = []
  }

  private subscribeTokenRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback)
  }

  get<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: 'GET' })
  }

  post<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: 'POST' })
  }

  put<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: 'PUT' })
  }

  patch<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: 'PATCH' })
  }

  delete<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: 'DELETE' })
  }

  request<T = any>(config: AxiosRequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .request<any, AxiosResponse<Result>>(config)
        .then((res: AxiosResponse<Result>) => {
          resolve(res as unknown as Promise<T>)
        })
        .catch((e: Error) => {
          if (axios.isAxiosError(e)) {
            // rewrite error message from axios in here
          }
          reject(e)
        })
    })
  }

  /**
   * @description: Interceptor configuration 拦截器配置
   */
  private setupInterceptors() {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        const token = getAuthToken()
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data
      },
      async (error) => {
        const originalRequest = error.config

        // 如果是 401 错误且不是刷新 token 的请求
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url.includes('refresh_token')
        ) {
          if (this.isRefreshing) {
            // 如果正在刷新，将请求添加到队列
            return new Promise(resolve => {
              this.subscribeTokenRefresh(token => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`
                resolve(this.axiosInstance(originalRequest))
              })
            })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          // 尝试刷新 token
          const newToken = await this.refreshToken()
          this.isRefreshing = false

          if (newToken) {
            this.onRefreshed(newToken)
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`
            return this.axiosInstance(originalRequest)
          } else {
            // token 刷新失败，清除 token 并返回错误
            removeAuthToken()
            mitt.emit('auth:logout')  // 发出登出事件，由 App.vue 或其他组件处理路由跳转
            return Promise.reject(error)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  setBaseURL(baseURL: string) {
    this.axiosInstance.defaults.baseURL = baseURL
  }
}
