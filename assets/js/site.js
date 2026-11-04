/*
 * Small progressive enhancements for the homepage. The page is fully readable without this file.
 *  1. Light/dark theme toggle (Pico CSS reads `data-theme` on <html>). With no saved choice the
 *     page follows the system setting; the inline script in <head> applies a saved choice early.
 *  2. Email links: the address is stored reversed in `data-email` so simple scrapers don't pick it up.
 *  3. Header: highlight the link of the section in view and keep in-page jumps clear of the header.
 *  4. Space key activates links styled as buttons (`a[role="button"]`), as it does for real buttons.
 *  5. Footer year.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* ---------- 1. Theme toggle ---------- */

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit === 'light' || explicit === 'dark') return explicit;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      /* storage unavailable: the choice lasts for this page view only */
    }
  }

  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    var updateLabel = function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      var label = 'Switch to ' + next + ' theme';
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
    };

    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      saveTheme(next);
      updateLabel();
    });

    if (darkQuery) {
      var onSystemChange = function () {
        if (!root.hasAttribute('data-theme')) updateLabel();
      };
      if (darkQuery.addEventListener) darkQuery.addEventListener('change', onSystemChange);
      else if (darkQuery.addListener) darkQuery.addListener(onSystemChange);
    }

    updateLabel();
    toggle.hidden = false;
  }

  /* ---------- 2. Email links ---------- */

  var emailLinks = document.querySelectorAll('a[data-email]');
  for (var i = 0; i < emailLinks.length; i++) {
    var address = emailLinks[i].getAttribute('data-email').split('').reverse().join('');
    emailLinks[i].setAttribute('href', 'mailto:' + address);
  }

  /* ---------- 3. Header: current section + scroll offset ---------- */

  var header = document.querySelector('.site-header');
  var navScroller = document.querySelector('.section-nav');
  var navLinks = navScroller ? navScroller.querySelectorAll('a[href^="#"]') : [];
  var sections = [];
  for (var j = 0; j < navLinks.length; j++) {
    var section = document.getElementById(navLinks[j].getAttribute('href').slice(1));
    if (section) sections.push(section);
  }

  if (header && sections.length) {
    var activeId = null;
    // After a nav click (or loading with #section in the URL) that section stays highlighted until
    // the user scrolls themselves. Otherwise a short section near the bottom of the page, which
    // can't scroll to the top, would never become current.
    var pinnedId = null;
    var settling = false;
    var settleTimer = null;
    var frame = null;

    var syncHeaderOffset = function () {
      root.style.setProperty('--site-header-offset', header.offsetHeight + 'px');
    };

    var revealInNav = function (link) {
      if (navScroller.scrollWidth <= navScroller.clientWidth) return; // row isn't scrollable
      var linkBox = link.getBoundingClientRect();
      var navBox = navScroller.getBoundingClientRect();
      var left = navScroller.scrollLeft + (linkBox.left - navBox.left) - (navBox.width - linkBox.width) / 2;
      // Only scroll the link row itself; scrollIntoView() could interrupt the page's own scrolling.
      if (navScroller.scrollTo) {
        navScroller.scrollTo({ left: left, behavior: reducedMotion && reducedMotion.matches ? 'auto' : 'smooth' });
      } else {
        navScroller.scrollLeft = left;
      }
    };

    var setActive = function (id) {
      if (id === activeId) return;
      activeId = id;
      for (var k = 0; k < navLinks.length; k++) {
        if (navLinks[k].getAttribute('href') === '#' + id) {
          navLinks[k].setAttribute('aria-current', 'true');
          revealInNav(navLinks[k]);
        } else {
          navLinks[k].removeAttribute('aria-current');
        }
      }
    };

    var sectionInView = function () {
      var doc = document.documentElement;
      // At the very bottom the last section is current even if it's too short to reach the top.
      if (window.innerHeight + window.pageYOffset >= doc.scrollHeight - 2) {
        return sections[sections.length - 1].id;
      }
      // Otherwise: the last section whose top has passed a line just below the header.
      var line = header.offsetHeight + window.innerHeight * 0.3;
      var current = null;
      for (var k = 0; k < sections.length; k++) {
        if (sections[k].getBoundingClientRect().top <= line) current = sections[k].id;
      }
      return current;
    };

    var update = function () {
      frame = null;
      setActive(pinnedId || sectionInView());
    };

    var scheduleUpdate = function () {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    var endSettle = function () {
      settling = false;
    };

    var pin = function (id) {
      pinnedId = id;
      settling = true; // ignore the scroll events caused by the jump itself
      clearTimeout(settleTimer);
      settleTimer = setTimeout(endSettle, 200);
      setActive(id);
    };

    var unpin = function () {
      if (pinnedId === null) return;
      pinnedId = null;
      settling = false;
      scheduleUpdate();
    };

    window.addEventListener('scroll', function () {
      if (pinnedId !== null) {
        if (settling) {
          clearTimeout(settleTimer);
          settleTimer = setTimeout(endSettle, 200);
          return;
        }
        pinnedId = null;
      }
      scheduleUpdate();
    }, { passive: true });

    // Any scrolling the user starts themselves releases a pinned section.
    window.addEventListener('wheel', unpin, { passive: true });
    window.addEventListener('touchstart', unpin, { passive: true });
    window.addEventListener('keydown', unpin);

    window.addEventListener('resize', function () {
      syncHeaderOffset();
      scheduleUpdate();
    });

    navScroller.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
      if (link) pin(link.getAttribute('href').slice(1));
    });

    syncHeaderOffset();
    var initial = window.location.hash.slice(1);
    if (initial && document.getElementById(initial) && sections.indexOf(document.getElementById(initial)) !== -1) {
      pin(initial);
    } else {
      update();
    }
  }

  /* ---------- 4. Space key on button-styled links ---------- */

  // Pico styles <a role="button"> as a button; ARIA buttons are expected to respond to Space as
  // well as Enter. Same approach as GOV.UK Frontend's button component.
  document.addEventListener('keydown', function (event) {
    var target = event.target;
    if ((event.key === ' ' || event.key === 'Spacebar') && target && target.nodeName === 'A' &&
      target.getAttribute('role') === 'button') {
      event.preventDefault();
      target.click();
    }
  });

  /* ---------- 5. Footer year ---------- */

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
