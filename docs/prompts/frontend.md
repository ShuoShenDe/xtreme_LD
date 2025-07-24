# 前端

这是一个网上的开源项目, 项目地址为 [xtreme1](https://github.com/xtreme1-io/xtreme1). 我把这个项目下载下来之后想基于这个项目进行一些修改. 首先我希望从前端的样式开始修改, 请问我应该如何搭建开发环境. 我在项目根目录下执行 `docker compose up` 之后, 可以正常的启动项目. 但是此时的前端是编译好的, 无法实时修改并热加载. 我看到项目的前端代码在 `frontend` 目录下, 其中包含了 `image-tool`, `main`, `pc-tool`, `text-tool` 四个子项目. 比如我希望开发 `main` 子前端项目, 是不是在项目根目录下执行 `docker compose up` 启动所有后端服务, 然后在 `frontend/main` 目录下执行 `npm i` 和 `npm run dev` 以开发模式启动这个 vue 前端项目就可以吗? 开发模式中是否还需要自行配置相关后端请求的代理, 使其能够正常的访问 `docker compose up` 启动的后端服务中的 API. 如果需要配置代理, 应该怎么配置. 你可以查看这个项目相关的 readme 或者联网搜索相关的资料.

## 开发环境需要修的内容

首先在项目根目录下执行 `docker compose up` 启动所有后端服务.

然后在 `frontend/main` 目录下执行 `npm i` 安装依赖. 这里使用 `npm ci` 安装依赖会由于 `package-lock.json` 文件的版本问题导致安装失败, 所以使用 `npm i` 安装依赖. 这样安装依赖时会自动升级 `package-lock.json` 文件的版本. 需要对 `src/main.ts` 文件进行修改, 移除其中的 `import 'vue3-json-viewer/dist/index.css';` 这一行, 因为新版本已经将样式打包到组件中了, 也不存在这个文件了.

对于 `frontend/pc-tool` 子项目, 需要对 `vite.config.ts` 文件进行修改, 添加 `host: true` 配置, 这样就可以在本地访问到后端服务了. 此外还需要对应的修改 `proxy` 中 `/api` 的 `target` 为真实的后端 ip. 这里默认是 `localhost` 如果是本机开发不需要修改. 如果是远程服务器上开发则需要对应的修改为相应的 ip.
