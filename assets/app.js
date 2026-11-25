/* ==========================================================================
   mitya.su — Minimal client-side enhancements
   1. Light/Dark theme toggle (uses localStorage only when user clicks; no cookies)
   2. Anti-scraper email assembly & one-click copy
   3. Graceful avatar photo fallback
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var STORAGE_KEY = "mitya_theme";

  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    }
  } catch (_) {
    // Ignore storage restrictions
  }

  document.addEventListener("DOMContentLoaded", function () {
    // 0. Theme-aware 88x31 counter (loads only the active theme variant, hides gracefully if blocked)
    var counterLink = document.querySelector("[data-counter-link]");
    var counterImg = document.querySelector("[data-counter-img]");
    function syncCounterTheme() {
      if (!counterImg) return;
      var isDark = root.getAttribute("data-theme") === "dark";
      var nextSrc = isDark
        ? counterImg.getAttribute("data-dark-src")
        : counterImg.getAttribute("data-light-src");
      if (nextSrc && counterImg.getAttribute("src") !== nextSrc) {
        counterImg.setAttribute("src", nextSrc);
      }
    }
    if (counterImg) {
      counterImg.addEventListener("error", function () {
        if (counterLink) counterLink.style.display = "none";
      });
      syncCounterTheme();
    }

    // 1. Theme toggle
    var themeBtn = document.querySelector("[data-theme-toggle]");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        syncCounterTheme();
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch (_) {}
      });
    }

    // 2. Graceful portrait fallback + hover/tap living-portrait easter egg
    var portraitFrame = document.querySelector("[data-portrait-frame]");
    var portraitImg = document.querySelector("[data-portrait-img]");
    var portraitVideo = document.querySelector("[data-portrait-video]");
    if (portraitFrame && portraitImg) {
      var showFallback = function () {
        portraitFrame.classList.add("is-fallback");
      };
      portraitImg.addEventListener("error", showFallback);
      if (portraitImg.complete && portraitImg.naturalWidth === 0) {
        showFallback();
      }
    }

    if (portraitFrame && portraitVideo) {
      var reducedMotion =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var isEasterActive = false;
      var resetTimer = null;

      function triggerPortraitEaster() {
        if (reducedMotion || isEasterActive || portraitFrame.classList.contains("is-fallback")) {
          return;
        }
        isEasterActive = true;
        if (resetTimer) {
          clearTimeout(resetTimer);
          resetTimer = null;
        }
        if (!portraitVideo.getAttribute("src")) {
          var src = portraitVideo.getAttribute("data-src");
          if (!src) {
            isEasterActive = false;
            return;
          }
          portraitVideo.setAttribute("src", src);
          portraitVideo.load();
        }
        try {
          portraitVideo.currentTime = 0;
        } catch (_) {}

        var playPromise = portraitVideo.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise.catch(function () {
            isEasterActive = false;
            portraitFrame.classList.remove("is-playing");
          });
        }
      }

      portraitVideo.addEventListener("playing", function () {
        portraitFrame.classList.add("is-playing");
      });

      portraitVideo.addEventListener("ended", function () {
        resetTimer = setTimeout(function () {
          portraitFrame.classList.remove("is-playing");
          isEasterActive = false;
        }, 1800);
      });

      portraitVideo.addEventListener("error", function () {
        portraitFrame.classList.remove("is-playing");
        isEasterActive = false;
      });

      portraitFrame.addEventListener("mouseenter", triggerPortraitEaster);
      portraitFrame.addEventListener("click", triggerPortraitEaster);
    }

    // 3. Anti-bot email assembly (never stored in plaintext in HTML)
    var emailTriggers = document.querySelectorAll("[data-email-trigger]");
    var feedbackEl = document.querySelector("[data-email-feedback]");
    var isEn = document.documentElement.lang === "en";

    function decodeEmail(el) {
      var u = el.getAttribute("data-u") || "";
      var d = el.getAttribute("data-d") || "";
      var t = el.getAttribute("data-t") || "";
      return u.split("").reverse().join("") + "@" + d.split("").reverse().join("") + "." + t;
    }

    emailTriggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var address = decodeEmail(trigger);
        var labelSpan = trigger.querySelector("[data-email-label]");
        if (labelSpan) {
          labelSpan.textContent = address;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(address).then(
            function () {
              if (feedbackEl) {
                feedbackEl.innerHTML =
                  (isEn ? "Copied: " : "Скопировано: ") +
                  '<a href="mailto:' +
                  address +
                  '">' +
                  address +
                  "</a>";
              }
            },
            function () {
              window.location.href = "mailto:" + address;
            }
          );
        } else {
          if (feedbackEl) {
            feedbackEl.innerHTML =
              '<a href="mailto:' + address + '">' + address + "</a>";
          }
          window.location.href = "mailto:" + address;
        }
      });
    });
  });
})();
