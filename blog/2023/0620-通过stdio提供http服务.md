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

## 代码示意

使用 stdio 提供 http 服务的代码实现

```go
//go:build err4

package main

import (
	"io"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/shynome/err4"
	smux "github.com/hashicorp/yamux"
)

func main() {
	var qTry error
	defer err4.Handle(&qTry)(func() {
		log.Println("e2 main", qTry)
	})
	stdio := &Stdio{Reader: os.Stdin, Writer: os.Stdout}
	session, qTry := smux.Server(stdio, nil)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "hello world")
	})

	var l net.Listener = &StdioListener{session: session}
	qTry = http.Serve(l, nil)
}

type Stdio struct {
	io.Reader
	io.Writer
}

var _ io.ReadWriteCloser = (*Stdio)(nil)

func (i Stdio) Close() error { return nil }

type StdioListener struct {
	session *smux.Session
	code    int
}

var _ net.Listener = (*StdioListener)(nil)

func (l *StdioListener) Accept() (conn net.Conn, qTry error) {
	defer err4.Handle(&qTry)(func() {
		log.Println("e2 accept", qTry)
	})
	stream, qTry := l.session.AcceptStream()
	conn = &StdioConn{stream}
	return
}

func (l *StdioListener) Close() error { return nil }

func (StdioListener) Addr() net.Addr { return StdioAddr("stdio") }

type StdioConn struct {
	*smux.Stream
}

var _ net.Conn = (*StdioConn)(nil)

func (conn StdioConn) RemoteAddr() net.Addr {
	return StdioAddr("stdin")
}

type StdioAddr string

var _ net.Addr = (*StdioAddr)(nil)

func (StdioAddr) Network() string { return "stdio" }
func (StdioAddr) String() string  { return "process" }

```

调用端

```go
//go:build err4

package main

import (
	"io"
	"log"
	"net"
	"os"
	"os/exec"

	"github.com/shynome/err4"
	smux "github.com/hashicorp/yamux"
)

type Stdio struct {
	io.Reader
	io.Writer
}

func (Stdio) Close() error { return nil }

func main() {
	var qTry error
	err4.Handle(&qTry)(func() {
		log.Fatalln("wgo", qTry)
	})

	cmd := exec.Command("go", "run", "./example2")
	cmdIn, cmdWriter := io.Pipe()
	cmdReader, cmdOut := io.Pipe()
	var stdio = &Stdio{
		Reader: cmdReader,
		Writer: cmdWriter,
	}
	cmd.Stdin = cmdIn
	cmd.Stdout = cmdOut
	cmd.Stderr = os.Stderr

	qTry = cmd.Start()

	session, qTry := smux.Client(stdio, nil)

	l, qTry := net.Listen("tcp", ":6060")
	defer l.Close()

	go func() {
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
	}()

	qTry = cmd.Wait()
}

```
