/* Wedding estimate settings. ALL amounts and multipliers below are illustrative
 * PLACEHOLDERS, not Dites Moi Oui prices. Replace and approve before launch.
 * Formula: destination base range × guest multiplier × celebration multiplier.
 * Investment preferences are collected separately and do not change that formula. */
(function (root) {
  const config = {
    destinations: [
      {
        "id": "provence",
        "labelKey": "quiz.destinations.provence.label",
        "noteKey": "quiz.destinations.provence.note",
        "resultKey": "quiz.destinations.provence.result"
      },
      {
        "id": "riviera",
        "labelKey": "quiz.destinations.riviera.label",
        "noteKey": "quiz.destinations.riviera.note",
        "resultKey": "quiz.destinations.riviera.result"
      },
      {
        "id": "corsica",
        "labelKey": "quiz.destinations.corsica.label",
        "noteKey": "quiz.destinations.corsica.note",
        "resultKey": "quiz.destinations.corsica.result"
      },
      {
        "id": "marrakech",
        "labelKey": "quiz.destinations.marrakech.label",
        "noteKey": "quiz.destinations.marrakech.note",
        "resultKey": "quiz.destinations.marrakech.result"
      },
      {
        "id": "apulia",
        "labelKey": "quiz.destinations.apulia.label",
        "noteKey": "quiz.destinations.apulia.note",
        "resultKey": "quiz.destinations.apulia.result"
      },
      {
        "id": "unsure",
        "labelKey": "quiz.destinations.unsure.label",
        "noteKey": "quiz.destinations.unsure.note",
        "resultKey": "quiz.destinations.unsure.result"
      }
    ],
    seasons: ['spring', 'summer', 'autumn', 'flexible'],
    guests: [
      {
        "id": "under50",
        "labelKey": "quiz.guests.under50"
      },
      {
        "id": "50_100",
        "labelKey": "quiz.guests.50_100"
      },
      {
        "id": "100_150",
        "labelKey": "quiz.guests.100_150"
      },
      {
        "id": "150_plus",
        "labelKey": "quiz.guests.150_plus"
      }
    ],
    styles: [
      {
        "id": "intimate",
        "labelKey": "quiz.styles.intimate.label",
        "noteKey": "quiz.styles.intimate.note"
      },
      {
        "id": "weekend",
        "labelKey": "quiz.styles.weekend.label",
        "noteKey": "quiz.styles.weekend.note"
      },
      {
        "id": "grand",
        "labelKey": "quiz.styles.grand.label",
        "noteKey": "quiz.styles.grand.note"
      }
    ],
    investmentRanges: [
      {
        "id": "range_1",
        "labelKey": "quiz.investment.range_1"
      },
      {
        "id": "range_2",
        "labelKey": "quiz.investment.range_2"
      },
      {
        "id": "range_3",
        "labelKey": "quiz.investment.range_3"
      },
      {
        "id": "guidance",
        "labelKey": "quiz.investment.guidance"
      }
    ],
    pricing: {
      placeholder: true, currency: 'EUR', locale: 'en-GB', roundTo: 1000,
      basePrices: {
        provence: { min: 35000, max: 55000 }, riviera: { min: 45000, max: 70000 },
        corsica: { min: 38000, max: 60000 }, marrakech: { min: 30000, max: 50000 },
        apulia: { min: 32000, max: 52000 }, unsure: { min: 35000, max: 60000 }
      },
      guestMultipliers: { under50: 0.75, '50_100': 1, '100_150': 1.35, '150_plus': 1.7 },
      styleMultipliers: { intimate: 1, weekend: 1.5, grand: 1.9 }
    },
    submission: {
      // Empty = console-only preview. To enable delivery, set your public form URL,
      // e.g. 'https://formspree.io/f/YOUR_FORM_ID'. Never put API secrets here.
      endpoint: '',
      timeoutMs: 15000,
      debug: true // Requested console logging. Turn OFF before collecting real enquiries.
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  else root.DMO_ESTIMATE_CONFIG = config;
})(typeof window !== 'undefined' ? window : globalThis);
