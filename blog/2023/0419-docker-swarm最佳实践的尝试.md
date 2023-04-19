---
title: docker swarm 部署之我的最佳实践x (性能优化尝试✓)
---

# 前言

docker swarm 部署中会遇到一些坑, 这些坑需要总有一天会踩到, 而我已经踩过了许多,
今天把它整理成文方便大家避开这些坑

#### why not k3s

为什么不用 k3s 代替 docker swarm 部署呢? 这是因为相对 docker swarm 来说 k3s 依赖的组件更多暴露的细节也更多,
导致学习成本也是比 docker swarm 高出很多, 对于人手不足的小公司而言并没有多余的职位/资金分配给运维, 往往需要
后端身兼运维职责, 哪怕是 k3s 中文资料如此丰富的今天, 快速上手 k3s 也不是一件容易的事, 而使用 docker swarm 的话
你可能只需要阅读这篇文章就够了

# docekr swarm 优缺点

### 优点

- docker swarm 在 docker 安装的时候就附带安装了, 无需另外安装.
- 与 docker-compose 共享大多数配置, 如果本地开发用了 docker-compose 的话, 只要稍作修改就能成为部署文件
- debian 11 官方仓库里已经有 `docekr.io` 了, 所以你无需翻墙即可安装使用`Docker version 20.10.5`(`apt install docker.io`即可).
  目前 docker 官方的镜像下载速度国内也不错, 也无需配置国内镜像加速了

### 坑

- `docker stack deploy` 每次都会检查 docker image tag 的 sha256, 如果 tag 有更新的话它会更新镜像,
  这增加了不确定性, 通过设置 `sha256` 解决
- `docker swarm network`默认的`overlay`网络性能很差, 只能到达宿主机性能的 3/4(同台主机), 1/2(跨主机),
  通过使用 `ipvlan mode l3` 网络解决
- `docker volume` 支持的文件系统很少, 通过使用 `systemd mount` 和 `/mnt/f:/container/f:rslave` 解决

# 最佳实践

### 创建 `docker-compose.yml` 文件

官方详细文档: https://docs.docker.com/compose/compose-file/compose-file-v3/

```sh
# 后续的操作都默认在该目录里
mkdir /opt/swarm/
cd /opt/swarm/
# 将下面的文件内容复制到 /opt/swarm/docker-compose.yml
nano docker-compose.yml
```

```yaml
# /opt/swarm/docker-compose.yml
version: '3.8'

x-logging: &logging
  options: { max-size: '200k', max-file: '10' }

x-deploy: &deploy
  replicas: 1
  endpoint_mode: dnsrr
  restart_policy: { condition: on-failure, max_attempts: 3 }
  update_config: { order: start-first, failure_action: rollback }
  rollback_config: { order: start-first }
x-host-port-deploy: &host-port-deploy
  mode: global # 设置了 host 的话, replicated mode 便不再可用
  endpoint_mode: dnsrr
  restart_policy: { condition: on-failure, max_attempts: 3 }
  # 如果用到了主机端口, 那么必须先停止正在占用端口的容器, 否则后续容器的启动会因为端口已被占用而失败导致无法更新
  update_config: { order: stop-first, failure_action: rollback }
  rollback_config: { order: stop-first }

networks:
  default: # 默认的网络, 用来访问互联网
    attachable: true
  link: # 高性能网络, 需要在容器外创建
    external: true
    name: ipvl3
# 下面这些配置都不起任何作用, 只是用以指导如何在主机上创建ipvlan网络 ipvl3. 如有多个节点, 那每个节点都要如此操作
x-ipvl3-network-create-tip:
  # 创建 ipvlan 分为两步
  # 第一步: ` docker network create --config-only --subnet 172.23.0.0/16 --ip-range 172.23.1.0/24 -o ipvlan_mode=l3 -o parent=eth0 ipvl3-config`
  ipam:
    config:
      - subnet: 172.23.0.0/16
      # 这个设置是特定于宿主机, 如果新增了一台宿主机(即node节点)的那么新增的ip_range应为172.23.2.0/24, 以此类推最多可以拥有255个节点
      - ip_range: 172.23.1.0/24
  driver_opts:
    ipvlan_mode: l3
    parent: eth0
  # 第二步: `docker network create -d ipvlan --config-from ipvl3-config --scope swarm --internal --attachable ipvl3`
  # 为什么不能直接在 docker-compose.yml 文件中设置该网络? 因为 docker-coompose network 暂不支持 config-from, 所以只能手动创建该网络
  driver: ipvlan
  internal: true
  attachable: true

services:
  iperf3s:
    image: networkstatic/iperf3:20230419@sha256:39fb418e92188f4f906da2a1582d4b82565ac72e98679d2914ab4546b19bc119
    # 链接到多个网络, 用于性能测试
    networks: [default, link]
    ports:
      - { mode: host, protocol: tcp, target: 5201, published: 5201 }
      - { mode: host, protocol: udp, target: 5201, published: 5201 }
    command: ['-s']
    logging: *logging
    deploy: *host-port-deploy

  proxy:
    image: caddy:2.6.4-alpine@sha256:8b47a88bd36bc9fe75bff823017438cb43d94abe13f638363517e5feeb45a7c6
    # 只连接到内部网络, 该应用不需要访问互联网
    networks: [link]
    command: ['caddy', 'reverse-proxy', '--from', ':80', '--to', 'caddy:80']
    logging: *logging
    deploy: *deploy

  caddy:
    image: caddy:2.6.4-alpine@sha256:8b47a88bd36bc9fe75bff823017438cb43d94abe13f638363517e5feeb45a7c6
    # caddy 需要连接到互联网申请证书
    networks: ['default', 'link']
    ports:
      # 该模式可以获取到访问者的IP
      - { mode: host, protocol: tcp, target: 80, published: 80 }
    command: ['caddy', 'file-server']
    working_dir: '/www'
    volumes:
      # rslave 标记加上后, 主机挂载的网络文件夹也能在容器中看到. (默认是只能看到主机文件看不到挂载文件)
      - /opt/swarm/www/:/www:rslave
    logging: *logging
    deploy:
      <<: *host-port-deploy
      # 仅在主节点上运行该服务
      placement:
        constraints:
          - 'node.role==manager'
```

