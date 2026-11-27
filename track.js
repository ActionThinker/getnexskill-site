/* GetNexSkill 事件埋点（CF Analytics Worker 部署后生效；未部署时 sendBeacon 静默失败，不影响页面）
   Worker 部署见 D:\shared\methodology\website-analytics\website-analytics-sop.md（DNS 迁移后执行） */
(function () {
  var EP = "https://stats.getnexskill.com/api/evt";
  function send(name) {
    try {
      navigator.sendBeacon(EP, JSON.stringify({ e: name, t: Date.now(), p: location.pathname, r: document.referrer }));
    } catch (e) { /* noop */ }
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track]");
    if (el) send(el.getAttribute("data-track"));
  }, true);
  send("pageview");
})();
