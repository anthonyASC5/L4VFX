(function () {
  const TAB_CONFIG = [
    {
      id: "motionvideo.html",
      dir: "html",
      label: "Motion Editor",
      aliases: ["index.html", ""],
    },
    {
      id: "lutgen.html",
      dir: "html",
      label: "LUT GEN",
    },
    {
      id: "crtvideo.html",
      dir: "html",
      label: "CRT Video",
    },
    {
      id: "lanzoid.html",
      dir: "lanzoid",
      label: "Lanzoid",
    },
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

  function getLocationInfo(pathname) {
    const shortPath = pathname.split("/").pop() || "index.html";
    let dir = "root";

    if (pathname.includes("/html/")) {
      dir = "html";
    } else if (pathname.includes("/lanzoid/")) {
      dir = "lanzoid";
    }

    return { dir, shortPath };
  }

  function resolveHref(tab) {
    const { dir } = getLocationInfo(window.location.pathname);

    if (dir === tab.dir) {
      return `./${tab.id}`;
    }

    if (dir === "root") {
      return `./${tab.dir}/${tab.id}`;
    }

    return `../${tab.dir}/${tab.id}`;
  }

  function canonicalPath(pathname) {
    const { shortPath } = getLocationInfo(pathname);
    const match = TAB_CONFIG.find((tab) => tab.id === shortPath || tab.aliases?.includes(shortPath));
    return match?.id || shortPath;
  }

  function rebuildNav(nav) {
    const activeHref = canonicalPath(window.location.pathname);
    const linkTarget = window.self !== window.top ? ' target="_top"' : "";
    nav.innerHTML = TAB_CONFIG.map((tab) => {
      const classes = ["mode-tab"];
      if (tab.id === activeHref) {
        classes.push("active");
      }
      return `<a class="${classes.join(" ")}" href="${resolveHref(tab)}"${linkTarget}>${tab.label}</a>`;
    }).join("");
  }

  function ensureHomeLogo() {
    if (document.querySelector(".site-home-logo")) {
      return;
    }

    const logo = document.createElement("a");
    logo.className = "site-home-logo";
    logo.href = resolveHref(TAB_CONFIG[0]);
    if (window.self !== window.top) {
      logo.target = "_top";
    }
    logo.setAttribute("aria-label", "Motion Editor home");
    logo.innerHTML = "<span>VIDEO</span>";
    if (canonicalPath(window.location.pathname) === TAB_CONFIG[0].id) {
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
