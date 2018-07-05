>本文发表时间：2018年3月12号

虽然国家目前严令禁止ICO，但是我觉得基于区块链平台的虚拟币本身是很有价值的，大家只要不去碰基于发币的ICO就好，因此这里简单谈谈怎么在以太坊发行自己的代币(Test网络)。

### 翻墙
目前来说，相关的网站很多都是被墙的，因此没有梯子建议就放弃吧，推荐自己购买香港或者海外的云服务器，用shadowsocks搭建代理，注意如果用阿里云的话，不要用视频等大流量服务，可能会被封。

### 下载安装
下载并安装最新版本以太坊钱包

### 选择网络
下载好以太坊钱包后选择`testnet`,别选成`mainnet`了,创建代币合约和转账代币是要收费的。选好testnet后，钱包会去同步区块信息，目前都是快速同步区块的header，而且是点对点的方式，所以很快。

![选择Rinkeby测试网络](https://upload-images.jianshu.io/upload_images/8245841-c05c399623f6d74b.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 创建账户
在钱包界面选择Wallet，然后选择ADD ACCOUNT
![创建账户](http://upload-images.jianshu.io/upload_images/8245841-10961b09583445cd?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 领取测试环境的以太币ether
新建完账户，余额是0.00ether
![账号余额](https://upload-images.jianshu.io/upload_images/8245841-34e1d6fade8ef1b0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

因此我们需要领取一些rinkeby测试环境的ether,进入[链接](https://faucet.rinkeby.io),可以看到有三种方法获取,我们就用第一种发推特的方式,点击下面圈出来的tweet的链接:
![发推领取测试ether](http://upload-images.jianshu.io/upload_images/8245841-62605da78bd19636?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

接着会弹出以下推文,把0x0000...换成你的账户地址0x...，然后发布推文即可：
![发推文，替换账户地址](http://upload-images.jianshu.io/upload_images/8245841-ba7a253727582b8b?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![账户地址](https://upload-images.jianshu.io/upload_images/8245841-4d733dc3f8b33f3f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


接着进入twitter，找到发表的推文，拷贝链接：
![拷贝推文链接](https://upload-images.jianshu.io/upload_images/8245841-ae7ba4afdf85c17f.jpeg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

最后回到领取ether的[链接](https://faucet.rinkeby.io)，把推文链接粘贴进去
![获取ether](https://upload-images.jianshu.io/upload_images/8245841-73dd07f01eda3588.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

过大概3-10分钟，就能在你的钱包看到ether币了！
![以太币到位](https://upload-images.jianshu.io/upload_images/8245841-f884fba20a78f5db.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 创建智能合约
![创建合约](http://upload-images.jianshu.io/upload_images/8245841-ee622444c5f33b79?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![选择合约](http://upload-images.jianshu.io/upload_images/8245841-9db857bc302b2799?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


拷贝以下合约代码(这段代码是从官方的[token例子]([https://www.ethereum.org/token#the-code)中拷贝的，但是官方的例子有Bug，这里予以修复)
```solidity
pragma solidity ^0.4.16;

interface tokenRecipient { function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) external; }

contract TokenERC20 {
    // Public variables of the token
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    // 18 decimals is the strongly suggested default, avoid changing it
    uint256 public totalSupply;

    // This creates an array with all balances
    mapping (address => uint256) public balanceOf;
    mapping (address => mapping (address => uint256)) public allowance;

    // This generates a public event on the blockchain that will notify clients
    event Transfer(address indexed from, address indexed to, uint256 value);

    // This notifies clients about the amount burnt
    event Burn(address indexed from, uint256 value);

    /**
     * Constructor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    function TokenERC20(
        uint256 initialSupply,
        string tokenName,
        string tokenSymbol
    ) public {
        totalSupply = initialSupply * 10 ** uint256(decimals);  // Update total supply with the decimal amount
        balanceOf[msg.sender] = totalSupply;                // Give the creator all initial tokens
        name = tokenName;                                   // Set the name for display purposes
        symbol = tokenSymbol;                               // Set the symbol for display purposes
    }

    /**
     * Internal transfer, only can be called by this contract
     */
    function _transfer(address _from, address _to, uint _value) internal {
        // Prevent transfer to 0x0 address. Use burn() instead
        require(_to != 0x0);
        // Check if the sender has enough
        require(balanceOf[_from] >= _value);
        // Check for overflows
        require(balanceOf[_to] + _value > balanceOf[_to]);
        // Save this for an assertion in the future
        uint previousBalances = balanceOf[_from] + balanceOf[_to];
        // Subtract from the sender
        balanceOf[_from] -= _value;
        // Add the same to the recipient
        balanceOf[_to] += _value;
        emit Transfer(_from, _to, _value);
        // Asserts are used to use static analysis to find bugs in your code. They should never fail
        assert(balanceOf[_from] + balanceOf[_to] == previousBalances);
    }

    /**
     * Transfer tokens
     *
     * Send `_value` tokens to `_to` from your account
     *
     * @param _to The address of the recipient
     * @param _value the amount to send
     */
    function transfer(address _to, uint256 _value) public {
        _transfer(msg.sender, _to, _value);
    }

    /**
     * Transfer tokens from other address
     *
     * Send `_value` tokens to `_to` on behalf of `_from`
     *
     * @param _from The address of the sender
     * @param _to The address of the recipient
     * @param _value the amount to send
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_value <= allowance[_from][msg.sender]);     // Check allowance
        allowance[_from][msg.sender] -= _value;
        _transfer(_from, _to, _value);
        return true;
    }

    /**
     * Set allowance for other address
     *
     * Allows `_spender` to spend no more than `_value` tokens on your behalf
     *
     * @param _spender The address authorized to spend
     * @param _value the max amount they can spend
     */
    function approve(address _spender, uint256 _value) public
        returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        return true;
    }

    /**
     * Set allowance for other address and notify
     *
     * Allows `_spender` to spend no more than `_value` tokens on your behalf, and then ping the contract about it
     *
     * @param _spender The address authorized to spend
     * @param _value the max amount they can spend
     * @param _extraData some extra information to send to the approved contract
     */
    function approveAndCall(address _spender, uint256 _value, bytes _extraData)
        public
        returns (bool success) {
        tokenRecipient spender = tokenRecipient(_spender);
        if (approve(_spender, _value)) {
            spender.receiveApproval(msg.sender, _value, this, _extraData);
            return true;
        }
    }

    /**
     * Destroy tokens
     *
     * Remove `_value` tokens from the system irreversibly
     *
     * @param _value the amount of money to burn
     */
    function burn(uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value);   // Check if the sender has enough
        balanceOf[msg.sender] -= _value;            // Subtract from the sender
        totalSupply -= _value;                      // Updates totalSupply
        emit Burn(msg.sender, _value);
        return true;
    }

    /**
     * Destroy tokens from other account
     *
     * Remove `_value` tokens from the system irreversibly on behalf of `_from`.
     *
     * @param _from the address of the sender
     * @param _value the amount of money to burn
     */
    function burnFrom(address _from, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value);                // Check if the targeted balance is enough
        require(_value <= allowance[_from][msg.sender]);    // Check allowance
        balanceOf[_from] -= _value;                         // Subtract from the targeted balance
        allowance[_from][msg.sender] -= _value;             // Subtract from the sender's allowance
        totalSupply -= _value;                              // Update totalSupply
        emit Burn(_from, _value);
        return true;
    }
}

```


![合约信息](http://upload-images.jianshu.io/upload_images/8245841-e865be844057a411?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


token name ,和 token symbol自己可以随便命名，然后把费用Fee拉到最大（Faster,为了更快的让矿工记录你的合约),最后点击发布就ok了。


### 发起转账
目标账户地址可以填写`[0x8DF451466Ee0e75F73eafB36a8C0833F3022a687](/send/0x8DF451466Ee0e75F73eafB36a8C0833F3022a687 "0x8DF451466Ee0e75F73eafB36a8C0833F3022a687")
`

![转账界面](https://upload-images.jianshu.io/upload_images/8245841-0c9e9c5181b57bc4.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


查看转账信息
![image.png](https://upload-images.jianshu.io/upload_images/8245841-62448637f92af9e4.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

点击其中一笔转账
![image.png](https://upload-images.jianshu.io/upload_images/8245841-cc6ef77deb932384.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


点击上图的Transaction下的蓝色地址，可以前往rinkeby.io查看详细信息


### 小结
发代币的基本方法已经介绍完了，在后续章节，会继续介绍发行代币的高级技巧，欢迎大家订阅。
这里要额外提一下，发代币的关键就是智能合约，而智能合约一旦上传是不可变的，因此请务必小心谨慎：
- 确保智能合约没有Bug，一旦存在Bug，你就别想去修复了
- 代码要尽量简洁，代码越长，执行费用越高（每次转账都要执行一次)

同时，大家也可以在[这里](https://coinmarketcap.com/tokens/)查看代币的Coin
