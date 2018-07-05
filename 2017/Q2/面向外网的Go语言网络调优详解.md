>本文发表时间：2017年5月17号

### 前言
很早以前crypto/tls(TLS长连接库)和net/http的性能不敢恭维，因此我们都使用Nginx做反向代理，但是Go1.8将要来了，这种格局即将被打破了！

我们最近尝试性的将Go1.8编译的服务暴漏到了外网，结果发现crypto/tls 和net/http都得到了极大的提升：稳定性、性能以及服务的可伸缩性！

### crypto/tls
现在已经是2016年了，我们不可能再去裸奔在互联网了，因此基于TLS是必然的选择，所以我们需要crypto/tls这个库。好消息就是在1.8下，该库的性能得到了很大的提升，性能表现堪称十分优秀，而且安全性也非常出色。

默认推荐的配置类似
[Mozilla标准] (https://wiki.mozilla.org/Security/Server_Side_TLS)，然而我们应该要设置PreferServerCipherSuits为true,这样可以使用更安全更快速的密文族；设置CurvePreferences避免未优化的Curve；选择CurveP256而不是CurveP384，因为后者可能会为每个客户端消耗将近1秒的cpu时间！！

```php
&tls.Config{  
    PreferServerCipherSuites: true,  
    // 仅仅使用拥有汇编实现的Curve  
    CurvePreferences: []tls.CurveID{  
        tls.CurveP256,  
        tls.X25519, // Go 1.8 only  
    },  
} 
```

如果可以接受TLS兼容性上可能存在的问题(例如版本问题，下面的配置建议更现代化，因此对老版本可能不够兼容)，还可以设置MinVersion和CipherSuites

```java
MinVersion: tls.VersionTLS12,  
    CipherSuites: []uint16{  
        tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,  
        tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,  
        tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305, // Go 1.8 only  
        tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,   // Go 1.8 only  
        tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,  
        tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,  
  
        // 最好禁用下面的参数，因为没有提供向前的安全性，但是对于部分客户端可能需要开启  
        // tls.TLS_RSA_WITH_AES_256_GCM_SHA384,  
        // tls.TLS_RSA_WITH_AES_128_GCM_SHA256,  
    }
```

Go的CBC密码族实现在Lucky13攻击下，不够稳定，因此我们在上面的配置中禁用了CBC密码族，虽然go1.8已经进行了改善。

注意！上述的优化只针对amd64架构，在此架构下，我们甚至可以考虑cloudflare公司的开源的性能极高的加密版本(AES-GCM,Chacha20-Poly2305,P256)。

当然，我们还需要证书，这里我们可以使用golang.org/x/crypto/acme/autocert和Letss Encrypt，同时别忘了将http请求重定向到https，如果你的客户端是浏览器，还可以考虑[HSTS](https://www.owasp.org/index.php/HTTP_Strict_Transport_Security_Cheat_Sheet).

```java
srv := &http.Server{  
    ReadTimeout:  5 * time.Second,  
    WriteTimeout: 5 * time.Second,  
    Handler: http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {  
        w.Header().Set("Connection", "close")  
        url := "https://" + req.Host + req.URL.String()  
        http.Redirect(w, req, url, http.StatusMovedPermanently)  
    }),  
}  
go func() { log.Fatal(srv.ListenAndServe()) }()  
```
**配置完后，我们可以使用[SSL labs tes](https://www.ssllabs.com/ssltest/)t来检查我们的TLS是否正确**


### net/http
net/http是一个成熟的HTTP1.1和HTTP2协议栈，具体怎么用，这里就不赘述了，我们来讲讲服务器端背后的故事。

###### timeouts
在外网环境中，这个参数是最重要的也是最容易被忽视的之一！你的后端服务如果不设置超时，在内网环境可能还Ok，但是到了外网环境，那就是灾难，特别是在遇到攻击时。

Timeouts的应用是一种资源控制，就算goroutine很廉价，但是文件描述符fd很昂贵的，一个不再工作或者长闲置的连接是不该去占用宝贵的fd的。

当服务器的fd不够用时，在accept新连接时就会失败，报错如下：
       
      http: Accept error: accept tcp [::]:80: accept: too many open files; retrying in 1s  

默认的net/http的http.Server，可以通过http.ListenAndServe和http.ListenAndServeTLS创建，是没有timeouts的，这完全不是我们想要的。


![](http://upload-images.jianshu.io/upload_images/8245841-e510b699ed79a261.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

如上图所示，http.Server主要有三种timeouts，ReadTimeout，WriteTimeout,IdleTimeout，我们可以这样设置：
```java
srv := &http.Server{  
    ReadTimeout:  5 * time.Second,  
    WriteTimeout: 10 * time.Second,  
    IdleTimeout:  120 * time.Second,  
    TLSConfig:    tlsConfig,  
    Handler:      serveMux,  
}  
log.Println(srv.ListenAndServeTLS("", ""))  
```

ReadTimeout是从连接accept一直到所有请求的body被完全读取(如果不读body，那就是所有header被读取)。该超时是net/http包在连接accept之后直接设置SetReadDeadline的。

ReadTimeout存在一个问题，服务器没有给更多的时间来流式处理来自客户端的数据。因此Go1.8引入了ReadHeaderTimeout，这里的超时仅仅针对Header的读取超时，当然这个没有解决根本问题，因此新的解决方案在[issue#16100](https://github.com/golang/go/issues/16100)有进一步的讨论，关于怎么在Handler中处理ReadTimeout。

WriteTimeout是从包头读取成功开始，一直到回复(response)的写入，是在[readRequest](https://github.com/golang/go/blob/3ba31558d1bca8ae6d2f03209b4cae55381175b3/src/net/http/server.go#L753-L755)的末尾调用SetWriteDeadline函数实现的。

当连接是HTTPS时，SetWriteDeadline会在连接accept后立刻调用一次，这里是处理TLS的握手超时。因此，这次超时是在HTTP包头读取或者等待第一个字节传输之前结束。

和ReadTimeout一样，WriteTimeout也无法从Handler中进行相对控制：[issue#16100](https://github.com/golang/go/issues/16100)

最后是IdleTimeout，这个是在Go1.8引入的一个很有用的参数，用来控制服务器端KeepAlive的连接允许空闲的最大时间。在go1.8之前，ReadTimeout有一个很大的问题，对于Keepalive的连接是不友好的(尽管可以在应用层来解决Idle的超时问题)：因为在上一个请求的读取完毕后，下一个请求的ReadTimeout会立即开始重新计时，这样连接空闲的时间也算在ReadTimeout内，造成了连接的过早断开。

综上所述，当我们在Go1.8中处理外部不受信任的连接时，我们要设置上这三个超时，这样客户端就不会因为各种过慢的写或者读，一直霸占连接了。

### http2
在Go1.6版本及之后，HTTP2会自动开启，当且仅当：
- 请求是基于TLS／HTTPS的
- Server.TLSNextProto设置为nil(注意，如果设置为空map，那会禁用HTTP2)
- Server.TLSConfig被设置并且ListenAndServerTLS被使用；或者，使用Serve,同时tls.Config.NextProtos包含了"h2"，例如[]string{"h2","http/1.1"}

同时在Go1.8版本修复了一个关于HTTP2的ReadTimeout的Bug，再结合1.8的其它特性，我的建议是尽快升级1.8。

### tcp keepalive
如果你在用ListenAndServe(与此相对的是给Serve传一个net.Listener参数，但是这种方式没有做任何防护)，那么三分钟长的TCP keepalive时间将自动被设置

如果你用的是TCP长连接服务，那么你该使用net.ListenTCP，同时设置keepalive时间，根据我的经验，如果不设置这个，那么长连接存在泄漏的风险，后面我会详细写一篇文章分析TCP连接泄漏的问题。

### metrics
我们可以用Server.ConnState来获取连接的状态，注意，我们要自己维护map[net.Conn]ConnState。

### 总结
以后再也不用在Go的Web服务前再前置一个Nginx了，节省了服务器同时也降低了请求的延迟，前提是，我们使用了Go1.8。
