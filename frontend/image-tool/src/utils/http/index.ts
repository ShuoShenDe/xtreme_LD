import type { AxiosRequestConfig } from 'axios'
import { VAxios } from './axios'

// 重写paramsSerializer方法,防止特殊字符被转译
const paramsSerializer = (params: any) => {
  let result = ''
  Object.keys(params).forEach((key) => {
    result += `${key}=${params[key]}&`
  })
  return result.substring(0, result.length - 1)
}

function createAxios(opt?: Partial<AxiosRequestConfig>) {
  const config = { ...opt }
  return new VAxios(config)
}

const axiosInstance = createAxios()

export default axiosInstance

export const setBaseUrl = (url: string) => {
  axiosInstance.setBaseURL(url)
}
