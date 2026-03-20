(function () {
  const TAB_CONFIG = [
    { href: "./motionvideo.html", label: "Motion Editor", aliases: ["./index.html", "./"] },
    { href: "./crtvideo.html", label: "CRT Video" },
  ];

  function injectStyles() {
    if (document.getElementById("mode-nav-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "mode-nav-style";
    style.textContent = `
      .site-home-logo {
        position: fixed;
        top: 12px;
        left: 12px;
        z-index: 999;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 12px 8px;
        border: 2px solid var(--line, rgba(255,255,255,0.16));
        background: rgba(8, 8, 8, 0.9);
        color: var(--text, #ffffff);
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: 0.08rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(6px);
      }

      .site-home-logo.is-home {
        border-color: #66ff7a;
        box-shadow:
          0 8px 24px rgba(0, 0, 0, 0.28),
          0 0 22px rgba(102, 255, 122, 0.22);
      }

      .site-home-logo span {
        font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
        font-size: 0.72rem;
        line-height: 1.2;
        font-weight: 700;
      }
    `;
    document.head.append(style);
  }

  function canonicalPath(pathname) {
    const shortPath = pathname.split("/").pop() || "index.html";
    const localPath = shortPath ? `./${shortPath}` : "./";
    const match = TAB_CONFIG.find((tab) => tab.href === localPath || tab.aliases?.includes(localPath));
    return match?.href || localPath;
  }

  function rebuildNav(nav) {
    const activeHref = canonicalPath(window.location.pathname);
    const linkTarget = window.self !== window.top ? ' target="_top"' : "";
    nav.innerHTML = TAB_CONFIG.map((tab) => {
      const classes = ["mode-tab"];
      if (tab.href === activeHref) {
        classes.push("active");
      }
      return `<a class="${classes.join(" ")}" href="${tab.href}"${linkTarget}>${tab.label}</a>`;
    }).join("");
  }

  function ensureHomeLogo() {
    if (document.querySelector(".site-home-logo")) {
      return;
    }

    const logo = document.createElement("a");
    logo.className = "site-home-logo";
    logo.href = "./motionvideo.html";
    if (window.self !== window.top) {
      logo.target = "_top";
    }
    logo.setAttribute("aria-label", "Motion Editor home");
    logo.innerHTML = "<span>VIDEO</span>";
    if (canonicalPath(window.location.pathname) === "./motionvideo.html") {
      logo.classList.add("is-home");
    }
    document.body.append(logo);
  }

  function enhanceNav(nav) {
    if (!nav || nav.dataset.dropdownReady === "true") {
      return;
    }

    rebuildNav(nav);
    nav.dataset.dropdownReady = "true";
  }

  injectStyles();
  document.querySelectorAll("nav.mode-tabs").forEach(enhanceNav);
  ensureHomeLogo();
})();
