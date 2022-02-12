# 深度优化让Rust yes命令提速1000倍

最近翻出了一篇收藏挺久的文章，是关于如何深度优化`yes`程序的故事，我在查询了相关资料后，突然觉得可以分享给国内的Rustacean，希望大家能喜欢。

最简单的`Unix`命令是什么？相信99%的人可能都会选择`echo`，它做的事情确实很简单，将一个字符串输出到`stcout`，然后返回`true`。但是除了这个`echo`，还有一个简单到令人发指的命令`yes`，可能大多数同学都没听说过，它做的事情很简单，往`stdout`中不停的输出`y`，通过换行符进行分割:
```console
y
y
y
...
```

这个命令看上去很像是猴子派来的救兵，实际上它在某些场景有奇用，比如安装过程中需要输入好几次`y`时：
```shell
yes | sh boring_installation.sh
```

## 实现yes
背景知识介绍完毕，让我们来实现下这个`yes`程序，先来一个使用`Python`实现的版本：
```python
while True:
    print("y")
```

很简单，对吗？ 不过性能和代码一样也非常"简单":
```console
python yes.py | pv -r > /dev/null
[4.17MiB/s]
```

`pv`是一个`Unix`命令，用来统计标准输出的数据量的(都是命令，真是命比命，气死人，咱的`yes`咋就这么弱).

再来看看`Mac`系统自带的:
```console
yes | pv -r > /dev/null
[34.2MiB/s]
```

嗯，马马虎虎，10个`Python`吧，那再来看看咱们的主角`Rust`，众所周知，`Rust`简直就是高性能的代名词，那性能刷刷的：
```rust
use std::env;

fn main() {
  let expletive = env::args().nth(1).unwrap_or("y".into());
  loop {
    println!("{}", expletive);
  }
}
```
先不说性能，代码嘛，却是比`python`啰嗦点，不过问题不大，性能才是王道：
```console
cargo run --release | pv -r > /dev/null
   Compiling yes v0.1.0
    Finished release [optimized] target(s) in 1.0 secs
     Running `target/release/yes`
[2.35MiB/s]
```

W...T...F? 这性能，狗不理啊，吓得我赶紧检查了下是不是使用了`release`模式，结果是，Rust确实这么慢! 说好的Rust重写Python程序，性能提升50倍呢？原来童话世界都是骗人的。

为了调用问题所在，我先去看了`C`语言实现的版本，发现了这句话：
```C
/* Repeatedly output the buffer until there is a write error; then fail.  */
while (full_write (STDOUT_FILENO, buf, bufused) == bufused)
  continue;
```

嗯，先写入`Buffer`，然后等积累一批数据后，一起输出是个相当好的选择，我瞬间又信心满满，来修改下Rust代码：
```rust
use std::env;
use std::io::{self, BufWriter, Write};

const BUFSIZE: usize = 8192;

fn main() {
    let expletive = env::args().nth(1).unwrap_or("y".into());
    let mut writer = BufWriter::with_capacity(BUFSIZE, io::stdout());
    loop {
        writeln!(writer, "{}", expletive).unwrap();
    }
}
```
这里有一点要注意，`Buffer`大小需要是4的倍数，以满足内存对齐的需求，可以提升性能。连这个细节都考虑到，我更是对上面的代码充满了信心。

额，事实证明，信心这玩意，和实力真的一点关系都没有，`53MB/s`,嗯，已经把`python`甩到尾灯都看不见了，可是。。。大家知道世界最快的速度是多少吗？ 在我的机器上，C语言的最快实现是`3GB/s`，嗯大概60倍于我们的速度。。。

## 问题剖析
这个世界不乏奇迹，在代码上也是，奇迹总是存在的，但是奇迹不是天降的，需要人的努力才能实现，那咱们来分析下，到底这段程序还慢在哪里。

#### 优化热点路径的性能
首先，Buf的引入肯定是正确的，不然几个字节几个字节的输出到控制台上，效率肯定非常低，大部分时间都耗费在io和系统调用等待上。

其次，查询文档发现，每次输出到控制台，都会涉及一次`lock`操作，当执行次数非常多时，锁的存在会大幅影响性能。

最后，寻找一个合适的`Buffer`最大长度。

#### 优化程序启动性能
为何要优化启动性能？因为该性能测试实际上分为两项：只运行一秒的短期测试和持续运行的长期测试，对于短期测试而言，程序启动性能提升一点，也会有结果上的影响: 
- 引入`Cow`来减少字符串复制
- 为不同的平台实现`to_bytes`，将字符串转为字节数组
- 使用倍增`memcp`的方式将`buffer`填满
- 使用`std::ffi::OsString`来减少内存分配

最终，优化后的代码如下：
```rust
use std::borrow::Cow;
use std::env;
use std::io::{self, Write};
use std::process;

#[cfg(not(unix))]
mod platform {
    use std::ffi::OsString;
    pub const BUFFER_CAPACITY: usize = 16 * 1024;

    pub fn to_bytes(os_str: OsString) -> Vec<u8> {
        os_str
            .into_string()
            .expect("non utf-8 argument only supported on unix")
            .into()
    }
}

#[cfg(unix)]
mod platform {
    use std::ffi::OsString;
    pub const BUFFER_CAPACITY: usize = 64 * 1024;

    pub fn to_bytes(os_str: OsString) -> Vec<u8> {
        use std::os::unix::ffi::OsStringExt;
        os_str.into_vec()
    }
}

use platform::*;

fn fill_up_buffer<'a>(buffer: &'a mut [u8], output: &'a [u8]) -> &'a [u8] {
    if output.len() > buffer.len() / 2 {
        return output;
    }

    let mut buffer_size = output.len();
    buffer[..buffer_size].clone_from_slice(output);

    while buffer_size < buffer.len() / 2 {
        let (left, right) = buffer.split_at_mut(buffer_size);
        // 因为下一行代码同时借用了&mut和&，因此我们不能通过类似slice[..2].clone_from_slice(&slice[3..])的方式来实现，会造成编译错误
        // 使用`buffer.split_at_mut`可以解决该问题，最终返回两个切片，并不会引起所有权的问题
        right[..buffer_size].clone_from_slice(left);
        buffer_size *= 2;
    }

    &buffer[..buffer_size]
}

fn write(output: &[u8]) {
    let stdout = io::stdout();
    let mut locked = stdout.lock();
    let mut buffer = [0u8; BUFFER_CAPACITY];

    let filled = fill_up_buffer(&mut buffer, output);
    while locked.write_all(filled).is_ok() {}
}

fn main() {
    write(
        &env::args_os()
            .nth(1)
            .map(to_bytes)
            .map_or(Cow::Borrowed(&b"y\n"[..]), |mut arg| {
                arg.push(b'\n');
                Cow::Owned(arg)
            }),
    );
    process::exit(1);
}
```

经过这些努力后，最终性能激增到`3.1GB/s`，嗯，略超过`C`语言的最佳实现。

## 总结
虽然`yes`程序不起眼，用处也不大，但是在此过程中，我们证明了Rust只要优化得当，就可以成为C语言那样风一般的男子。

**一时的差不可怕，一世的差才可怕**。