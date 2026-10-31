(function () {
  'use strict';

  var FUNCTIONS_BASE = 'https://gluaodfegfodpecwayyb.supabase.co/functions/v1';

  var VERDICT_CLASS = {
    below_typical: 'verdict-below',
    within_typical: 'verdict-within',
    above_typical: 'verdict-above',
  };

  var VERDICT_LABEL = {
    below_typical: 'BELOW TYPICAL RANGE',
    within_typical: 'WITHIN TYPICAL RANGE',
    above_typical: 'ABOVE TYPICAL RANGE',
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

  function checkPrice() {
    setError('');

    var vehicle = document.getElementById('f-vehicle').value.trim();
    var repair = document.getElementById('f-repair').value.trim();
    var price = parseFloat(document.getElementById('f-price').value);
    var turnstileToken = getTurnstileToken();

    if (!vehicle) {
      setError('Enter the vehicle.');
      return;
    }
    if (!repair) {
      setError("Describe what's being repaired.");
      return;
    }
    if (!isFinite(price) || price <= 0) {
      setError('Enter the price you were quoted.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the verification check above.');
      return;
    }

    var submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'CHECKING…';

    fetch(FUNCTIONS_BASE + '/check-web-repair-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleDescription: vehicle,
        repairDescription: repair,
        quotedPrice: price,
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

        document.getElementById('result-vehicle').textContent = vehicle;
        document.getElementById('result-repair').textContent = repair;
        document.getElementById('result-verdict-label').textContent = VERDICT_LABEL[result.data.verdict];
        document.getElementById('result-verdict-label').className =
          'verdict-label ' + VERDICT_CLASS[result.data.verdict];
        document.getElementById('result-range').textContent =
          'Typical range: ' +
          formatCurrency(result.data.typicalLowCost) +
          ' – ' +
          formatCurrency(result.data.typicalHighCost) +
          ' · You were quoted ' +
          formatCurrency(price);
        document.getElementById('result-explanation').textContent = result.data.explanation;

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
    document.getElementById('f-vehicle').value = '';
    document.getElementById('f-repair').value = '';
    document.getElementById('f-price').value = '';
    setError('');
    show('form');
  }

  window.FORRA = {
    checkPrice: checkPrice,
    reset: reset,
  };
})();
