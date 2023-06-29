---
title: smux 太酷啦, 通过 stdio 提供 http 服务
---

## Why

最近看到别人在炫耀自己做的 serverless 性能很强, 于是我也想炫耀下自己的 [`go-wagi`](https://github.com/shynome/go-wagi)

于是简单的测了下速, 干, 居然不到 100 req/s, 我电脑可是 16 核的呀, 这样不行, 于是想办法如何优化下

最后发现 golang 编译出来的 7.6M 大的 cgi wasm 运行起来就是这么慢, 加缓存也没有用, 于是弃了

刚好最近也在做 [err4-go vscode](https://github.com/shynome/err4-go-vscode), 其中也用到了远程调用, 突发奇想能不能用 smux 复用 stdio 来提供 http 服务呢?

一试, 可行! 既然能提供 http 服务了, 那 go-wagi 的性能优化也可以使用这个法子, 妙啊!

不过快上工了, 今天就先写到这

## 优化后的性能

caddy 反代后有 5013 req/s, 直连有 5844 req/s, 简直强到逆天.

选的 runtime 是编译器(Compiler), 如果选解释器(Interpreter)的话也是只有 200 req/s.

性能翻了 25 倍

如果使用 shell 调用的话, 为 120435 req/s, 是 wasi 单核调用的 20 倍

如果直接监听 tcp 端口的话, 为 212072 req/s, 是 shell 调用的 1.76 倍, wasi 单核调用的 36 倍

ps: wasi 开多进程多核处理的性能测试, 留到下个项目来测试吧. 我的电脑是 16 核的. 用的 wrk 测试

## 代码示意

使用 stdio 提供 http 服务的代码实现

```go
package main

import (
	"io"
	"log"
	"net/http"
	"os"

	smux "github.com/hashicorp/yamux"
	"github.com/lainio/err2/try"
)

func main() {
	stdio := &Stdio{Reader: os.Stdin, Writer: os.Stdout}
	session := try.To1(smux.Server(stdio, nil))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "hello world")
	})

	try.To(http.Serve(session, nil))
}

type Stdio struct {
	io.Reader
	io.Writer
}

var _ io.ReadWriteCloser = (*Stdio)(nil)

func (i Stdio) Close() error { return nil }

```

调用端

```go
package main

import (
	"io"
	"log"
	"net"
	"os"
	"os/exec"

	"github.com/lainio/err2/try"
	smux "github.com/hashicorp/yamux"
)

func main() {

	cmd := exec.Command("go", "run", "./example2")
	cmdIn, cmdWriter := io.Pipe()
	cmdReader, cmdOut := io.Pipe()
	var stdio = &Stdio{Reader: cmdReader, Writer: cmdWriter}
	cmd.Stdin = cmdIn
	cmd.Stdout = cmdOut
	cmd.Stderr = os.Stderr

	try.To1(cmd.Start())

	session := try.To1(smux.Client(stdio, nil))

	l := try.To1(net.Listen("tcp", ":6060"))
	defer l.Close()

	for {
		var conn net.Conn
		conn, qTry = l.Accept()
		go func(conn net.Conn) (qTry error) {
			defer err4.Handle(&qTry)(func() {
				log.Println("conn", qTry)
			})

			defer conn.Close()
			stream, qTry := session.OpenStream()
			go io.Copy(stream, conn)
			_, qTry = io.Copy(conn, stream)
			return
		}(conn)
	}

}

type Stdio struct {
	io.Reader
	io.Writer
}

func (Stdio) Close() error { return nil }
```
