/**
 * Coffee Animation & Donate Modal — Standalone
 * Drop this file + coffee-donate.css into any static HTML project.
 * Images are loaded from the les-library-pwa GitHub Pages deployment.
 */
(function () {
  'use strict';

  // ── Asset URLs (hosted on the library PWA's GitHub Pages) ──
  var CDN = 'https://zdypop.github.io/les-library-pwa/';
  var COFFEE_FRAMES = [CDN + 'coffee0x.png', CDN + 'coffee1x.png'];
  var ZELLE_IMG = CDN + 'zelle_zdy.png';
  var VENMO_IMG = CDN + 'Venmo_zdy.png';

  var frameIndex = 0;

  // ── Preload images ──
  COFFEE_FRAMES.concat([ZELLE_IMG, VENMO_IMG]).forEach(function (src) {
    var img = new Image();
    img.src = src;
  });

  function init() {
    // Overlay
    var overlay = document.createElement('div');
    overlay.className = 'coffee-overlay';
    document.body.appendChild(overlay);

    // Coffee button
    var btn = document.createElement('div');
    btn.className = 'coffee-btn';
    btn.style.backgroundImage = "url('" + COFFEE_FRAMES[0] + "')";
    btn.title = 'Buy me a coffee ☕';
    document.body.appendChild(btn);

    // Steam frame swap
    setInterval(function () {
      frameIndex = 1 - frameIndex;
      btn.style.backgroundImage = "url('" + COFFEE_FRAMES[frameIndex] + "')";
    }, 600);

    // Donate modal
    var modal = document.createElement('div');
    modal.className = 'donate-modal-overlay';
    modal.innerHTML =
      '<div class="donate-modal-content">' +
        '<button class="donate-modal-close">&times;</button>' +
        '<div class="donate-modal-header">' +
          '<span class="donate-emoji">☕</span>' +
          '<h3>Buy Me a Coffee</h3>' +
          '<p>如果您觉得这个 App 对您有帮助，<br>欢迎请我喝杯咖啡支持后续开发维护！</p>' +
        '</div>' +
        '<div class="donate-qr-list">' +
          '<div class="donate-qr-card">' +
            '<img src="' + ZELLE_IMG + '" alt="Zelle QR Code">' +
            '<span class="donate-qr-title zelle">Zelle</span>' +
            '<span class="donate-qr-sub">Scan to pay with Zelle</span>' +
          '</div>' +
          '<div class="donate-qr-card">' +
            '<img src="' + VENMO_IMG + '" alt="Venmo QR Code">' +
            '<span class="donate-qr-title venmo">Venmo</span>' +
            '<span class="donate-qr-sub">Scan to pay with Venmo</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    // Shrink: center → top-left after splash
    setTimeout(function () {
      overlay.classList.add('fade-out');
      btn.classList.add('shrunk');
      setTimeout(function () { overlay.remove(); }, 800);
    }, 1800);

    // Open modal
    btn.addEventListener('click', function () {
      modal.classList.add('show');
    });

    // Close modal
    var closeBtn = modal.querySelector('.donate-modal-close');
    closeBtn.addEventListener('click', function () {
      modal.classList.remove('show');
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('show');
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
