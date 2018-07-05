>本文发表时间：2018年5月7号

感谢原作者给予的授权！
>原文链接：https://imscc.io/posts/trace/install_jaeger_on_linux/
原文作者： 聪少


最近在折腾Jaeger，Jaeger官网都是介绍如何通过Docker部署，二进制部署文档基本没有（已咨询过作者，作者说没文档！你参考Docker自己部署好了！！！），所以打算写一篇Linux部署。
### Jaeger
Jaeger是Uber推出的一款调用链追踪系统，类似于Zipkin和Dapper，为微服务调用追踪而生。 其主要用于多个服务调用过程追踪分析，图形化服务调用轨迹，便于快速准确定位问题。

#### Jaeger组成
- 前端界面展示UI
- 数据存储Cassandra
- 数据查询Query
- 数据收集处理Collector
- 客户端代理Agent
- 客户端库jaeger-client-*
#### Jaeger服务之间关系
![Jaeger服务之间关系](http://upload-images.jianshu.io/upload_images/8245841-393a21a4d9865b5a.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 打造所需原材料

- [Docker](https://www.docker.com)
- [Cassandra](https://cassandra.apache.org)
- [Jaeger二进制安装包](https://github.com/jaegertracing/jaeger/releases)
- [Jaeger源码](https://github.com/jaegertracing/jaeger)
- [Nginx](http://nginx.org)

### Docker部署
#### CenterOS 7 安装Docker
关于Docker部署网上到处都是，我使用的是CentOS 7，其他版本自行查找，这里就用最简单粗暴的方式安装。
``` shell
yum update -y
yum -y install docker
systemctl start docker
```
#### 替换Docker镜像源
由于国内下载镜像比较慢，这里我将Docker镜像源替换成阿里云。
注册一个阿里云用户,访问 [https://cr.console.aliyun.com/#/accelerator](https://cr.console.aliyun.com/#/accelerator) 获取专属Docker加速器地址。
如图：
![ali_docker_mirror](http://upload-images.jianshu.io/upload_images/8245841-50f2e725cc676c90.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


针对Docker客户端版本大于1.10.0的用户可以通过修改daemon配置文件/etc/docker/daemon.json来使用加速器：
``` shell
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["骚年您老人家的阿里镜像加速器地址"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```
OK！Docker部署到此为止，有人会问我Jaeger用二进制部署了，为啥还需要部署Docker。这里是一个悲伤的故事，Docker是用来部署Cassandra的。因为Cassandra是Java实现的，部署要配置一大堆我不太了解的Java环境，比较麻烦，既然有Docker这种神奇何不好好利用一下呢！部署Cassandra的时候我会把存储挂在到本地硬盘，这样就避免了Docker服务异常关闭导致数据丢失了，所以使用Docker部署无伤大雅，这里又有人会问为何不用Docker部署Jaeger，这又是一件悲伤的故事！！！因为Jaeger本身只有链路跟踪，并没有更高级的业务功能（类似异常告警），所以我们可能会针对Jaeger进行二次开发。So不如自己部署一套，好用来做研究。好了废话不多说让我们继续Jaeger部署之旅吧！

### Cassandra部署
Cassandra是一套开源分布式NoSQL数据库系统。由Facebook开发，用于储存收件箱等简单格式数据，集GoogleBigTable的数据模型与Amazon Dynamo的完全分布式的架构于一身.
Cassandra是一个混合型的非关系的数据库，类似于Google的BigTable。P2P去中心化的存储。很多方面都可以称之为Dynamo 2.0。

#### Docker下载Cassandra
前面已经啰嗦过为什么试用Docker部署Cassandra了，这里就简单介绍如何部署.
``` shell
docker search cassandra
docker pull docker.io/cassandra
```

#### Docker部署Cassandra集群
我准备了3台服务器
``` shell
10.100.7.46
10.100.7.47
10.100.7.48
```
10.100.7.46这台服务器作为种子点

``` shell
docker run --name some-cassandra -v /httx/cassandra/data:/var/lib/cassandra -d -e CASSANDRA_BROADCAST_ADDRESS=10.100.7.47 -p 7000:7000 -p 9042:9042  -e CASSANDRA_SEEDS=10.100.7.46 cassandra:latest
docker run --name some-cassandra -v /httx/cassandra/data:/var/lib/cassandra -d -e CASSANDRA_BROADCAST_ADDRESS=10.100.7.48 -p 7000:7000 -p 9042:9042  -e CASSANDRA_SEEDS=10.100.7.46 cassandra:latest
docker run --name some-cassandra -v /httx/cassandra/data:/var/lib/cassandra -d -e CASSANDRA_BROADCAST_ADDRESS=10.100.7.48 -p 7000:7000 -p 9042:9042  -e CASSANDRA_SEEDS=10.100.7.46 cassandra:latest
```
/httx/cassandra/data这个是我的数据本地保存目录，9042:9042是将客户端链接地址暴露出来。简单吧！

#### 导入Jaeger表结构
导入Jaeger表结构，这里不得不吐槽一下Jaeger！Jaeger二进制安装包里根本没有数据sql文件，而且没有任何文档告诉你SQL文件在哪里找，没安装文档！我表示是崩溃的，最终在源码目录的一个角落中找到SQL文件，路径展示一下：

    $GOPATH/src/github.com/jaegertracing/jaeger/plugin/storage/cassandra/schema/v001.cql.tmpl

``` shell
格式：
cqlsh -h HOST -p PORT -f fileName
cqlsh 10.100.7.46 -f $GOPATH/src/github.com/jaegertracing/jaeger/plugin/storage/cassandra/schema/v001.cql.tmpl 
```
上面的命令是我搜索来的，因为在导入之前我已经手动一条一条加进去了(＞﹏＜)!如果不好用的话，读者可以直接cqlsh一条一条黏上去！！！！
<!-- ### Nginx部署 -->

### Jaeger部署

ok! 现在正式进入主题：Jaeger安装。- [Jaeger二进制安装包](https://github.com/jaegertracing/jaeger/releases)
``` shell
tar -zxvf jaeger-1.4.1-linux-amd64.tar.gz
mv jaeger-1.4.1-linux-amd64 jaeger
``` 

#### Collector部署
``` shell
mkdir collector
mv jaeger-collector collector/collector
nohup ./collector --cassandra.keyspace=jaeger_v1_datacenter1  --cassandra.servers=10.100.7.46,10.100.7.47,10.100.7.48 --collector.zipkin.http-port=9411 1>1.log 2>2.log &
``` 
#### Query部署
``` shell
mkdir query
mv jaeger-query query/query
mv jaeger-ui-build/build query/
cd query
nohup ./query --cassandra.keyspace jaeger_v1_datacenter1  --cassandra.servers 10.100.7.46,10.100.7.47,10.100.7.48 --query.static-files=./build  1>1.log 2>2.log &
``` 

ok 访问你Query的地址 htpp://queryIp:16686 就可以看到久违的jaeger的页面了！
![image](http://upload-images.jianshu.io/upload_images/8245841-c6a01c06f66d08c9.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

#### Agent部署
Agent 部署就比较简单了，指定collector地址就OK了！

``` shell
nohup ./jaeger-agent  --collector.host-port=10.100.7.46:14267   1>1.log 2>2.log &
``` 

See you!



