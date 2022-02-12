# AWS眼中的Rust与环保
夸 Rust 语言的方式至少有 3000 种，但是从环保和可持续发展角度去夸的大家见过嘛？这不，AWS 就给我们带来了一篇非常精彩的文章，一起来看看。

> 原文链接： https://aws.amazon.com/cn/blogs/opensource/sustainability-with-rust/，由于原文过长，译文进行了适当的精简(例如夸 AWS 的部分 - , -)

Rust 是一门完全开源的语言，在 2015 年发布了 1.0 版本，但是在 2020 年 才迎来了真正的大发展契机，这是由于 Rust 的开源支持由 Molzilla 移交给了 [Rust基金会](https://foundation.rust-lang.org/)，后者是由 亚马逊云AWS、谷歌、华为、微软和 Mozilla 共同创建的非营利性组织。

在 AWS，Rust 已经成为构建大规模基础设施的关键，其中一部分:

- [Firecraker](https://firecracker-microvm.github.io/) 是开源的虚拟化技术，用于支持 [AWS Lambda](https://aws.amazon.com/lambda/) 和其它无服务器计算
- 为 Amazon S3 、Amazon EC2、Amazon CloudFront 等提供关键性服务
- 在 2020 年发布了 [Bottlerocket]() 一个基于 Linux 的容器化操作系统

## 云计算的能源效率

<img src="https://pica.zhimg.com/80/v2-f3be97bda5058c1b490bd393e5cd2910_1440w.png" />
