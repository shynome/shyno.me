---
title: go-wagi
tags: ['wasi']
---

# 目标

[`go-wagi`](https://github.com/shynome/go-wagi) 的目标是用来写一些接口, 可以被安全的调用, 类似于 deno

实际上 deno 那边我也做了一版, [uapi](https://github.com/shynome/uapi), 然后发现 js 网络编程生态基本等于没有,
什么都要自己手搓, 所以又转回 golang wasm 了

兜兜转转, 2023-08-08 [go 1.21](https://go.dev/blog/go1.21) 支持了 [wasip1](https://go.dev/doc/go1.21#wasm), 这使得
golang wasm cgi 变得更方便了, 所以最近我又捞起这个项目来了

# 坑

## golang wasm 过大导致解析过慢, 执行也慢

golang 的 http server 简洁易用, 可以很简单的切到 cgi 模式下, 但性能很差, 原因可能是 golang wasm 太大了初始化比较慢,
换成 [wcgi 模式](https://github.com/shynome/go-wagi?tab=readme-ov-file#wcgi-模式) 后, 性能就回到正常的水平上了

|         |    大小 |  qps |
| ------- | ------: | ---: |
| as      | 22.05KB | 3082 |
| go cgi  |  9.38MB | 2305 |
| go wcgi |  9.38MB |   85 |

`Assembly Script` 的手搓 cgi 模式有 3082 qps, 手搓 cgi 简单但手搓网络请求就不简单, 所以还是选择了继续使用 go

## wazero 读取文件时会导致程序挂起

这个问题卡了我 4~5 天, 发现的契机是 wcgi 模式下访问自身会卡死, 然后一直找呀找然后发现 wazero 的文件读取目前就是这样设计的,
需要等待 [support non-blocking files](https://github.com/tetratelabs/wazero/issues/1500)

无奈的是一年前我也踩到过这坑 [wasi stdio is blocking](https://github.com/tetratelabs/wazero/issues/1531), 只能无奈一笑了,
对事物了解不充分

# 使用

虽然坑坑洼洼的, 但 go-wagi 已经处于完成状态, 能热更新, 内存回收 ok, 可以作为 fastcgi server 使用了

## 安装

```sh
go install github.com/shynome/go-wagi@latest
```

## 启动

```sh
go-wagi
```

## 配置 Caddy

```Caddy
# Caddyfile
http://127.0.0.1:7070 {
  root .
  route {
    php_fastcgi 127.0.0.1:7071
    respond 404
  }
}
```

## 创建 wasm 文件

### 编写 `main.go` 文件

```go
package main

import (
  "fmt"
  "net/http"
  "net/http/cgi"
  "os"
)

func main() {
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "index")
  })
  http.HandleFunc("/hello1", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "hello1")
  })
  http.HandleFunc("/hello2", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "hello2")
  })
  // http.ListenAndServe 替换为 cgi.Serve 即可
  if err := cgi.Serve(nil); err != nil {
    fmt.Fprintln(os.Stderr, err)
  }
}
```

### 编译

```sh
GOOS=wasip1 GOARCH=wasm go build -o index.php main.go
```

## 访问

```sh
# 启动 caddy
caddy run
```

另起终端测试 (注意: 首次访问编译 golang wasm module 可能需要 10s 以上的时间)

```sh
curl -i http://127.0.0.1:7070/
curl -i http://127.0.0.1:7070/hello1
curl -i http://127.0.0.1:7070/hello2
```

# 总结

golang 编写无服务器服务是可行的, 构建自己的 FaaS 从未如此简单安全

# 碎碎念

做这个的目标是替换 php 的无服务器场景, 并修复 php 的安全问题, 已达成

核心点热更新也实现, 所以这个项目已经完成, 接下来就是等待 wazero 功能的推进了

后面我会逐步将这个项目应用在生产环境中
