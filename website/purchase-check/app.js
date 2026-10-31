(function () {
  'use strict';

  var FUNCTIONS_BASE = 'https://gluaodfegfodpecwayyb.supabase.co/functions/v1';

  var VERDICT_CLASS = {
    below_market: 'verdict-below',
    at_market: 'verdict-at',
    above_market: 'verdict-above',
  };

  var VERDICT_LABEL = {
    below_market: 'BELOW MARKET VALUE',
    at_market: 'AT MARKET VALUE',
    above_market: 'ABOVE MARKET VALUE',
  };

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

  function formatCurrency(value) {
    return '$' + Math.round(value).toLocaleString();
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

  function isValidVin(vin) {
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.toUpperCase());
  }

  function checkPrice() {
    setError('');

    var vin = document.getElementById('f-vin').value.trim().toUpperCase();
    var mileage = parseFloat(document.getElementById('f-mileage').value);
    var zip = document.getElementById('f-zip').value.trim();
    var askingPrice = parseFloat(document.getElementById('f-price').value);
    var turnstileToken = getTurnstileToken();

    if (!isValidVin(vin)) {
      setError("That doesn't look like a valid VIN -- check for typos (VINs never contain I, O, or Q).");
      return;
    }
    if (!isFinite(mileage) || mileage <= 0) {
      setError('Enter the mileage.');
      return;
    }
    if (!/^\d{5}$/.test(zip)) {
      setError('Enter a 5-digit ZIP code.');
      return;
    }
    if (!isFinite(askingPrice) || askingPrice <= 0) {
      setError('Enter the asking price.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the verification check above.');
      return;
    }

    var submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'CHECKING…';

    fetch(FUNCTIONS_BASE + '/check-web-purchase-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vin: vin,
        mileage: mileage,
        zip: zip,
        askingPrice: askingPrice,
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
        submitBtn.textContent = 'CHECK PRICE';
        resetTurnstile();

        if (!result.ok) {
          setError(result.data.error || 'Could not check this price right now.');
          return;
        }

        var data = result.data;
        document.getElementById('result-vehicle').textContent = data.year + ' ' + data.make + ' ' + data.model + (data.trim ? ' ' + data.trim : '');
        document.getElementById('result-mileage').textContent = Math.round(mileage).toLocaleString() + ' miles · Asking ' + formatCurrency(askingPrice);
        document.getElementById('result-verdict-label').textContent = VERDICT_LABEL[data.verdict];
        document.getElementById('result-verdict-label').className = 'verdict-label ' + VERDICT_CLASS[data.verdict];
        document.getElementById('result-range').textContent =
          'Market value: ' + formatCurrency(data.marketValue) +
          ' (typical range ' + formatCurrency(data.valueLow) + ' – ' + formatCurrency(data.valueHigh) + ')';

        var diff = askingPrice - data.marketValue;
        var pct = data.marketValue !== 0 ? Math.abs((diff / data.marketValue) * 100) : 0;
        var explanation = 'About ' + formatCurrency(Math.abs(diff)) + ' (' + pct.toFixed(1) + '%) ' +
          (diff < 0 ? 'below' : 'above') + ' the predicted market value.';
        document.getElementById('result-explanation').textContent = explanation;

        show('result');
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'CHECK PRICE';
        resetTurnstile();
        setError('Could not reach the server. Please check your connection and try again.');
      });
  }

  function reset() {
    document.getElementById('f-vin').value = '';
    document.getElementById('f-mileage').value = '';
    document.getElementById('f-zip').value = '';
    document.getElementById('f-price').value = '';
    setError('');
    show('form');
  }

  window.FORRA = {
    checkPrice: checkPrice,
    reset: reset,
  };
})();
