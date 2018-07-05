

### $ go build -x
    -x会列出来go build调用到的所有命令。
如果你对Go的工具链好奇，或者使用了一个跨C编译器，并且想知道调用外部编译器用到的具体参数，或者怀疑链接器有bug；使用**-x**来查看所有调用。

```bash
$ go build -x
WORK=/var/folders/00/1b8h8000h01000cxqpysvccm005d21/T/go-build600909754
mkdir -p $WORK/hello/perf/_obj/
mkdir -p $WORK/hello/perf/_obj/exe/
cd /Users/jbd/src/hello/perf
/Users/jbd/go/pkg/tool/darwin_amd64/compile -o $WORK/hello/perf.a -trimpath $WORK -p main -complete -buildid bbf8e880e7dd4114f42a7f57717f9ea5cc1dd18d -D _/Users/jbd/src/hello/perf -I $WORK -pack ./perf.go
cd .
/Users/jbd/go/pkg/tool/darwin_amd64/link -o $WORK/hello/perf/_obj/exe/a.out -L $WORK -extld=clang -buildmode=exe -buildid=bbf8e880e7dd4114f42a7f57717f9ea5cc1dd18d $WORK/hello/perf.a
mv $WORK/hello/perf/_obj/exe/a.out perf
```

### $go build -gcflags
这个参数将会传递给编译器。*go tool compile -help*列出来了所有我们可以传递给编译器的参数。

例如，禁用编译器优化和内联优化，你可以使用下面的参数：
```bash
$ go build -gcflags="-N -I"
```

### $go test -v
如果不使用**-v**参数来测试，输出很少很多，我经常使用-v参数来打开详细测试日志。例子：

```bash
$ go test -v context
=== RUN   TestBackground
--- PASS: TestBackground (0.00s)
=== RUN   TestTODO
--- PASS: TestTODO (0.00s)
=== RUN   TestWithCancel
--- PASS: TestWithCancel (0.10s)
=== RUN   TestParentFinishesChild
--- PASS: TestParentFinishesChild (0.00s)
=== RUN   TestChildFinishesFirst
--- PASS: TestChildFinishesFirst (0.00s)
=== RUN   TestDeadline
--- PASS: TestDeadline (0.16s)
=== RUN   TestTimeout
--- PASS: TestTimeout (0.16s)
=== RUN   TestCanceledTimeout
--- PASS: TestCanceledTimeout (0.10s)
...
PASS
ok  	context	2.426s
```

### $ go test -race
现在可以使用Go工具提供的**-race**参数进行竞争检测。它会检测并报告竞争。开发的过程中用这个命令来检测一下。

注：完整的命令是：
```bash
$ go test -race mypkg    // to test the package
$ go run -race mysrc.go  // to run the source file
$ go build -race mycmd   // to build the command
```

### $ go test -run
你可以在测试的时候通过**-run**参数来正则匹配过滤需要测试的代码。下面的命令只会运行[test examples](https://blog.golang.org/examples):
```bash
$ go test -run=Example
```

### $ go test -coverprofile
当测试一个包的时候，可以输出一个测试覆盖率，然后使用命令**go tool**来在浏览器里面可视化:
```bash
go test -coverprofile=c.out && go tool cover -html=c.out
```
上面的命令将会创建一个测试覆盖率文件在浏览器打开结果.

### $ go test -exec
一般很少有人知道Go的这个功能，你可以通过**-exec**插入另一个程序。这个参数允许通过Go工具完成一些外部工作。

一个常见的需求场景是你需要在一些宿主机上面执行一些测试。我们可以通过**-exec**命令调用**adb**命令来把二进制文件导入安卓设备并且可以收集到结果信息。参考[这个](https://github.com/golang/go/blob/master/misc/android/go_android_exec.go)来在安卓设备上面执行。

### $ go get -u
如果你通过*go get*命令获取Go包，而这个包已经存在于本地的**GOPATH**，那么这个命令并不会帮你更新包。**-u**可以强制更新到最新版。

如果你是一个库作者，你最好在你的安装说明上加上**-u**参数，例如，[golint](https://github.com/golang/lint#installation)是这么做的：
```bash
go get -u github.com/golang/lint/golint
```

### $ go get -d
如果你想clone一个代码仓库到**GOPATH**里面，跳过编译和安装环节，使用**-d**参数。这样它只会下载包并且在编译和安装之前停止。

当需要clone虚拟网址代码仓库的时候，我经常使用这个命令来代替*git clone*，因为这样可以把Go代码自动放入合适的目录下面。例如：
```bash
$ go get -d golang.org/x/oauth2/...
```

这样可以克隆到*$GOPATH/src/golang.org/x/ouath2*目录下面。假设*golang.org/x/oauth2*是一个虚拟网址，通过*go get*获取这个代码仓库要比找出仓库的真实地址(*go.googlesource.com/oauth2*)更简单。

### $ go get -t
如果你的测试包的有附加的依赖包，**-t**可以一并下载测试包的依赖包。如果没有加这个参数，*go get*只会下载非测试包的依赖包。

### $ go list -f
这个命令可以列出来Go的所有包，并且可以指定格式。这个写脚本的时候很有用。

下面这个命令将会打印所有依赖的**runtime**包:
```bash
go list -f ‘’ runtime [runtime/internal/atomic runtime/internal/sys unsafe]
```

> 如果您喜欢这篇文章，请点击喜欢；如果想及时获得最新的咨询，请点击关注。您的支持是对作者都是最大的激励，万分感激！By 孙飞