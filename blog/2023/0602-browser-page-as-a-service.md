---
title: 使你的浏览器页面成为反向代理服务
---

# 起

我最近有一个项目要获取微信公众号的数据, 但是微信并没有开放相关的接口, 但这个接口在浏览器里是可以访问的,
这时我就想到了之前的一个项目`wireguard over webrtc`, 将`wg vpn`引入到浏览器里, 浏览器反向代理接口,
应用访问浏览器节点就可以访问浏览器里的 API 接口

# 承

想过做成浏览器扩展, 但是发现做不到. 最后发现 userscript 是最适合的了.

# 合

## 使用

```js
// ==UserScript==
// @name        Xhe Wireguard Connect - 本地测试
// @namespace   Violentmonkey Scripts
// @match       http://127.0.0.1:9090/
// @version     1.0
// @author      -
// @require     https://unpkg.com/xhe-wc@0.0.7/dist/xhe-wc.umd.js
// @description 02/06/2023, 02:52:30
// @grant none
// ==/UserScript==

XheWC.XheConnectInit()
	.then(async () => {
		const xwg = await XheConnect({
			Address: '192.168.4.3/24',
			PrivateKey: 'wH9kjEoFah57agHhVRo/4h7wgGDC8YcW5PiwHFK6L2Q=',
			Peers: [
				{
					PublicKey: '4IvH1x7/eH77q3+CQ5jn/RxDouP6LjWA7wIBYCbltkY=',
					AllowedIPs: ['192.168.4.1/32'],
					Endpoint: 'https://xxxx@signaler.slive.fun?t=xxxxx', // xhe endpoint
					PersistentKeepalive: '25', // 一定要有这个, 没有的话不会自动连接
				},
			],
		});

		const server = await xwg.ListenTCP(80);
		server.Serve().catch((err) => {
			console.err(err);
		});

		await server.ReverseProxy('/', location.origin);

		console.log('反向代理成功');
	})
	.catch((err) => console.error(err));
```

# 注意

- match 的页面只能打开一个, 不然会有两个同公钥的节点存在导致访问失败
- userscript 会被 csp 阻止, 这点可以通过安装 [CSP Unblock](https://chrome.google.com/webstore/detail/csp-unblock/lkbelpgpclajeekijigjffllhigbhobd) 解决
