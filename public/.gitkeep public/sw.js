
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {title:"🚭 戒烟提醒",body:"今天不要抽烟。",url:"/"};
  try { data = Object.assign(data, event.data.json()); } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "quit-smoking-reminder",
      renotify: true,
      requireInteraction: false,
      data: {url:data.url || "/"}
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url || "/";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){ if("focus" in c) return c.focus(); }
    if(clients.openWindow) return clients.openWindow(url);
  }));
});
