> 外文发表日期： 2018-04-14
分类于[区块链](../../index/blockchain.md)
本文发表时间：2018-04-15
外文链接：https://medium.com/coinmonks/code-a-simple-p2p-blockchain-in-go-46662601f417

![](https://upload-images.jianshu.io/upload_images/8245841-7ed8a7dcaa5c8fe4.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

在之前的文章中，我们已经知道了怎么编写[PoW](https://medium.com/@mycoralhealth/code-your-own-blockchain-mining-algorithm-in-go-82c6a71aba1f)也知道了[IPFS](https://medium.com/@mycoralhealth/learn-to-securely-share-files-on-the-blockchain-with-ipfs-219ee47df54c)怎么工作, 但是有一个致命的缺点，我们的服务都是中心化的，这篇文章会教你怎么实现一个简单的完全去中心化的P2P网络。

## 背景知识
#### 什么是P2P网络
在真正的P2P架构中，不需要中心化的服务来维护区块链的状态。例如，当你给朋友发送比特币时，比特币区块链的“状态”应该更新，这样你朋友的余额就会增加，你的余额就会减少。

在这个网络中，不存在一个权力高度中心化的机构来维护状态（银行就是这样的中心化机构)。对于比特币网络来说，每个节点都会维护一份完整的区块链状态，当交易发生时，每个节点的区块链状态都会得到更新。这样，只要网络中51%的节点对区块链的状态达成一致，那么区块链网络就是安全可靠的，具体可以阅读这篇一致性协议[文章](https://medium.com/@mycoralhealth/code-your-own-blockchain-mining-algorithm-in-go-82c6a71aba1f)。

本文将继续之前的工作,[200行Go代码实现区块链](https://medium.com/@mycoralhealth/code-your-own-blockchain-in-less-than-200-lines-of-go-e296282bcffc), 并加入P2P网络架构。在继续之前，强烈建议你先阅读该篇文章，它会帮助你理解接下来的代码。

## 开始实现
编写P2P网络可不是开开玩笑就能简单视线的，有很多边边角角的情况都要覆盖到，而且需要你拥有很多工程学的知识，这样的P2P网络才是可扩展、高可靠的。有句谚语说得好：站在巨人肩膀上做事，那么我们先看看巨人们提供了哪些[工具](https://en.wikipedia.org/wiki/Standing_on_the_shoulders_of_giants)吧。

喔，看看，我们发现了什么！一个用Go语言实现的P2P库[go-libp2p](https://github.com/libp2p/go-libp2p)！如果你对新技术足够敏锐，就会发现这个库的作者和IPFS的作者是同一个团队。如果你还没看过我们的IPFS教程，可以看看[这里](https://medium.com/@mycoralhealth/learn-to-securely-share-files-on-the-blockchain-with-ipfs-219ee47df54c),  你可以选择跳过IPFS教程，因为对于本文这不是必须的。

#### 警告
目前来说，`go-libp2p`主要有两个缺点:
1. 安装设置比较痛苦，它使用gx作为包管理工具，怎么说呢，不咋好用，但是凑活用吧
2. 目前项目还没有成熟，正在紧密锣鼓的开发中，当使用这个库时，可能会遇到一些数据竞争(data race)

对于第一点，不必担心，有我们呢。第二点是比较大的问题，但是不会影响我们的代码。假如你在使用过程中发现了数据竞争问题，记得给项目提一个issue，帮助它更好的成长！

总之，目前开源世界中，现代化的P2P库是非常非常少的，因为我们要多给`go-libp2p`一些耐心和包容，而且就目前来说，它已经能很好的满足我们的目标了。

#### 安装设置
最好的环境设置方式是直接clone `libp2p`库，然后在这个库的代码中直接开发。你也可以在自己的库中，调用这个库开发，但是这样就需要用到`gx`了。这里我们使用简单的方式，假设你已经安装了Go:
- `go get -d github.com/libp2p/go-libp2p/…`
- 进入`go-libp2p`文件夹
- `make`
- `make deps`


这里会通过gx包管理工具下载所有需要的包和依赖，再次申明，我们不喜欢gx，因为它打破了Go语言的很多惯例，但是为了这个很棒的库，认怂吧。

这里，我们在`examples`子目录下进行开发，因此在`go-libp2p`的examples下创建一个你自己的目录
- `mkdir ./examples/p2p`

然后进入到p2p文件夹下，创建`main.go`文件，后面所有的代码都会在该文件中。

你的目录结构是这样的：
![](https://upload-images.jianshu.io/upload_images/8245841-64bb1e5d2f53687e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

好了，勇士们，拔出你们的剑，哦不，拔出你们的`main.go`，开始我们的征途吧！

#### 导入相关库
这里申明我们需要用的库，大部分库是来自于`go-libp2p`本身的，在教程中，你会学到怎么去使用它们。
```go
package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	mrand "math/rand"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/davecgh/go-spew/spew"
	golog "github.com/ipfs/go-log"
	libp2p "github.com/libp2p/go-libp2p"
	crypto "github.com/libp2p/go-libp2p-crypto"
	host "github.com/libp2p/go-libp2p-host"
	net "github.com/libp2p/go-libp2p-net"
	peer "github.com/libp2p/go-libp2p-peer"
	pstore "github.com/libp2p/go-libp2p-peerstore"
	ma "github.com/multiformats/go-multiaddr"
	gologging "github.com/whyrusleeping/go-logging"
)
```

`spew`包可以很方便、优美的打印出我们的区块链，因此记得安装它：
- `go get github.com/davecgh/go-spew/spew`

#### 区块链结构
记住，请先阅读[200行Go代码实现区块链](https://medium.com/@mycoralhealth/code-your-own-blockchain-in-less-than-200-lines-of-go-e296282bcffc)， 这样，下面的部分就会简单很多。

先来申明全局变量：
```go
// Block represents each 'item' in the blockchain
type Block struct {
	Index     int
	Timestamp string
	BPM       int
	Hash      string
	PrevHash  string
}

// Blockchain is a series of validated Blocks
var Blockchain []Block

var mutex = &sync.Mutex{}
```


- 我们是一家健康看护公司，因此Block中存着的是用户的脉搏速率BPM
- Blockchain是我们的"状态"，或者严格的说：最新的Blockchain，它其实就是Block的切片（slice)
- mutex是为了防止资源竞争出现

下面是Blockchain相关的特定函数：
```go
// make sure block is valid by checking index, and comparing the hash of the previous block
func isBlockValid(newBlock, oldBlock Block) bool {
	if oldBlock.Index+1 != newBlock.Index {
		return false
	}

	if oldBlock.Hash != newBlock.PrevHash {
		return false
	}

	if calculateHash(newBlock) != newBlock.Hash {
		return false
	}

	return true
}

// SHA256 hashing
func calculateHash(block Block) string {
	record := strconv.Itoa(block.Index) + block.Timestamp + strconv.Itoa(block.BPM) + block.PrevHash
	h := sha256.New()
	h.Write([]byte(record))
	hashed := h.Sum(nil)
	return hex.EncodeToString(hashed)
}

// create a new block using previous block's hash
func generateBlock(oldBlock Block, BPM int) Block {

	var newBlock Block

	t := time.Now()

	newBlock.Index = oldBlock.Index + 1
	newBlock.Timestamp = t.String()
	newBlock.BPM = BPM
	newBlock.PrevHash = oldBlock.Hash
	newBlock.Hash = calculateHash(newBlock)

	return newBlock
}
```

- `isBlockValid`检查Block的hash是否合法
- `calculateHash`使用`sha256`来对原始数据做hash
- `generateBlock`创建一个新的Block区块，然后添加到区块链Blockchain上，同时会包含所需的事务

#### P2P结构

下面我们快接近核心部分了，首先我们要写出创建主机的逻辑。当一个节点运行我们的程序时，它可以作为一个主机，被其它节点连接。下面一起看看代码:-)
```go
// makeBasicHost creates a LibP2P host with a random peer ID listening on the
// given multiaddress. It will use secio if secio is true.
func makeBasicHost(listenPort int, secio bool, randseed int64) (host.Host, error) {

	// If the seed is zero, use real cryptographic randomness. Otherwise, use a
	// deterministic randomness source to make generated keys stay the same
	// across multiple runs
	var r io.Reader
	if randseed == 0 {
		r = rand.Reader
	} else {
		r = mrand.New(mrand.NewSource(randseed))
	}

	// Generate a key pair for this host. We will use it
	// to obtain a valid host ID.
	priv, _, err := crypto.GenerateKeyPairWithReader(crypto.RSA, 2048, r)
	if err != nil {
		return nil, err
	}

	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(fmt.Sprintf("/ip4/127.0.0.1/tcp/%d", listenPort)),
		libp2p.Identity(priv),
	}

	if !secio {
		opts = append(opts, libp2p.NoEncryption())
	}

	basicHost, err := libp2p.New(context.Background(), opts...)
	if err != nil {
		return nil, err
	}

	// Build host multiaddress
	hostAddr, _ := ma.NewMultiaddr(fmt.Sprintf("/ipfs/%s", basicHost.ID().Pretty()))

	// Now we can build a full multiaddress to reach this host
	// by encapsulating both addresses:
	addr := basicHost.Addrs()[0]
	fullAddr := addr.Encapsulate(hostAddr)
	log.Printf("I am %s\n", fullAddr)
	if secio {
		log.Printf("Now run \"go run main.go -l %d -d %s -secio\" on a different terminal\n", listenPort+1, fullAddr)
	} else {
		log.Printf("Now run \"go run main.go -l %d -d %s\" on a different terminal\n", listenPort+1, fullAddr)
	}

	return basicHost, nil
}
```
`makeBasicHost`函数有3个参数，同时返回一个host结构体
- `listenPort`是主机监听的端口，其它节点会连接该端口
- `secio`表明是否开启数据流的安全选项，最好开启，因此它代表了"安全输入／输出"
- `randSeed`是一个可选的命令行标识，可以允许我们提供一个随机数种子来为我们的主机生成随机的地址。这里我们不会使用

函数的第一个`if`语句针对随机种子生成随机key，接着我们生成公钥和私钥，这样能保证主机是安全的。`opts`部分开始构建网络地址部分，这样其它节点就可以连接进来。

`!secio`部分可以绕过加密，但是我们准备使用加密，因此这段代码不会被触发。

接着，创建了主机地址，这样其他节点就可以连接进来。` log.Printf `可以用来在控制台打印出其它节点的连接信息。最后我们返回生成的主机地址给调用方函数。

#### 流处理
之前的主机需要能处理进入的数据流。当另外一个节点连接到主机时，它会想要提出一个新的区块链，来覆盖主机上的区块链，因此我们需要逻辑来判定是否要接受新的区块链。

同时，当我们往本地的区块链添加区块后，也要把相关信息广播给其它节点，这里也需要实现相关逻辑。

先来创建流处理的基本框架吧：
```go
func handleStream(s net.Stream) {

	log.Println("Got a new stream!")

	// Create a buffer stream for non blocking read and write.
	rw := bufio.NewReadWriter(bufio.NewReader(s), bufio.NewWriter(s))

	go readData(rw)
	go writeData(rw)

	// stream 's' will stay open until you close it (or the other side closes it).
}
```

这里创建一个新的`ReadWriter`，为了能支持数据读取和写入，同时我们启动了一个单独的Go协程来处理相关读写逻辑。

#### 读取数据
首先创建`readData`函数：
```go
func readData(rw *bufio.ReadWriter) {

	for {
		str, err := rw.ReadString('\n')
		if err != nil {
			log.Fatal(err)
		}

		if str == "" {
			return
		}
		if str != "\n" {

			chain := make([]Block, 0)
			if err := json.Unmarshal([]byte(str), &chain); err != nil {
				log.Fatal(err)
			}

			mutex.Lock()
			if len(chain) > len(Blockchain) {
				Blockchain = chain
				bytes, err := json.MarshalIndent(Blockchain, "", "  ")
				if err != nil {

					log.Fatal(err)
				}
				// Green console color: 	\x1b[32m
				// Reset console color: 	\x1b[0m
				fmt.Printf("\x1b[32m%s\x1b[0m> ", string(bytes))
			}
			mutex.Unlock()
		}
	}
}
```

该函数是一个无限循环，因为它需要永不停歇的去读取外面进来的数据。首先，我们使用`ReadString`解析从其它节点发送过来的新的区块链（JSON字符串)。

然后检查进来的区块链的长度是否比我们本地的要长，如果进来的链更长，那么我们就接受新的链为最新的网络状态（最新的区块链)。

同时，把最新的区块链在控制台使用一种特殊的颜色打印出来，这样我们就知道有新链接受了。

如果在我们主机的本地添加了新的区块到区块链上，那就需要把本地最新的区块链广播给其它相连的节点知道，这样这些节点机会接受并更新到我们的区块链版本。这里使用`writeData`函数:
```go
func writeData(rw *bufio.ReadWriter) {

	go func() {
		for {
			time.Sleep(5 * time.Second)
			mutex.Lock()
			bytes, err := json.Marshal(Blockchain)
			if err != nil {
				log.Println(err)
			}
			mutex.Unlock()

			mutex.Lock()
			rw.WriteString(fmt.Sprintf("%s\n", string(bytes)))
			rw.Flush()
			mutex.Unlock()

		}
	}()

	stdReader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("> ")
		sendData, err := stdReader.ReadString('\n')
		if err != nil {
			log.Fatal(err)
		}

		sendData = strings.Replace(sendData, "\n", "", -1)
		bpm, err := strconv.Atoi(sendData)
		if err != nil {
			log.Fatal(err)
		}
		newBlock := generateBlock(Blockchain[len(Blockchain)-1], bpm)

		if isBlockValid(newBlock, Blockchain[len(Blockchain)-1]) {
			mutex.Lock()
			Blockchain = append(Blockchain, newBlock)
			mutex.Unlock()
		}

		bytes, err := json.Marshal(Blockchain)
		if err != nil {
			log.Println(err)
		}

		spew.Dump(Blockchain)

		mutex.Lock()
		rw.WriteString(fmt.Sprintf("%s\n", string(bytes)))
		rw.Flush()
		mutex.Unlock()
	}

}
```


首先是一个单独协程中的函数，每5秒钟会将我们的最新的区块链状态广播给其它相连的节点。它们收到后，如果发现我们的区块链比它们的要短，就会直接把我们发送的区块链信息丢弃，继续使用它们的区块链，反之则使用我们的区块链。总之，无论哪种方法，所有的节点都会定期的同步本地的区块链到最新状态。

这里我们需要一个方法来创建一个新的Block区块，包含之前提到过的脉搏速率（BPM)。为了简化实现，我们不会真的去通过物联网设备读取脉搏，而是直接在终端控制台上输入一个脉搏速率数字。

首先要验证输入的BPM是一个整数类型，然后使用之前的`generateBlock`来生成区块，接着使用`spew.Dump`输入到终端控制台，最后我们使用`rw.WriteString`把最新的区块链广播给相连的其它节点。

牛逼了我的哥，现在我们完成了区块链相关的函数以及大多数P2P相关的函数。在前面，我们创建了流处理，因此可以读取和写入最新的区块链状态；创建了状态同步函数，这样节点之间可以互相同步最新状态。

剩下的就是实现我们的`main`函数了：
```go
func main() {
	t := time.Now()
	genesisBlock := Block{}
	genesisBlock = Block{0, t.String(), 0, calculateHash(genesisBlock), ""}

	Blockchain = append(Blockchain, genesisBlock)

	// LibP2P code uses golog to log messages. They log with different
	// string IDs (i.e. "swarm"). We can control the verbosity level for
	// all loggers with:
	golog.SetAllLoggers(gologging.INFO) // Change to DEBUG for extra info

	// Parse options from the command line
	listenF := flag.Int("l", 0, "wait for incoming connections")
	target := flag.String("d", "", "target peer to dial")
	secio := flag.Bool("secio", false, "enable secio")
	seed := flag.Int64("seed", 0, "set random seed for id generation")
	flag.Parse()

	if *listenF == 0 {
		log.Fatal("Please provide a port to bind on with -l")
	}

	// Make a host that listens on the given multiaddress
	ha, err := makeBasicHost(*listenF, *secio, *seed)
	if err != nil {
		log.Fatal(err)
	}

	if *target == "" {
		log.Println("listening for connections")
		// Set a stream handler on host A. /p2p/1.0.0 is
		// a user-defined protocol name.
		ha.SetStreamHandler("/p2p/1.0.0", handleStream)

		select {} // hang forever
		/**** This is where the listener code ends ****/
	} else {
		ha.SetStreamHandler("/p2p/1.0.0", handleStream)

		// The following code extracts target's peer ID from the
		// given multiaddress
		ipfsaddr, err := ma.NewMultiaddr(*target)
		if err != nil {
			log.Fatalln(err)
		}

		pid, err := ipfsaddr.ValueForProtocol(ma.P_IPFS)
		if err != nil {
			log.Fatalln(err)
		}

		peerid, err := peer.IDB58Decode(pid)
		if err != nil {
			log.Fatalln(err)
		}

		// Decapsulate the /ipfs/<peerID> part from the target
		// /ip4/<a.b.c.d>/ipfs/<peer> becomes /ip4/<a.b.c.d>
		targetPeerAddr, _ := ma.NewMultiaddr(
			fmt.Sprintf("/ipfs/%s", peer.IDB58Encode(peerid)))
		targetAddr := ipfsaddr.Decapsulate(targetPeerAddr)

		// We have a peer ID and a targetAddr so we add it to the peerstore
		// so LibP2P knows how to contact it
		ha.Peerstore().AddAddr(peerid, targetAddr, pstore.PermanentAddrTTL)

		log.Println("opening stream")
		// make a new stream from host B to host A
		// it should be handled on host A by the handler we set above because
		// we use the same /p2p/1.0.0 protocol
		s, err := ha.NewStream(context.Background(), peerid, "/p2p/1.0.0")
		if err != nil {
			log.Fatalln(err)
		}
		// Create a buffered stream so that read and writes are non blocking.
		rw := bufio.NewReadWriter(bufio.NewReader(s), bufio.NewWriter(s))

		// Create a thread to read and write data.
		go writeData(rw)
		go readData(rw)

		select {} // hang forever

	}
}
```

首先是创建一个创世区块（如果你读了[200行Go代码实现你的区块链](https://medium.com/@mycoralhealth/code-your-own-blockchain-in-less-than-200-lines-of-go-e296282bcffc),这里就不会陌生)。

其次我们使用`go-libp2p`的`SetAllLoggers`日志函数来记录日志。

接着，设置了所有的命令行标识：

- `secio`之前有提到，是用来加密数据流的。在我们的程序中，一定要打开该标识
- `target`指明当前节点要连接到的主机地址
- `listenF`是当前节点的监听主机地址，这样其它节点就可以连接进来，记住，每个节点都有两个身份：主机和客户端， 毕竟P2P不是白叫的
- `seed`是随机数种子，用来创建主机地址时使用

然后，使用`makeBasicHost`函数来创建一个新的主机地址，如果我们只想做主机不想做客户端（连接其它的主机)，就使用`if *target == “”`。

接下来的几行，会从`target`解析出我们要连接到的主机地址。然后把`peerID`和主机目标地址`targetAddr`添加到"store"中，这样就可以持续跟踪我们跟其它主机的连接信息，这里使用的是`ha.Peerstore().AddAddr`函数。

接着我们使用` ha.NewStream`连接到想要连接的节点上，同时为了能接收和发送最新的区块链信息，创建了`ReadWriter`，同时使用一个Go协程来进行`readData`和`writeData`。

#### 哇哦
终于完成了，写文章远比写代码累！我知道之前的内容有点难，但是相比P2P的复杂性来说，你能通过一个库来完成P2P网络，已经很牛逼了，所以继续加油！

## 完整代码
[mycoralhealth/blockchain-tutorial](https://github.com/mycoralhealth/blockchain-tutorial/blob/master/p2p/main.go)

## 运行结果
现在让我们来试验一下，首先打开3个独立的终端窗口做为独立节点。

开始之前，请再次进入`go-libp2p`的根目录运行一下`make deps`，确保所有依赖都正常安装。

回到你的工作目录`examples/p2p`，打开第一个终端窗口，输入
`go run main.go -l 10000 -secio`
![终端1](https://upload-images.jianshu.io/upload_images/8245841-a949bc72e0b744c2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


细心的读者会发现有一段话"Now run…"，那还等啥，继续跟着做吧，打开第二个终端窗口运行：`go run main.go -l 10001 -d <given address in the instructions> -secio`
![终端2](https://upload-images.jianshu.io/upload_images/8245841-d2fd73a1a2a997ee.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

这是你会发现第一个终端窗口检测到了新连接!![终端1](https://upload-images.jianshu.io/upload_images/8245841-37394c2d6052a2dd.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

接着打开第三个终端窗口，运行：`go run main.go -l 10002 -d <given address in the instructions> -secio`

![终端3](https://upload-images.jianshu.io/upload_images/8245841-0c24d728db8898b5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

检查第二终端，又发现了新连接
![终端2](https://upload-images.jianshu.io/upload_images/8245841-e01d9181e48123cf.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

接着，该我们输入BPM数据了，在第一个终端窗口中输入"70"，等几秒中，观察各个窗口的打印输出。
![终端1](https://upload-images.jianshu.io/upload_images/8245841-772afd9f729e40f0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![终端2](https://upload-images.jianshu.io/upload_images/8245841-4ff201eddaed3390.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![终端3](https://upload-images.jianshu.io/upload_images/8245841-0571659c2ecdbdd0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

来看看发生了什么：
- 终端1向本地的区块链添加了一个新的区块Block
- 终端1向终端2广播该信息
- 终端2将新的区块链跟本地的对比，发现终端1的更长，因此使用新的区块链替代了本地的区块链，然后将新的区块链广播给终端3
- 同上，终端3也进行更新

所有的3个终端节点都把区块链更新到了最新版本，同时没有使用任何外部的中心化服务，这就是P2P网络的力量！

我们再往终端2的区块链中添加一个区块试试看，在终端2中输入"80"

![终端2](https://upload-images.jianshu.io/upload_images/8245841-89dcdce816d8120d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![终端1](https://upload-images.jianshu.io/upload_images/8245841-62633aa803feed03.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![终端3](https://upload-images.jianshu.io/upload_images/8245841-d2795256e23f1a09.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


结果忠诚的记录了我们的正确性，再一次欢呼吧！

## 下一步
先享受一下自己的工作，你刚用了区区几百行代码就实现了一个全功能的P2P网络！这不是开玩笑，P2P编程时非常复杂的，为什么之前没有相关的教程，就是因为太难了。

但是，这里也有几个可以改进的地方，你可以挑战一下自己：

- 之前提到过,`go-libp2p`是存在数据竞争的Bug的，因此如果你要在生产环境使用，需要格外小心。一旦发现Bug，请反馈给作者团队知道
- 尝试将本文的P2P网络跟之前的共识协议结合，例如之前的文章[PoW](https://medium.com/@mycoralhealth/code-your-own-proof-of-stake-blockchain-in-go-610cd99aa658) 和[PoS](https://mp.weixin.qq.com/s?__biz=MzA3NDIzMDU5OA==&mid=2247483653&idx=1&sn=7fd3e3c9838e9fb6e83d24d1616daf6c&chksm=9f03bf2ca874363ac4cecc0a45f209f5783a53ff078bf8d7294db224d137d17350d589a23df1#rd) (PoS是中文译文)
- 添加持久化存储。截止目前，为了简化实现，我们没有实现持久化存储，因此节点关闭，数据就丢失了
- 本文的代码没有在大量节点的环境下测试过，试着写一个脚本运行大量节点，看看性能会怎么变化。如果发现Bug记得给我们[提交]((https://github.com/mycoralhealth/blockchain-tutorial/tree/master/p2p)
- 学习一下节点发现技术。新节点是怎么发现已经存在的节点的？这篇文章是一个[很好的起点](https://bitcoin.stackexchange.com/questions/3536/how-do-bitcoin-clients-find-each-other)

