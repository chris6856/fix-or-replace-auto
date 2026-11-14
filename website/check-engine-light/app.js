(function () {
  'use strict';

  var FUNCTIONS_BASE = 'https://gluaodfegfodpecwayyb.supabase.co/functions/v1';

  var AFFILIATE_SCANNERS = [
    {
      tier: 'Budget-friendly',
      name: 'ANCEL BD200 OBD2 Scanner',
      price: '$45.00',
      description:
        'Bluetooth code reader & check engine diagnostic scan tool with car battery test, exclusive app on iOS & Android. Wireless OBDII adapter works for 1996 & newer vehicles.',
      affiliateUrl: 'https://link.amazon/B09kfO0Mo',
      image: 'images/scanner1.jpg',
    },
    {
      tier: 'Everyday driver',
      name: 'AUTOPHIX 3210 OBD2 Scanner for DIYers',
      price: '$49.99',
      description:
        'Fix check engine light, pass a smog test at home, performance test, check battery, and view live data -- no subscription. Works with 1996+ cars, for iPhone & Android.',
      affiliateUrl: 'https://link.amazon/B06BZAxyl',
      image: 'images/scanner2.jpg',
    },
    {
      tier: 'More capable handheld',
      name: 'Innova 5210 OBD2 Scanner & Engine Code Reader',
      price: '$79.95',
      description:
        'Battery tester, live data, and oil reset on a dedicated diagnostic tool for most vehicles. Bluetooth-compatible with a leading car repair app.',
      affiliateUrl: 'https://link.amazon/A0b1ZdE4d',
      image: 'images/scanner3.jpg',
    },
  ];

  var LIKELIHOOD_LABEL = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
  var LIKELIHOOD_COLOR = { high: '#B8860B', medium: '#6B7B83', low: '#6B7B83' };
  var DIFFICULTY_LABEL = {
    easy: 'Easy DIY',
    moderate: 'Moderate DIY',
    difficult: 'Difficult DIY',
    professional_only: 'Professional only',
  };

  var flashingValue = 'not_sure';

  function show(stepId) {
    document.querySelectorAll('.step').forEach(function (el) {
      el.classList.remove('active');
    });
    document.getElementById('step-' + stepId).classList.add('active');
    window.scrollTo(0, 0);
  }

  function setError(message) {
    document.getElementById('err-form').textContent = message || '';
  }

  function getTurnstileToken() {
    var field = document.querySelector('[name="cf-turnstile-response"]');
    return field ? field.value : '';
  }

  function resetTurnstile() {
    if (window.turnstile) {
      try {
        window.turnstile.reset();
      } catch (e) {
        // widget may not be ready yet -- ignore
      }
    }
  }

  function renderScannerCards() {
    var container = document.getElementById('scanner-cards');
    container.innerHTML = AFFILIATE_SCANNERS.map(function (scanner) {
      var buttonHtml = scanner.affiliateUrl
        ? '<a class="scanner-btn" href="' + scanner.affiliateUrl + '" target="_blank" rel="noopener noreferrer sponsored">VIEW ON AMAZON</a>'
        : '<button class="scanner-btn disabled" disabled>LINK COMING SOON</button>';
      return (
        '<div class="scanner-card">' +
        '<img class="scanner-image" src="' + scanner.image + '" alt="' + scanner.name + '" loading="lazy" />' +
        '<div class="scanner-tier">' + scanner.tier + '</div>' +
        '<div class="scanner-name">' + scanner.name + '</div>' +
        '<div class="scanner-price">' + scanner.price + '</div>' +
        '<div class="scanner-desc">' + scanner.description + '</div>' +
        buttonHtml +
        '</div>'
      );
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderScannerCards();

    var toggleRow = document.getElementById('flashing-toggle');
    toggleRow.querySelectorAll('.toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleRow.querySelectorAll('.toggle-btn').forEach(function (b) {
          b.classList.remove('selected');
        });
        btn.classList.add('selected');
        flashingValue = btn.getAttribute('data-value');
      });
    });
  });

  function renderCauseCards(causes) {
    var container = document.getElementById('cause-cards');
    container.innerHTML = causes.map(function (issue) {
      var safetyHtml = issue.isSafetyIssue ? '<div class="cause-safety">⚠️ Safety-related</div>' : '';
      return (
        '<div class="cause-card">' +
        '<div class="cause-header">' +
        '<div class="cause-name">' + issue.cause + '</div>' +
        '<div class="cause-likelihood" style="color:' + LIKELIHOOD_COLOR[issue.likelihood] + '">' +
        LIKELIHOOD_LABEL[issue.likelihood] +
        '</div>' +
        '</div>' +
        '<div class="cause-difficulty">' + DIFFICULTY_LABEL[issue.diyDifficulty] + '</div>' +
        safetyHtml +
        '<div class="cause-explanation">' + issue.explanation + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function checkCodes() {
    setError('');

    var vehicle = document.getElementById('f-vehicle').value.trim();
    var codesRaw = document.getElementById('f-codes').value.trim();
    var notes = document.getElementById('f-notes').value.trim();
    var turnstileToken = getTurnstileToken();

    if (!vehicle) {
      setError('Enter the vehicle.');
      return;
    }
    if (!codesRaw) {
      setError('Enter at least one diagnostic trouble code.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the verification check above.');
      return;
    }

    var codes = codesRaw
      .split(',')
      .map(function (c) { return c.trim().toUpperCase(); })
      .filter(Boolean);
    var isFlashing = flashingValue === 'flashing';

    var submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'CHECKING…';

    fetch(FUNCTIONS_BASE + '/check-web-engine-light', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleDescription: vehicle,
        dtcCodes: codes,
        isFlashing: isFlashing,
        symptomNotes: notes || undefined,
        turnstileToken: turnstileToken,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'CHECK CODES';
        resetTurnstile();

        if (!result.ok) {
          setError(result.data.error || 'Could not check these codes right now.');
          return;
        }

        document.getElementById('result-vehicle').textContent = vehicle;
        document.getElementById('result-codes').textContent = 'Codes: ' + codes.join(', ');

        document.getElementById('flashing-banner').style.display = isFlashing ? 'block' : 'none';

        var safetyBanner = document.getElementById('safety-banner');
        if (result.data.urgentSafetyNote) {
          safetyBanner.textContent = '⚠️ ' + result.data.urgentSafetyNote;
          safetyBanner.style.display = 'block';
        } else {
          safetyBanner.style.display = 'none';
        }

        renderCauseCards(result.data.possibleCauses || []);

        var topCause = (result.data.possibleCauses || [])[0];
        var ytQuery = [vehicle, codes.join(' '), topCause ? topCause.cause : ''].filter(Boolean).join(' ');
        document.getElementById('youtube-link').href =
          'https://www.youtube.com/results?search_query=' + encodeURIComponent(ytQuery);
        document.getElementById('shop-link').href =
          'https://www.google.com/maps/search/' + encodeURIComponent('auto repair shop near me');

        show('result');
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'CHECK CODES';
        resetTurnstile();
        setError('Could not reach the server. Please check your connection and try again.');
      });
  }

  function reset() {
    document.getElementById('f-vehicle').value = '';
    document.getElementById('f-codes').value = '';
    document.getElementById('f-notes').value = '';
    setError('');
    show('choice');
  }

  window.FORRA = {
    show: show,
    checkCodes: checkCodes,
    reset: reset,
  };
})();
