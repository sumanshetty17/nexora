(function () {
  var script = document.currentScript;
  if (!script) return;
  var id = script.getAttribute("data-nexora");
  if (!id) return;
  var origin = new URL(script.src).origin;
  var color = script.getAttribute("data-color") || "#21564A";
  var iframeSrc = origin + "/w/" + encodeURIComponent(id);

  var root = document.createElement("div");
  root.setAttribute("data-nexora-root", id);
  root.style.cssText =
    "all:initial;position:fixed;z-index:2147483000;right:18px;bottom:18px;font-family:ui-sans-serif,system-ui,sans-serif;";

  var frameWrap = document.createElement("div");
  frameWrap.style.cssText =
    "display:none;position:relative;width:min(380px,calc(100vw - 24px));height:min(640px,calc(100vh - 96px));overflow:hidden;border-radius:22px;box-shadow:0 24px 60px rgba(20,18,16,.28);border:1px solid rgba(20,18,16,.12);background:#f7f5ef;";

  var iframe = document.createElement("iframe");
  iframe.src = iframeSrc;
  iframe.title = "Chat assistant";
  iframe.style.cssText = "width:100%;height:100%;border:0;background:transparent;";
  iframe.setAttribute("allow", "clipboard-write");
  frameWrap.appendChild(iframe);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Open chat");
  btn.style.cssText =
    "margin-top:12px;margin-left:auto;display:flex;align-items:center;justify-content:center;width:56px;height:56px;border:0;border-radius:999px;background:" +
    color +
    ";color:#f4f1ea;box-shadow:0 12px 28px rgba(20,18,16,.25);cursor:pointer;";
  btn.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.1-3.1A7.96 7.96 0 0 1 4 12z"/></svg>';

  var closeIcon =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var chatIcon = btn.innerHTML;

  var open = false;
  function setOpen(next) {
    open = next;
    frameWrap.style.display = open ? "block" : "none";
    btn.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    btn.innerHTML = open ? closeIcon : chatIcon;
  }

  btn.addEventListener("click", function () {
    setOpen(!open);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) setOpen(false);
  });

  root.appendChild(frameWrap);
  root.appendChild(btn);
  document.body.appendChild(root);

  if (script.getAttribute("data-open") === "1") setOpen(true);
})();
