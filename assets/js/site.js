/*
 * Small progressive enhancements for the homepage. The page is fully readable without this file.
 *  1. Light/dark theme toggle (Pico CSS reads `data-theme` on <html>). With no saved choice the
 *     page follows the system setting; the inline script in <head> applies a saved choice early.
 *  2. Email links: the address is stored reversed in `data-email` so simple scrapers don't pick it up.
 *  3. Footer year.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

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

  var emailLinks = document.querySelectorAll('a[data-email]');
  for (var i = 0; i < emailLinks.length; i++) {
    var address = emailLinks[i].getAttribute('data-email').split('').reverse().join('');
    emailLinks[i].setAttribute('href', 'mailto:' + address);
  }

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
