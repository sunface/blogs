# AWS眼中的Rust与能效
夸 Rust 语言的方式至少有 3000 种，但是从环保和可持续发展角度去夸的大家见过嘛？这不，AWS 就给我们带来了一篇非常精彩的文章，一起来看看。

> 原文链接： https://aws.amazon.com/cn/blogs/opensource/sustainability-with-rust/ ，由于原文过长，译文进行了适当的精简(例如夸 AWS 的部分 - , -)

Rust 是一门完全开源的语言，在 2015 年发布了 1.0 版本，但是在 2020 年 才迎来了真正的大发展契机，这是由于 Rust 的开源支持由 Molzilla 移交给了 [Rust基金会](https://foundation.rust-lang.org/)，后者是由 亚马逊云AWS、谷歌、华为、微软和 Mozilla 共同创建的非营利性组织。

在 AWS，Rust 已经成为构建大规模基础设施的关键，其中一部分:

- [Firecraker](https://firecracker-microvm.github.io/) 是开源的虚拟化技术，用于支持 AWS Lambda 和其它无服务器计算
- 为 Amazon S3 、Amazon EC2、Amazon CloudFront 等提供关键性服务
- 在 2020 年发布了 [Bottlerocket](https://aws.amazon.com/bottlerocket/) 一个基于 Linux 的容器化操作系统

## 云计算的能源效率

<img src="https://pica.zhimg.com/80/v2-f3be97bda5058c1b490bd393e5cd2910_1440w.png" />

*来源: IEA(2021)，全球数据中心能源需求，2010-2022，https://www.iea.org/data-and-statistics/charts/global-data-centre-energy-demand-by-data-centre-type-2010-2022*

在全世界范围内，数据中心每年大概消耗 [200 太瓦时](https://www.iea.org/data-and-statistics/charts/global-data-centre-energy-demand-by-data-centre-type-2010-2022) 的能源，大概占全球能源消耗总量的 1%。

图中有几个有趣的点值得关注。首先，数据中心消耗的能源总量在过去 12 年间并没有显著的变化，这个其实蛮反直觉的，因为在这些年间，大数据、机器学习、边缘计算、区块链等等耗电大户发展速度都非常快。其次，虽然总量没有变，但是三种数据中心的能源占比分布发生了巨大的变化：超大规模(hyperscale)、传统服务、云计算。

总量反直觉变化的关键，其实就在于这些年能源效率得到了大幅提升，以及很多传统服务都迁移到了云计算上，而后者通过多租户、智能硬件资源利用、优化驱动和存储、更高效的冷却系统等等一系列措施大幅降低了能源的消耗。

尽管能源效率提升巨大，但是，依然存在两个问题。首先，当前的现状已经足够好了吗？例如让能源占比保持在 1% 的水准。其次，能源效率能否像过去一样继续快速提升？考虑到即将爆发的无人驾驶、机器人、机器学习领域，我们对此保持不乐观的态度，因为这个领域需要处理异常巨大的数据集。

<img src="https://pic2.zhimg.com/80/v2-5842ced7c60cdf549375b64a2c43804c_1440w.jpeg" />

当然，还能从能源本身入手来改善，例如 AWS 计划在 2025 年之前实现所有数据中心都使用可再生能源，但可再生能源并不意味着它没有环境影响，它依然需要 50 万英亩的太阳能板来生成 200 太瓦时的数据中心能源需求。总之，可再生能源不是一个设计上的概念，也不能替代设计上的优化，我们还需要其它方式。

这些其它方式包括：为非关键服务放松 `SLA` 的要求和资源供给优先级，利用虚拟化实现更长的设备升级周期，更多地利用缓存、设置更长的 TTL ，对数据进行分类并通过自动化的策略来实现尽可能及时的数据删除，为加密和压缩选择更高效的算法等等，最后但也最重要的是：**我们可以选择使用一门能源效率高的编程语言来实现基础服务和用户端的软件**。

## 编程语言的能源效率
对于开发者来说，估计没几个人能搞清楚自己服务的能源效率，那么该如何对比编程语言之间的能源效率呢？好在国外有专家做了相关的[学术研究](https://greenlab.di.uminho.pt/wp-content/uploads/2017/10/sleFinal.pdf)。

他精心设计了 10 个测试场景，然后衡量了 27 种不同的语言的执行时间、能源消耗、最大内存使用，最终得出了一个结论：C 和 Rust 在能源效率方面无可争议的击败了其它语言，事实上，它们比 Java 的能源效率高 50% ， 比 python 高 98%。

<img src="https://pic1.zhimg.com/80/v2-f39a453280eba7365b684cd882df9f78_1440w.png" />

其实，C 和 Rust 能效高很正常，但是比其它语言高出这么多就相当出乎意料了：根据上图的数据，采用 C 和 Rust，你将减少大概 50% 的能耗，这还是保守估计。

那么问题来了，既然这两个都可以，为何不选择历史更悠久的 C 语言呢？它的生态和社区都比 Rust 要更好。 好在，linux 创始人 Linus Torvalds 在 2021 年度的开源峰会上给出了答案：他承认，[使用 C 语言就像是拿着一把链锯在玩耍](https://thenewstack.io/linus-torvalds-on-community-rust-and-linuxs-longevity/)，同时还说道："C 语言的类型互动并不总是合乎逻辑的，以至于对于绝大多数人来说，这种互动都可能存在陷阱"。

作为侧面的证明，Rust 在去年下半年被纳入了 Linux 的官方开发语言，如果大家想知道其它的官方语言有哪些？我可以很轻松的列出一个列表：C 语言。。。这叫列表？这就结束了？其它的呢？别急，事实上，之前仅有 C 语言是官方支持的，可想而知 Rust 是多么的优秀才能从这么多竞争者中脱颖而出！

总之，Linus Torvalds 亲口说过 Rust 是他见过的第一门可以称之为**能很好的解决问题**的编程语言，Rust 在比肩 C 的效率的同时，还能避免各种不安全的风险，对于能耗来说，我们就能在节省一半能耗的同时还不用担心安全性。

多个分析报告也指出：七成以上的 C/C++ 的高风险 CVE 可以在 Rust 中得到有效的规避，且使用的是同样的解决方法！事实上，ISRG(非盈利组织，Let's Encrypt 项目发起者) 就有一个目标，希望能将所有对网络安全敏感的基础设施转移到 Rust 上。正在进行的项目包括: Linux 内核对 Rust 的进一步支持，以及将 curl 迁移到基于 TLS 和 HTTP 的 Rust 版本上。

<img src="https://pic2.zhimg.com/80/v2-c15207d4631d0ccfea6681de57b36725_1440w.png" />

不仅仅是能耗，上图中的中间列还提供了执行时间的测量指标，可以看出 Rust 和 C 在性能上也相当接近，而且两者都比其它语言也更快(其实对于 C++ 的结果，我个人不太理解，如果有大神阅读过之前提到的学术研究报告，欢迎给出答案 :D )。这意味着，当为了能效和安全选择了 Rust 后，我们依然可以获得类似 C 语言级别的性能，还是优化过的。

## Rust 成功案例
下面一起来看几个关于使用 Rust 后获得性能和成本双丰收的案例。

#### Tenable
<img src="https://pica.zhimg.com/80/v2-f631c943c213775f9532a31ceaadb3ff_1440w.png" />

*https://medium.com/tenable-techblog/optimizing-700-cpus-away-with-rust-dc7a000dbdb2*

Tenable 是一家网络安全解决方案提供商，它提供了一套可视化工具，并通过一个 `sidecar agent` 来过滤采集到的指标数据。最开始，该公司使用 Javascript 作为主要语言，当业务开始快速增长时，性能降级的问题就不可避免的发生了。

因此，在经过一系列调研后，`Tenable` 最终决定使用 Rust 来重写该服务，以获取更好的性能和安全性。最终结果也没有让他们失望，在延迟方面获得了 50% 的提升，如上图所示。

除了用户体验的提升之外，在 CPU 和内存占用方面也提升巨大，这可以帮助他们节省大量的硬件和能耗成本:

<img src="https://pic1.zhimg.com/80/v2-3f8bf46b5df67290b65409b3d1bd29ad_1440w.png" />

<img src="https://pic1.zhimg.com/80/v2-95b121d6c38ced2841dc5ff2f82d1ceb_1440w.png" />

#### Discord

<img src="https://pic3.zhimg.com/80/v2-29cdb47ea7efbce596038c647cdbd108_1440w.png" />

*https://discord.com/blog/why-discord-is-switching-from-go-to-rust*

Discord 最初使用 Python、Go、Elixir 来实现，但是随即他们发现其中一个关键的 Go 服务存在一些问题。该服务很简单，但是会出现较慢的尾延迟现象，原因是 Go 语言拥有 GC 垃圾回收，当对象在快速创建和释放时，GC 会较为频繁的运行，然后导致整个程序的暂停，因此当 GC 发生时，程序是无法响应用户的请求的，从图中的不断起伏的峰值表现，你可以看出问题所在。

为了解决问题，Discord 选择使用 Rust 来重写该服务，然后下图是结果对比，Go 语言是左边一列，Rust 是右边一列:

<span>Go</span>   <span float="right">Rust</span>
<img src="https://pic1.zhimg.com/80/v2-3cc17afdf0495fb57c25b1abfc629114_1440w.png">

