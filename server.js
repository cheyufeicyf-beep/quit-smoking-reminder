
const express = require("express");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const webpush = require("web-push");

const app = express();
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const TZ = process.env.APP_TIMEZONE || "Asia/Shanghai";
const DATA_FILE = process.env.SUBSCRIPTIONS_FILE || path.join(__dirname, "data", "subscriptions.json");
const VAPID_FILE = process.env.VAPID_FILE || path.join(__dirname, "data", "vapid.json");

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function saveJson(file, value) {
  ensureDir(file);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

let vapid;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapid = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  };
} else {
  vapid = loadJson(VAPID_FILE, null);
  if (!vapid || !vapid.publicKey || !vapid.privateKey) {
    vapid = webpush.generateVAPIDKeys();
    saveJson(VAPID_FILE, vapid);
    console.log("Generated VAPID keys");
  }
}

const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
webpush.setVapidDetails(SUBJECT, vapid.publicKey, vapid.privateKey);

function getSubscriptions() {
  return loadJson(DATA_FILE, []);
}
function setSubscriptions(list) {
  saveJson(DATA_FILE, list);
}
function sameSub(a,b) {
  return a && b && a.endpoint === b.endpoint;
}

app.get("/api/health", (req,res)=>res.json({ok:true, timezone:TZ}));

app.get("/api/vapid-public-key", (req,res)=>{
  res.json({publicKey:vapid.publicKey});
});

app.post("/api/subscribe", (req,res)=>{
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ok:false,error:"invalid subscription"});
  const list = getSubscriptions();
  if (!list.some(x=>sameSub(x,sub))) {
    list.push(sub);
    setSubscriptions(list);
  }
  res.json({ok:true,count:list.length});
});

app.post("/api/unsubscribe", (req,res)=>{
  const endpoint = req.body && req.body.endpoint;
  const list = getSubscriptions().filter(x=>x.endpoint !== endpoint);
  setSubscriptions(list);
  res.json({ok:true,count:list.length});
});

async function sendToAll(payload) {
  const list = getSubscriptions();
  const alive = [];
  let sent = 0;

  for (const sub of list) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), {
        TTL: 60 * 10,
        urgency: "high"
      });
      alive.push(sub);
      sent++;
    } catch (err) {
      // 404/410 = subscription expired; drop it
      if (!(err && (err.statusCode === 404 || err.statusCode === 410))) {
        alive.push(sub);
        console.error("Push failed:", err.statusCode || "", err.message || err);
      }
    }
  }
  if (alive.length !== list.length) setSubscriptions(alive);
  console.log("Push complete", {sent, total: list.length});
}

app.post("/api/test-push", async (req,res)=>{
  await sendToAll({
    title:"🚭 戒烟提醒",
    body:"这是测试通知：今天不要抽烟。先忍 10 分钟，你就赢一次。",
    url:"/"
  });
  res.json({ok:true});
});

// 默认：每天 10:00、12:00、14:00、16:00、18:00、20:00
const scheduleHours = (process.env.REMINDER_HOURS || "10,12,14,16,18,20")
  .split(",").map(x=>parseInt(x.trim(),10)).filter(Number.isFinite);

for (const hour of scheduleHours) {
  cron.schedule(`0 ${hour} * * *`, async () => {
    await sendToAll({
      title:"🚭 今天不要抽烟",
      body:"先忍 10 分钟。少抽这一根，就是今天的一次胜利。",
      url:"/"
    });
  }, { timezone: TZ });
  console.log(`Scheduled reminder ${hour}:00 ${TZ}`);
}

app.get("*", (req,res)=>{
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
