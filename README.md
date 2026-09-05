
# 戒烟提醒 · 真后台 Web Push 版

这个版本和普通 PWA 的区别：
- 用户把网页安装到安卓桌面
- 用户允许通知
- 后端保存浏览器 Push Subscription
- 后端按时间主动发送 Web Push
- 即使网页没有打开，安卓仍可从系统通知栏收到提醒

默认提醒：
10:00 / 12:00 / 14:00 / 16:00 / 18:00 / 20:00
默认时区：Asia/Shanghai

## 本地运行
需要 Node.js 20+

npm install
npm start

然后浏览器访问 http://localhost:3000

注意：除 localhost 外，Web Push / Service Worker 正式环境必须使用 HTTPS。

## 推荐部署方式
可部署到 Render、Railway、Fly.io 等支持长期运行 Node 服务的平台。

必须保证：
1. 有 HTTPS
2. Node 服务长期运行
3. data 目录可持久化，避免重启后订阅丢失
4. VAPID key 不要每次部署都重新生成

本项目支持环境变量：
- APP_TIMEZONE=Asia/Shanghai
- REMINDER_HOURS=10,12,14,16,18,20
- VAPID_SUBJECT=mailto:你的邮箱
- SUBSCRIPTIONS_FILE=/持久化目录/subscriptions.json
- VAPID_FILE=/持久化目录/vapid.json

## 安卓用户安装
1. 用 Chrome 打开你部署后的 HTTPS 链接
2. 浏览器菜单 → 安装应用 / 添加到主屏幕
3. 打开桌面上的“戒烟提醒”
4. 点击“开启后台提醒”
5. 允许通知
6. 点击“测试推送”验证

之后后端会按设定时间主动推送。
