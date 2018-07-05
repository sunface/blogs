### 结论前置  1。
1. CR（笔者对cockroach的简称）数据库的产品体验比TIDB要好，例如官网、文档、部署维护、后台管理、监控，当然这里不是说tidb不好，tidb兼容mysql协议就非常棒，而且中文文档和中文的客服支持也是极棒的。

2.CR对标准sql的支持比较完善，详情见[sql特性支持](https://www.cockroachlabs.com/docs/stable/sql-feature-support.html)  [sql语句](https://www.cockroachlabs.com/docs/stable/sql-statements.html)

3.单节点性能大概是postgre数据库的60%,延迟抖动控制的较好

4.整体上手速度很快，从看文档、搭建环境到修改一个应用为postgre连接并成功的运行起来，大概1个小时左右

5.吐槽一下简书，代码高亮很不完善，估计是hilight.js中只引入了少数所谓主流语言的插件
### 下载
> [下载地址](https://www.cockroachlabs.com/docs/stable/install-cockroachdb.html)

下载极其简单，只要下载获得cockroach的binary文件(Go语言的可执行文件)即可

### 安装
> [安装文档](https://www.cockroachlabs.com/docs/stable/start-a-local-cluster.html)

**本文使用以下三个节点(host为虚构)**
|节点|Host|
|-|-|
|1|10.100.1.1|
|2|10.100.1.2|
|3|10.100.1.3|

|启动常用启动参数|描述|
|-|-|
|--insecure|不启用TLS加密模式，建议非生产环境使用|
|--host|数据库监听地址，默认为本机的外网IP|
|--port|数据库监听端口，默认为26257|
|--http-port|HTTP请求的端口，比如后台管理服务,默认为8089|
|查看详细|cockroach start -h|
###### 启动节点1
```bash
cockroach start --insecure 
```

启动成功后能看到以下命令行提示(请忽略里面的主机信息):
```bash
* WARNING: RUNNING IN INSECURE MODE!
*
* - Your cluster is open for any client that can access <all your IP addresses>.
* - Any user, even root, can log in without providing a password.
* - Any user, connecting as root, can read or write any data in your cluster.
* - There is no network encryption nor authentication, and thus no confidentiality.
*
* Check out how to secure your cluster: https://www.cockroachlabs.com/docs/stable/secure-a-cluster.html
*

sf:cockroach-v1.1.2.darwin-10.9-amd64 sf$ CockroachDB node starting at 2017-11-04 03:57:55.322402865 +0000 UTC (took 1.0s)
build:      CCL v1.1.2 @ 2017/11/02 19:30:00 (go1.8.3)
admin:      http://sf.local:9090
sql:        postgresql://root@sf.local:26257?application_name=cockroach&sslmode=disable
logs:       /Users/sf/Downloads/cockroach-v1.1.2.darwin-10.9-amd64/cockroach-data/logs
store[0]:   path=/Users/sf/Downloads/cockroach-v1.1.2.darwin-10.9-amd64/cockroach-data
status:     restarted pre-existing node
clusterID:  514ebcce-7320-4d72-b2db-b618c0b404bf
nodeID:     1
```

这里有三点需要注意
- admin: 后台管理地址
- logs: 日志位置
- store: 数据存储位置

其中logs和store位置都可以在启动参数中指定

###### 依次启动节点2和3
```bash
cockroach start --insecure --join=10.100.1.1:26257
```
如果三个节点是部署在同一台机器
```bash
cockroach start \
--insecure \
--store=node2 \
--host=localhost \
--port=26258 \
--http-port=8081 \
--join=localhost:26257
```

######结果查验

至此所有节点都启动成功，我们来看看集群是否搭建成功：
访问任意节点的后台管理http://host:8080例如http://10.100.1.2:8080

可以看到以下界面(以下所有图里的节点地址和我们的三个虚拟节点地址不一致，因为笔者周末在家临时搭建了一套集群):

![后台管理首页](http://upload-images.jianshu.io/upload_images/8245841-b718e156b1ddb756.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- 正中间区域是总体监控图，可以在Dashboard中选择更多的监控维度，具体的监控项解释可以把鼠标移动到叹号上查看
- 右边是集群状态和集群重要事件通知

下面我们选择**View nodes list**，进入以下界面:

![集群节点状态](http://upload-images.jianshu.io/upload_images/8245841-6f56e1cca20934d3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- 这里能看到每个节点的状态
- Bytes和Replicas代表了数据的分布，因为CR每份数据默认是存三份，我们恰好三个节点，因此每个节点存一份，最终三个节点存储的bytes和replicas会同步一致，实际上tidb也差不多是这个原理，都是基于谷歌的f1和spanner论文产生的
- 点击logs可以查看每个节点的详细日志

至此所有的安装就结束了，下面开始简单的使用之旅

### CR客户端
CR的客户端其实就是CR本身，是不是很爽？服务器程序和客户端程序都是同一个执行文件。

###### 连接数据库
用户可以选择连接到三台服务器上去使用CR客户端，也可以在开发机(本地电脑)安装一个CR客户端(适合当前系统的cockroach可执行程序)，这里我们选择在本地电脑上远程连接，可以连接三台服务器中的任何一台:
```bash
cockroach sql --insecure --host=10.100.1.2 --port=26257
```

连接成功后，在命令行输入
```bash
show databases; 
```
查看默认存在的数据库

CR客户端[命令文档](https://www.cockroachlabs.com/docs/stable/use-the-built-in-sql-client.html)

#### 一个简单的例子
我们以Go语言为例，来看看怎么连接数据库并进行简单的操作

###### 下载go驱动
```bash
go get -u -v github.com/lib/pq
```

###### 创建用户maxroach
```bash
cockroach user set maxroach --insecure --host=10.100.1.2 --port=26257
```
###### 创建数据库
```bash
cockroach sql --insecure -e 'CREATE DATABASE bank' --host=10.100.1.2 --port=26257
```
> 这里我们直接使用客户端的外部命令，用户也可以进入客户端命令行，使用sql命令创建

###### 给用户授权
```bash
cockroach sql --insecure -e 'GRANT ALL ON DATABASE bank TO maxroach'
```

###### 代码连接数据库
```java
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/lib/pq"
)

func main() {
    // Connect to the "bank" database.
    db, err := sql.Open("postgres", "postgresql://maxroach@10.100.1.3:26257/bank?sslmode=disable")
    if err != nil {
        log.Fatal("error connecting to the database: ", err)
    }

    // Create the "accounts" table.
    if _, err := db.Exec(
        "CREATE TABLE IF NOT EXISTS accounts (id INT PRIMARY KEY, balance INT)"); err != nil {
        log.Fatal(err)
    }

    // Insert two rows into the "accounts" table.
    if _, err := db.Exec(
        "INSERT INTO accounts (id, balance) VALUES (1, 1000), (2, 250)"); err != nil {
        log.Fatal(err)
    }

    // Print out the balances.
    rows, err := db.Query("SELECT id, balance FROM accounts")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()
    fmt.Println("Initial balances:")
    for rows.Next() {
        var id, balance int
        if err := rows.Scan(&id, &balance); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%d %d\n", id, balance)
    }
}
```

运行代码
```bash
go run basic-sample.go
```

结果
```
Initial balances:
1 1000
2 250
```

###### 使用事务(包含重试逻辑)
```java
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    "github.com/cockroachdb/cockroach-go/crdb"
)

func transferFunds(tx *sql.Tx, from int, to int, amount int) error {
    // Read the balance.
    var fromBalance int
    if err := tx.QueryRow(
        "SELECT balance FROM accounts WHERE id = $1", from).Scan(&fromBalance); err != nil {
        return err
    }

    if fromBalance < amount {
        return fmt.Errorf("insufficient funds")
    }

    // Perform the transfer.
    if _, err := tx.Exec(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, from); err != nil {
        return err
    }
    if _, err := tx.Exec(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, to); err != nil {
        return err
    }
    return nil
}

func main() {
    db, err := sql.Open("postgres", "postgresql://maxroach@localhost:26257/bank?sslmode=disable")
    if err != nil {
        log.Fatal("error connecting to the database: ", err)
    }

    // Run a transfer in a transaction.
    err = crdb.ExecuteTx(context.Background(), db, nil, func(tx *sql.Tx) error {
        return transferFunds(tx, 1 /* from acct# */, 2 /* to acct# */, 100 /* amount */)
    })
    if err == nil {
        fmt.Println("Success")
    } else {
        log.Fatal("error: ", err)
    }
}
```

这里我们引用了"github.com/cockroachdb/cockroach-go/crdb"，因为CR的事务重试逻辑封装在里面。

执行结果:
```bash
Success
```

查询结果
```
cockroach sql --insecure -e 'SELECT id, balance FROM accounts' --database=bank --host=10.100.1.1 --port=26257

+----+---------+
| id | balance |
+----+---------+
|  1 |     900 |
|  2 |     350 |
+----+---------+
(2 rows)
```

###### 写在最后
至此，我们初体验该结束了，相信大家也学会了怎么搭建集群和写代码去访问数据库了，后面有更多的感悟，我会继续完善这个系列。

总之，Cockroach真的是一个很不错也很有潜力的数据库，同时衷心的祝愿国产的Tidb越来越好，扬中华开源之威。