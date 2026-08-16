(() => {
  const KIND_ALIASES = {
    '유산': '유산',
    '흔적': '흔적',
    '지식': '지식',
    'Наследие': '유산',
    'След': '흔적',
    'Знания': '지식'
  };

  function normalizeKey(value) {
    if (typeof value !== 'string') return null;
    const key = value.trim();
    const separator = key.indexOf('-');
    if (separator < 1 || separator === key.length - 1) return null;
    const kind = KIND_ALIASES[key.slice(0, separator)];
    return kind ? `${kind}-${key.slice(separator + 1)}` : null;
  }

  function parse(text, validKeys) {
    const parsed = JSON.parse(String(text).replace(/^\uFEFF/, ''));
    const source = Array.isArray(parsed) ? parsed : parsed && parsed.done;
    if (!Array.isArray(source)) throw new Error('Неверный формат прогресса');
    if (source.length > 1000) throw new Error('Слишком много записей прогресса');

    const valid = validKeys ? new Set(validKeys) : null;
    const done = [];
    const seen = new Set();
    for (const value of source) {
      const key = normalizeKey(value);
      if (!key || (valid && !valid.has(key)) || seen.has(key)) continue;
      seen.add(key);
      done.push(key);
    }
    return { done, skipped: source.length - done.length };
  }

  window.TACHYON_PROGRESS = { parse };
})();
