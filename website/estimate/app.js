(function () {
  'use strict';

  var FUNCTIONS_BASE = 'https://gluaodfegfodpecwayyb.supabase.co/functions/v1';
  var STORAGE_KEY = 'forra_pending_result';

  var STEP_ORDER = ['vehicle', 'repair', 'replacement', 'costs', 'financing'];

  var chipState = { condition: null, reliability: null, 'finance-method': null };

  // Stripe returns the session ID in the URL fragment (#), not a query
  // string, so a host's WAF never sees it (see create-web-checkout for why).
  function getHashParams() {
    return new URLSearchParams(window.location.hash.replace(/^#/, ''));
  }

  function show(stepId) {
    document.querySelectorAll('.step').forEach(function (el) {
      el.classList.remove('active');
    });
    document.getElementById('step-' + stepId).classList.add('active');
    window.scrollTo(0, 0);
  }

  function setError(stepId, message) {
    var el = document.getElementById('err-' + stepId);
    if (el) el.textContent = message || '';
  }

  function num(id) {
    var value = parseFloat(document.getElementById(id).value);
    return isFinite(value) ? value : 0;
  }

  function str(id) {
    return document.getElementById(id).value.trim();
  }

  // ---- chip selection ----
  document.querySelectorAll('.chip-row').forEach(function (row) {
    var group = row.getAttribute('data-group');
    row.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        row.querySelectorAll('.chip').forEach(function (c) {
          c.classList.remove('selected');
        });
        chip.classList.add('selected');
        chipState[group] = chip.getAttribute('data-value');
        if (group === 'finance-method') {
          document.getElementById('finance-fields').style.display =
            chipState['finance-method'] === 'finance' ? 'block' : 'none';
        }
      });
    });
  });

  // Pre-fill typical replacement-cost defaults once a replacement price is known.
  function prefillCostsDefaults() {
    var price = num('f-replacement-price');
    var taxField = document.getElementById('f-sales-tax');
    var titleField = document.getElementById('f-title');
    var docField = document.getElementById('f-doc-fee');
    if (!taxField.value) taxField.value = Math.round(price * 0.065);
    if (!titleField.value) titleField.value = 100;
    if (!docField.value) docField.value = 400;
  }

  function validateStep(stepId) {
    setError(stepId, '');
    if (stepId === 'vehicle') {
      if (!num('f-year') || !num('f-mileage')) {
        setError(stepId, 'Enter the model year and current mileage.');
        return false;
      }
      if (!chipState.condition || !chipState.reliability) {
        setError(stepId, 'Choose a condition and reliability history.');
        return false;
      }
    }
    if (stepId === 'repair') {
      if (!num('f-repair-cost') || !str('f-repair-desc')) {
        setError(stepId, 'Enter the repair estimate and a short description.');
        return false;
      }
    }
    if (stepId === 'replacement') {
      if (!num('f-replacement-price')) {
        setError(stepId, 'Enter the expected replacement price.');
        return false;
      }
      prefillCostsDefaults();
    }
    if (stepId === 'financing') {
      if (!chipState['finance-method']) {
        setError(stepId, 'Choose cash or finance.');
        return false;
      }
    }
    return true;
  }

  function next(fromStepId) {
    if (!validateStep(fromStepId)) return;
    var index = STEP_ORDER.indexOf(fromStepId);
    show(STEP_ORDER[index + 1]);
  }

  function back(toStepId) {
    show(toStepId);
  }

  function buildCalcInput() {
    var ageYears = Math.max(0, new Date().getFullYear() - num('f-year'));
    var loanPayoff = num('f-loan-payoff');
    return {
      keep: {
        currentRepairCost: num('f-repair-cost'),
        recentRepairsSum: num('f-recent-repairs'),
        ageYears: ageYears,
        mileage: num('f-mileage'),
        condition: chipState.condition,
        reliabilityBucket: chipState.reliability,
        currentVehicleValue: num('f-value'),
        currentLoanPayoff: loanPayoff,
      },
      replace: {
        replacementPrice: num('f-replacement-price'),
        salesTax: num('f-sales-tax'),
        title: num('f-title'),
        registration: 0,
        docFee: num('f-doc-fee'),
        delivery: num('f-delivery'),
        otherFees: num('f-other-fees'),
        tradeOrSaleValue: num('f-trade-value'),
        loanPayoff: loanPayoff,
        downPayment: chipState['finance-method'] === 'finance' ? num('f-down-payment') : 0,
        interestRate: chipState['finance-method'] === 'finance' ? num('f-interest-rate') : 0,
        loanTermMonths: chipState['finance-method'] === 'finance' ? num('f-loan-term') || 60 : 60,
        financeMethod: chipState['finance-method'],
      },
    };
  }

  function vehicleLabel() {
    var year = document.getElementById('f-year').value;
    var make = str('f-make');
    var model = str('f-model');
    return [year, make, model].filter(Boolean).join(' ') || 'Your vehicle';
  }

  function computeAndShowPaywall() {
    if (!validateStep('financing')) return;

    var input = buildCalcInput();
    var output = FixOrReplaceCalc.computeDecision(input);
    var explanation = FixOrReplaceCalc.explainResult(input, output);

    var pending = {
      input: input,
      output: output,
      explanation: explanation,
      vehicleLabel: vehicleLabel(),
      repairDescription: str('f-repair-desc'),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));

    show('paywall');
  }

  function checkout(tier) {
    setError('paywall', '');
    fetch(FUNCTIONS_BASE + '/create-web-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: tier }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError('paywall', "Couldn't start checkout right now. Try again shortly.");
        }
      })
      .catch(function () {
        setError('paywall', "Couldn't start checkout right now. Try again shortly.");
      });
  }

  function renderResult(tier, pending) {
    var display = FixOrReplaceCalc.RECOMMENDATION_DISPLAY[pending.output.recommendation];
    document.getElementById('result-vehicle-label').textContent = pending.vehicleLabel;
    document.getElementById('result-dot').style.background = display.color;
    document.getElementById('result-verdict').innerHTML =
      '<strong>' + display.emoji + ' ' + display.label + '</strong>';
    document.getElementById('result-explanation').textContent = pending.explanation;
    document.getElementById('result-fix-cost').textContent = FixOrReplaceCalc.formatCurrency(
      pending.input.keep.currentRepairCost,
    );
    document.getElementById('result-replace-cost').textContent = FixOrReplaceCalc.formatCurrency(
      pending.output.totalAcquisitionCostIncludingFinancing,
    );

    if (tier === 'full') {
      document.getElementById('full-report-block').style.display = 'block';
    }

    show('result');
  }

  function sendReport() {
    var email = str('f-report-email');
    var statusEl = document.getElementById('report-status');
    var errorEl = document.getElementById('report-error');
    statusEl.style.display = 'none';
    errorEl.textContent = '';

    if (!email || email.indexOf('@') === -1) {
      errorEl.textContent = 'Enter a valid email address.';
      return;
    }

    var pending = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    var sessionId = getHashParams().get('session_id');
    if (!pending || !sessionId) {
      errorEl.textContent = 'Your session expired -- please start over.';
      return;
    }

    fetch(FUNCTIONS_BASE + '/send-web-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        email: email,
        vehicleLabel: pending.vehicleLabel,
        repairDescription: pending.repairDescription,
        input: pending.input,
        output: pending.output,
        explanation: pending.explanation,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          statusEl.textContent = 'Sent to ' + result.data.sentTo + '.';
          statusEl.style.display = 'block';
        } else {
          errorEl.textContent = result.data.error || 'Could not email this report right now.';
        }
      })
      .catch(function () {
        errorEl.textContent = 'Could not email this report right now.';
      });
  }

  function handleReturnFromStripe() {
    var params = getHashParams();
    var sessionId = params.get('session_id');
    var canceled = params.get('canceled');

    if (canceled) {
      document.getElementById('canceled-notice').style.display = 'block';
      show('vehicle');
      return;
    }

    if (!sessionId) {
      show('vehicle');
      return;
    }

    var pending = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!pending) {
      // Payment succeeded but this browser lost the in-progress form (e.g.
      // a different device, or storage was cleared) -- nothing to show.
      show('vehicle');
      return;
    }

    show('verifying');
    fetch(FUNCTIONS_BASE + '/verify-web-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.verified) {
          renderResult(result.data.tier, pending);
        } else {
          show('vehicle');
        }
      })
      .catch(function () {
        show('vehicle');
      });
  }

  function exitSite() {
    window.close();
    // window.close() is silently ignored by the browser for any tab that
    // wasn't opened via window.open() from a script -- which this one
    // wasn't, since the visitor navigated here normally. There's no way to
    // detect that refusal, so fall back to a plain sign-off after a beat
    // instead of a button that otherwise looks like it did nothing.
    setTimeout(function () {
      document.body.innerHTML =
        '<div style="max-width:480px;margin:100px auto;text-align:center;padding:0 24px;">' +
        '<p style="font-size:16px;">You can close this tab now. Thanks for using Fix or Replace Auto.</p>' +
        '</div>';
    }, 300);
  }

  window.FORRA = {
    next: next,
    back: back,
    computeAndShowPaywall: computeAndShowPaywall,
    checkout: checkout,
    sendReport: sendReport,
    exitSite: exitSite,
  };

  handleReturnFromStripe();
})();
