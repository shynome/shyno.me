---
title: 2024开年做什么? 折腾软路由!
tags: ['软路由', 'openwrt', 'qemu', 'n100', '虚拟化']
---

## 起

最近看了很多软路由的视频, 让我对我的二手软路由 J1900 的不满越来越大,
最终购入了 4 个 2.5G 网口的 n100

虽然我现有的家庭网络环境只支持 1G, 落入了消费主义陷阱呢(消费才能彰显自己的价值), 苦笑

#### 两个软路由配置对比

|           |      J1900 |       N100 |
| --------- | ---------: | ---------: |
| 购入时间  | 2020-12-10 | 2024-01-02 |
| 价格      |     310 元 |     800 元 |
| 内存+硬盘 |      2G+8G |    4G+128G |
| 网口      |      1G x2 |    2.5G x4 |
| 成色      |       二手 |       全新 |
| 散热      |   静音猫扇 |   无声外壳 |
| 性能      |       1 倍 |       4 倍 |

配置对比下来看起来还不错, 没有买到配置, 还蛮值的, 虽然性能完全溢出

不过无声这点也还蛮重要的, 可以直接放在卧室里

## 折腾软路由 openwrt

### 下载

下载页面: https://downloads.openwrt.org/releases/23.05.2/targets/x86/64/

点击下载: [openwrt-23.05.2-x86-64-generic-ext4-combined-efi.img.gz](https://downloads.openwrt.org/releases/23.05.2/targets/x86/64/openwrt-23.05.2-x86-64-generic-ext4-combined-efi.img.gz)

选 ext4-combined-efi 的, 这个带引导可以直接写到硬盘里启动, 因为是软路由要扩容硬盘所以选 ex4

### 安装翻墙软件

#### 首先更新软件源, 不然国内下载太慢

用下方内容替换 /etc/opkg/distfeeds.conf

```txt
src/gz openwrt_core https://mirrors.tuna.tsinghua.edu.cn/openwrt/releases/23.05.2/targets/x86/64/packages
src/gz openwrt_base https://mirrors.tuna.tsinghua.edu.cn/openwrt/releases/23.05.2/packages/x86_64/base
src/gz openwrt_luci https://mirrors.tuna.tsinghua.edu.cn/openwrt/releases/23.05.2/packages/x86_64/luci
src/gz openwrt_packages https://mirrors.tuna.tsinghua.edu.cn/openwrt/releases/23.05.2/packages/x86_64/packages
src/gz openwrt_routing https://mirrors.tuna.tsinghua.edu.cn/openwrt/releases/23.05.2/packages/x86_64/routing
src/gz openwrt_telephony https://mirrors.tuna.tsinghua.edu.cn/openwrt/releases/23.05.2/packages/x86_64/telephony
```

#### 安装 V2RayA

```sh
opkg update
opkg install v2raya
```

安装后参考官方的 [启用并运行-v2raya](https://v2raya.org/docs/prologue/installation/openwrt/#启用并运行-v2raya)

有可能会遇到 geoip.dat 和 geosite.dat 数据下载失败的问题, 参考 [这个 issue](https://github.com/v2rayA/v2rayA/issues/744#issuecomment-1793140182) 下载

#### 配置 V2RayA

参考官方的[快速上手](https://v2raya.org/docs/prologue/quick-start/)

只不过地址改为: http://192.168.1.1:2017

### 安装虚拟机

N100 性能溢出这么多当然要用来跑虚拟机呀

选了几种方案, 最后选中了 [QEMU](https://openwrt.org/docs/guide-user/virtualization/qemu_host)

我最后的运行脚本长这样 `./run_debian`

```sh
exec qemu-system-x86_64 -enable-kvm \
  -cpu host -smp 4 -m 3.5G \
  -drive file=debian.img,if=virtio \
  -device virtio-net-pci,mac=E2:F2:6A:01:9D:C9,netdev=br0 -netdev bridge,br=br-lan,id=br0 \
  -daemonize \
  -vnc 192.168.1.1:1
```

**注意:** vnc 端口为 5901 = 5900+1, 所以 vnc 连接地址为: 192.168.1.1:5901, 这点坑了我很久

这个虚拟机可以运行 docker, 有单独的 DHCP IP, 属于内网, 等同于一个单独的机器, 可以用来跑一些任务

## 一些杂七杂八的

写的不是很好, 后面可能会再润色

- 其实我还配置了 WireGurad, 这次没有配置 tinc, 因为在不要求自动发现子节点并且可点对点的情况下 WireGuard 太简单了,
  甚至不能点对点反而成了权限管控的一项功能
- 为啥不选 arm64 架构的软路由?
  可以去看看淘宝的 arm64 的软路由 r4s, 网口 1G x2, 内存 4G, 硬盘 32G 敢要 545 元, 多出 255 元买 N100 香太多了吧, x64 架构的生态 arm64 完全比不了, arm64 经常会碰到需要自己编译软件的问题
