// src/utils/templateEvaluator.js

/**
 * Обробляє шаблон значення (val_tpl) з Home Assistant.
 * @param {string | undefined} template - Рядок шаблону, напр. "{{ value_json.temperature }}"
 * @param {string | number | undefined} rawValue - Сире значення, отримане з MQTT.
 * @returns {string} - Оброблений і відформатований рядок для відображення.
 */
export const evaluateValueTemplate = (template, rawValue) => {
  // Якщо значення немає, повертаємо плейсхолдер
  if (rawValue === null || rawValue === undefined) {
    return '---';
  }

  // Якщо шаблону немає, повертаємо сире значення як є
  if (!template) {
    return String(rawValue);
  }

  try {
    let value_json = null;
    try {
      // Намагаємося розпарсити rawValue як JSON.
      // Це робить `value_json` доступним у шаблоні.
      value_json = JSON.parse(rawValue);
    } catch (e) {
      // Це нормально, якщо rawValue не є JSON. value_json залишиться null.
    }

    // 1. Отримуємо вираз зсередини {{ ... }}
    let expression = template.slice(2, -2).trim();

    // 2. Обробляємо фільтри форматування (спрощена версія)
    let precision = null;
    if (expression.includes('|round(')) {
        const match = expression.match(/\|round\((.*?)\)/);
        if (match) {
            expression = expression.replace(match[0], '').trim();
            precision = parseInt(match[1], 10);
        }
    }

    // 3. Створюємо функцію для безпечного виконання виразу
    // Вона приймає 'value' (сире значення) та 'value_json' (розпарсений об'єкт)
    const func = new Function('value', 'value_json', `
      const float = (v) => parseFloat(v);
      const int = (v) => parseInt(v, 10);
      try {
        return ${expression};
      } catch (e) {
        return null; // Повертаємо null при помилці всередині шаблону
      }
    `);

    // 4. Виконуємо функцію з нашими даними
    const calculatedValue = func(rawValue, value_json);

    // Якщо вираз не вдалося обчислити, повертаємо сире значення
    if (calculatedValue === null || calculatedValue === undefined) {
      return String(rawValue);
    }

    // 5. Застосовуємо заокруглення, якщо воно було вказане
    if (precision !== null && typeof calculatedValue === 'number') {
      return calculatedValue.toFixed(precision);
    }

    // Повертаємо результат у вигляді рядка
    return String(calculatedValue);

  } catch (error) {
    console.error(`Помилка обробки шаблону: "${template}" зі значенням: "${rawValue}"`, error);
    // У разі будь-якої іншої помилки повертаємо сире значення
    return String(rawValue);
  }
};