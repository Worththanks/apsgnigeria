(function (root) {
  'use strict';

  // @spec REG-FORM-010, REG-FORM-013, REG-MATCH-020, REG-MATCH-021, PORTAL-LOGIN-007, PORTAL-RECOVERY-001, PORTAL-RECOVERY-003

  const metadataUrl = '/assets/data/countries.json';
  let metadataPromise;

  async function load() {
    if (!metadataPromise) {
      metadataPromise = fetch(metadataUrl, { credentials: 'same-origin' }).then(async response => {
        if (!response.ok) throw new Error('Local country and phone-code metadata could not be loaded.');
        const source = await response.json();
        if (!source || !Array.isArray(source.countries)) throw new Error('Local country and phone-code metadata is invalid.');
        const countries = source.countries
          .filter(country => /^[A-Z]{2}$/.test(country.alpha2) && /^[A-Z]{3}$/.test(country.alpha3))
          .map(country => ({
            alpha2: country.alpha2,
            alpha3: country.alpha3,
            name: String(country.name || country.alpha3),
            callingCode: String(country.callingCode || '').replace(/\D/g, '')
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        return Object.freeze({ version: String(source.version || 'unknown'), countries: Object.freeze(countries) });
      });
    }
    return metadataPromise;
  }

  async function populate(select, { blankLabel = null, defaultAlpha2 = '', callingOnly = false } = {}) {
    const data = await load();
    if (!select) return data;
    select.replaceChildren();
    if (blankLabel !== null) select.add(new Option(blankLabel, ''));
    const countries = callingOnly ? data.countries.filter(country => country.callingCode) : data.countries;
    countries.forEach(country => {
      const label = callingOnly
        ? `+${country.callingCode} · ${country.alpha2} — ${country.name}`
        : `${country.name} (${country.alpha3})`;
      const option = new Option(label, country.alpha2);
      if (country.alpha2 === defaultAlpha2) {
        option.defaultSelected = true;
        option.selected = true;
      }
      select.add(option);
    });
    if (defaultAlpha2 && countries.some(country => country.alpha2 === defaultAlpha2)) select.value = defaultAlpha2;
    return data;
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function toE164(value, alpha2, data) {
    const raw = String(value || '').trim();
    if (!raw) throw new Error('Enter a phone number.');
    const directory = data?.countries || [];
    const selected = directory.find(country => country.alpha2 === alpha2);
    if (!selected?.callingCode) throw new Error('Choose a phone country with a calling code.');
    if (!/^[+]?\d[\d\s().\/-]*$/.test(raw)) {
      throw new Error('Enter a phone number using digits and standard separators only.');
    }

    const international = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
    const parser = root.libphonenumber?.parsePhoneNumberFromString;
    if (typeof parser !== 'function') {
      throw new Error('Offline phone-validation data is unavailable. Refresh the page and try again.');
    }

    let parsed;
    try {
      parsed = parser(international, { defaultCountry: selected.alpha2, extract: false });
    } catch (_error) {
      parsed = undefined;
    }
    if (!parsed || !parsed.isValid()) {
      throw new Error(`Enter a valid ${selected.name} phone number.`);
    }
    if (parsed.countryCallingCode !== selected.callingCode) {
      throw new Error(`Select the matching country calling code (+${selected.callingCode}) or enter a number using that code.`);
    }
    if (!/^\+[1-9]\d{6,14}$/.test(parsed.number)) {
      throw new Error('Enter a valid international phone number with 7 to 15 digits.');
    }
    return parsed.number;
  }

  function countryName(code, data) {
    const normalized = String(code || '').trim().toUpperCase();
    return data?.countries?.find(country => country.alpha3 === normalized)?.name || normalized || 'Not recorded';
  }

  root.APSGPhoneUtils = Object.freeze({ load, populate, toE164, countryName, digitsOnly });
})(window);
