# 前言

> 大家平时在工作中，或多或少应该接触过`微信鉴权登录`，`获取用户信息`的相关需求。也有小伙伴经常会在群里问一些相关的问题，比如

- 鉴权登录的整体流程是什么？
- 整个流程里面，前端和后端的分工是什么？
- 前端专门准备了一个鉴权回调页面，要怎么回到鉴权前的页面？
- 怎么在本地测试微信网页授权？

先看看微信官方的鉴权流程怎么描述的

> 1. 第一步：用户同意授权，获取code
> 2. 第二步：通过code换取网页授权access_token
> 3. 第三步：刷新access_token（如果需要）
> 4. 第四步：拉取用户信息(需scope为 snsapi_userinfo)

还是懵，没关系，我在这里专门准备了一个小栗子，来实现了一套简易版的`网页授权`+`获取用户信息`的功能，整个流程大概是这样的

![Untitled Diagram.drawio.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e659122159b84ae79754bd9c359fc1e1~tplv-k3u1fbpfcp-watermark.image?)

在这个流程中，`前端不用做太多事`，只需要判断有没有用户信息，如果没有，剩下的事情交给后端，等后端全部处理完成，会`自动带着用户信息，返回之前的页面`。

并且`前端无需准备专门的授权结果`页面。

# 流程

## 第一步：内网映射

### 下载软件

> 下载地址：https://ngrok.com/download

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8efbf762cec74120b441ae8e76f32c9b~tplv-k3u1fbpfcp-watermark.image?)

解压出来之后是这个东西

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e0f1b134d2cc4ce7b58d8217df01121e~tplv-k3u1fbpfcp-watermark.image?)

### 终端启动

将解压出来的`文件拖到终端`中，紧接着写`http 3000`，意思就是用ngrok在`3000`端口上开启一个http映射隧道。

![AE2DFA04-ADA2-4AB4-B194-A27999D36534.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/73a0ca96926942d59506701d3bdea704~tplv-k3u1fbpfcp-watermark.image?)

启动之后出现下面这个界面，就说明成功了。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c463671bd69d4a3cb843167263e4786d~tplv-k3u1fbpfcp-watermark.image?)

这个就是我们需要的域名：`https://0772-183-159-254-252.ngrok.io`。


## 第二步：微信测试号

### 登录测试账号

> 登录地址：http://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login


![B72D97EE-0B92-4334-8C41-B8F6035C9D8A.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7dac6adfce694b828e137df2d89730bf~tplv-k3u1fbpfcp-watermark.image?)

> 目前我们拿到了`appID`和`appsecret`，`接口配置信息`和`JS接口安全域名`先暂时不用管，网页授权用不到。

### 修改授权回调域名

> 网页向下翻，翻到网页服务 => 网页账号 => 修改

![D1AC04A2-560D-48E4-9D0A-D96CB938EF2C.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a95babf5300a4a4b9ba4e016e80b9139~tplv-k3u1fbpfcp-watermark.image?)

将之前拿到的`内网映射地址`填进来，注意`不要写https://`

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b62ae5ec7edc40408511cfecf7014735~tplv-k3u1fbpfcp-watermark.image?)

### 扫码关注测试号

> 因为如果不关注，测试授权会报错的

## 第三步：搭建项目

> 这里我们使用`express`这个node框架

### package.json

```json
{
  "name": "simple-wx-auth-by-express",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "axios": "^0.21.4",
    "express": "^4.17.1"
  },
  "devDependencies": {}
}
```

### index.js

> 注意将之前`内网映射`的地址、微信测试号的`appID`和`appsecret`填写到对应的位置；

``` javascript
const express = require('express');
const app = express();
const axios = require('axios');
const port = 3000; // 启动端口

const SERVICE_URL = 'https://0772-183-159-254-252.ngrok.io'; // 服务器地址，把内网映射的地址填写到这里
const appID = ''; // 微信测试号的appid
const appsecret = ''; // 微信测试号的appsecret

/**
 * @description 拼接完整的授权地址
 * @param {string} webUrl 前端调用授权前的地址（授权结束后需要返回的地址）
 * @date: 2021/9/27
 */
const getAuthUrl = (webUrl) => {
    let redirectUri = encodeURIComponent(`${SERVICE_URL}/wxBack?webUrl=${webUrl}`);
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo#wechat_redirect`
}

