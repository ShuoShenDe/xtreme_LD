# xtreme1 relay

请完成 `xtreme1_relay.html` 这个页面. 页面的功能如下:

- 这只是一个跳转页面, 因此界面只需简单的设置一下布局和样式, 能够展示正在跳转或者跳转出错时的信息即可.
- 假设这个页面部署后的地址为 `http://localhost:8190/xtreme1_relay.html`.
- 用户访问这个页面时总是带上 `taskid`, `token`, `ltm`, `type`, `phase` 这些参数, 如 `http://localhost:8190/xtreme1_relay.html?taskid=1234567890&token=1234567890&ltm=https://ltm.example.com&type=image&phase=label`. 其中 `type` 的值为 `image` 或 `pc`, 分别表示 2D 标注和 3D 标注.

- 有了 `ltm` 后, 通过访问 `GET ${ltm}/api/v1/xtreme1_relay/token` 接口, 获取到 `xtreme1_token` 字段. 这个接口在访问的时候需要带上 `Authorization` 头, 头的内容为 `Bearer ${token}`. 获取后的形式如下:

```json
{
    "xtreme1_token": "1234567890"
}
```

- 获取到 `xtreme1_token` 后, 通过如下代码将 `xtreme1_token` 设置到 `cookie` 中:

```js
window.document.cookie = `${document.domain} token=${this.getToken};domain=${document.domain};expires=Fri, 31 Dec 9999 23:59:59 GMT`;
```

- 设置完成之后就完成了 xtreme1 的登录, 接下来继续完成 xtreme1 标注页面的跳转.
- 接下来访问 `POST ${ltm}/api/v1/xtreme1_relay/annotate` 接口, 这个接口在访问的时候需要带上 `Authorization` 头, 头的内容为 `Bearer ${token}`. 请求体如下:

```json
{
    "task_id": "1234567890",
    "phase": "label"
}
```

返回结果如下:

```json
{
    "recordId": 8
}
```

- 如果 `type` 为 `image`, 则跳转到和当前页面同源的 `/tool/image?recordId=8&taskid=1234567890&token=1234567890&ltm=https://ltm.example.com&phase=label` 页面(如 `http://localhost:8190/tool/image?recordId=8&taskid=1234567890&token=1234567890&ltm=https://ltm.example.com&phase=label`). 如果 `type` 为 `pc` 则跳转到和当前页面同源的 `/tool/pc?recordId=8&taskid=1234567890&token=1234567890&ltm=https://ltm.example.com&phase=label` 页面. 即最后一次跳转时将最开始的 `taskid`, `token`, `ltm`, `phase` 参数也带上.

## token 设置优化

目前在 url 中的 token 在 redirect 时会原封不动的进行传递, 这可能会导致 token 泄露. 因此需要进行优化.

- 在 url 中解析到 token 后, 直接使用下面的逻辑从 token 中解析用户名并设置到 `localStorage` 中. 下面是的代码是在 redirect 之后的 vue 项目中的 ts 代码, 现在需要将这个逻辑移植到 `xtreme1_relay.html` 中并改为 js 代码.

```ts
export const USERNAME_STORAGE_KEY = 'username'
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
```

- 解析之后将 `token` 从 url 中删除.
- 目前 `xtreme1_token` 只是设置到了 `cookie` 中, 需要将 `xtreme1_token` 额外设置到 `localStorage` 中. 对应的 key 为 `token`.
