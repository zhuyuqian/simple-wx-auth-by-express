const express = require("express");
const app = express();
const axios = require("axios");
const crypto = require("crypto");

const port = 3000; // 启动端口

const SERVICE_URL = "http://zg5wiq.natappfree.cc"; // 服务器地址，把内网映射的公网地址填写到这里
const appID = "wx096378d58b6a306f"; // 微信测试号的appid
const appsecret = "a3b8f3c2516f6a9da4d2b129848abfd1"; // 微信测试号的appsecret
const token = "test1231"; // 微信测试号接口配置信息token

/**
 * @description: 配置微信测试号接口配置信息
 * @author: 仲灏<izhaong@outlook.com>🌶🌶🌶
 * @param {*} req
 * @return {*}
 */
const disposeInterface = (req) => {
  //1.获取微信服务器Get请求的参数 signature、timestamp、nonce、echostr
  const signature = req.query.signature, //微信加密签名
    timestamp = req.query.timestamp, //时间戳
    nonce = req.query.nonce, //随机数
    echostr = req.query.echostr; //随机字符串

  //2.将token、timestamp、nonce三个参数进行字典序排序
  const array = [token, timestamp, nonce];
  array.sort();

  //3.将三个参数字符串拼接成一个字符串进行sha1加密
  const tempStr = array.join("");
  const hashCode = crypto.createHash("sha1"); //创建加密类型
  const resultCode = hashCode.update(tempStr, "utf8").digest("hex"); //对传入的字符串进行加密

  //4.开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
  if (resultCode === signature) {
    return echostr;
  } else {
    return "mismatch";
  }
};

/**
 * @description 拼接完整的授权地址
 * @param {string} webUrl 前端调用授权前的地址（授权结束后需要返回的地址）
 * @date: 2021/9/27
 */
const getAuthUrl = (webUrl) => {
  let redirectUri = encodeURIComponent(
    `${SERVICE_URL}/wxBack?webUrl=${webUrl}`
  );
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo#wechat_redirect`;
};

/**
 * @description 获取accessToken和openid
 * @param {string} code 授权得到的code
 * @date: 2021/9/27
 */
const getAccessTokenByCode = async (code) => {
  let { data } = await axios.get(
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appID}&secret=${appsecret}&code=${code}&grant_type=authorization_code`
  );
  return data;
};

/**
 * @description 获取微信用户信息
 * @param {string} accessToken
 * @param {string} openid 用户openid
 * @date: 2021/9/27
 */
const getUserInfo = async (accessToken, openid) => {
  let { data } = await axios.get(
    `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`
  );
  return data;
};

app.get("/", function (req, res) {
    const disposeRes = disposeInterface(req)
    res.send(disposeRes)
});

// 前端页面
app.get("/user", (req, res) => res.sendFile(__dirname + "/" + "user.html"));

// 鉴权第一步：重定向至微信
app.get("/goAuth", (req, res) => {
  // 拿到调用授权的前端地址
  let { webUrl } = req.query;
  // 拿到鉴权的完整地址
  let authUrl = getAuthUrl(webUrl);
  // 重定向
  res.redirect(authUrl);
});

// 鉴权第二步：微信重定向回服务
app.get("/wxBack", async (req, res) => {
  // 拿到code和调用授权的前端地址
  let { webUrl, code } = req.query;
  // 获取accessToken
  let { access_token, openid } = await getAccessTokenByCode(code);
  // 获取用户信息
  let { nickname, headimgurl } = await getUserInfo(access_token, openid);
  // 重定向回前端
  headimgurl = headimgurl.replace("thirdwx.qlogo.cn", "wx.qlogo.cn");
  res.redirect(
    `${webUrl}?openid=${openid}&nickname=${nickname}&headimgurl=${headimgurl}`
  );
});

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});