/**
 * @description 获取accessToken和openid
 * @param {string} code 授权得到的code
 * @date: 2021/9/27
 */
const getAccessTokenByCode = async (code) => {
    let {data} = await axios.get(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appID}&secret=${appsecret}&code=${code}&grant_type=authorization_code`)
    return data
}

/**
 * @description 获取微信用户信息
 * @param {string} accessToken
 * @param {string} openid 用户openid
 * @date: 2021/9/27
 */
const getUserInfo = async (accessToken, openid) => {
    let {data} = await axios.get(`https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`)
    return data
}

// 前端页面
app.get('/user', (req, res) => res.sendFile(__dirname + "/" + "user.html"));

// 鉴权第一步：重定向至微信
app.get('/goAuth', (req, res) => {
    // 拿到调用授权的前端地址
    let {webUrl} = req.query;
    // 拿到鉴权的完整地址
    let authUrl = getAuthUrl(webUrl);
    // 重定向
    res.redirect(authUrl);
})

// 鉴权第二步：微信重定向回服务
app.get('/wxBack', async (req, res) => {
    // 拿到code和调用授权的前端地址
    let {webUrl, code} = req.query;
    // 获取accessToken
    let {access_token, openid} = await getAccessTokenByCode(code);
    // 获取用户信息
    let {nickname, headimgurl} = await getUserInfo(access_token, openid);
    // 重定向回前端
    headimgurl = headimgurl.replace('thirdwx.qlogo.cn', 'wx.qlogo.cn');
    res.redirect(`${webUrl}?openid=${openid}&nickname=${nickname}&headimgurl=${headimgurl}`);
})

app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
})
```

### user.html

> 这是专门用来测试的页面，因为只需要测一下有没有拿到用户信息，所以仅仅简单的获取了一下openid和用户头像。

- `先判断url上有没有携带openid`，如果没有，就直接重定向跳转到服务器地址开始授权；
- 如果有，就`直接把获取到的头像显示在页面上`；
- **注意：这里也需要把内网映射地址修改一下**

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
    <script src="https://cdn.bootcdn.net/ajax/libs/axios/0.21.1/axios.js"></script>
</head>
<body>
<div id="app"></div>
<script>
    var SERVICE_BASE = 'https://0772-183-159-254-252.ngrok.io' // 内网映射的服务端地址
    // 获取url参数
    function getQueryVariable() {
        var url = location.search; //获取url中"?"符后的字串
        var theRequest = new Object();
        if (url.indexOf("?") != -1) {
            var str = url.substr(1);
            strs = str.split("&");
            for (var i = 0; i < strs.length; i++) {
                theRequest[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
            }
        }
        return theRequest;
    }

    // 获取用户信息
    function getUserInfo() {
        var params = getQueryVariable();
        var openid = params.openid;
        if (!openid) { // 开始授权
            window.location.href = SERVICE_BASE + '/goAuth?webUrl=' + window.location.href;
        } else { // 授权结束
            let html = `头像：<img src="${params.headimgurl}">`
            let app = document.getElementById('app');
            app.innerHTML = html;
        }
    }

    window.addEventListener('load', function () {
        getUserInfo();
    })
</script>
</body>
</html>
```

## 第四步：测试

### 安装依赖

``` shell
npm install
```

### 启动项目

``` shell
npm run start
```

### 微信访问页面

```
https://0772-183-159-254-252.ngrok.io/user
```

如果不出意外，访问页面之后，你应该能弹出授权，同意之后回返回页面并出现你的头像了。


![1632720004926210.gif](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/97fa4cae27184e0bbe3583c37b7a6fc9~tplv-k3u1fbpfcp-watermark.image?)

这里因为我同意授权过，所以没有再次弹出来～