### 初始化节点

```sh
docker swarm init
# 如果提示有多个ip的话, 单节点使用这个, 多节点的话配置对应的网络就行
docker swarm init --advertise-addr 127.0.0.1
```

### 创建 ipvlan l3 网络

```sh
# 创建本地网络配置, 设置该节点要用到的IP段, 方便以后多节点互相链接
docker network create --config-only --subnet 172.23.0.0/16 --ip-range 172.23.1.0/24 -o ipvlan_mode=l3 -o parent=eth0 ipvl3-config
# 创建 swarm ipvlan network, 注意 --internal 内部网络标识是必需的
docker network create -d ipvlan --config-from ipvl3-config --scope swarm --internal --attachable ipvl3
```

### 部署服务进行测试

```sh
# 预先拉取镜像
docker pull networkstatic/iperf3:20230419@sha256:39fb418e92188f4f906da2a1582d4b82565ac72e98679d2914ab4546b19bc119
docker pull caddy:2.6.4-alpine@sha256:8b47a88bd36bc9fe75bff823017438cb43d94abe13f638363517e5feeb45a7c6
# 创建 caddy 服务声明里的 www 静态文件目录
mkdir www/
# 部署服务
docker stack deploy -c docker-compose.yml test
# 确认服务是否部署完成
docker service ls
```

#### 网速测试

```sh
# container loopback 网络速度测试. 我本机测得为 46G, 39G, 44G
docker exec -ti $(docker ps --latest --filter label=com.docker.swarm.service.name=test_iperf3s --format='{{.ID}}') iperf3 -c 127.0.0.1
# ipvlan 网络速度测试. 我本机测得为 38G, 37G, 38.4G
docker run --rm -ti --network ipvl3 networkstatic/iperf3:20230419@sha256:39fb418e92188f4f906da2a1582d4b82565ac72e98679d2914ab4546b19bc119 -c test_iperf3s
# overlay 网络速度测试. 我本机测得为 32G, 31G, 29.3G
docker run --rm -ti --network test_default networkstatic/iperf3:20230419@sha256:39fb418e92188f4f906da2a1582d4b82565ac72e98679d2914ab4546b19bc119 -c test_iperf3s
# host mode port 网络速度测试. 我本机测得为 29.6G, 28.9G, 29.6G
docker run --rm -ti --network host networkstatic/iperf3:20230419@sha256:39fb418e92188f4f906da2a1582d4b82565ac72e98679d2914ab4546b19bc119 -c 127.0.0.1
```

测完之后, 我想测测 k3s 的网络性能是怎么样的了

很明显, 上面做的一切都因为服务端口暴露的性能短板卡在那了, 要解决这个问题目前只能用 iptables 手动设置端口转发,
目前我对 iptables 不是很熟悉, 无法给出可用建议

### 心态崩了

折腾了这么久, 最后还是在暴露服务端口那性能卡住了, 也没有啥最佳实践了, 用啥都差不多
