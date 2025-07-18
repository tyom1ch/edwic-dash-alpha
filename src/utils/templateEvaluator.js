// src/utils/templateEvaluator.js

/**
 * Обробляє шаблон значення (val_tpl) з Home Assistant.
 * @param {string | undefined} template - Рядок шаблону, напр. "{{ value_json.temperature }}"
 * @param {string | number | undefined} rawValue - Сире значення, отримане з MQTT.
 * @returns {string} - Оброблений і відформатований рядок для відображення.
 */
export const evaluateValueTemplate = (template, rawValue) => {
  // Якщо значення немає, повертаємо плейсхолдер
  if (rawValue === null || rawValue === undefined || rawValue === '') {
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
    const expression = template.slice(2, -2).trim();

    // 2. Визначаємо вираз для обчислення значення та параметри форматування
    let valueExpression = expression;
    let precision = null;
    let formatSpecifier = null;

    // Спочатку шукаємо спеціальний фільтр 'format', оскільки він має унікальну структуру.
    // Наприклад: '%.1f'|format(value)
    const formatMatch = expression.match(/('.*?'|".*?")\s*\|\s*format\((.*)\)/);

    if (formatMatch) {
      // Витягуємо специфікатор формату (напр. '%.1f' -> %.1f)
      formatSpecifier = formatMatch[1].slice(1, -1);
      // Виразом для обчислення стає те, що всередині дужок format()
      valueExpression = formatMatch[2];
    } else if (expression.includes('|')) {
      // Якщо це не format, обробляємо інші фільтри, розділені '|'
      const parts = expression.split('|');
      valueExpression = parts[0].trim();
      const filterPart = parts[1].trim();

      // Шукаємо фільтр round(n)
      const roundMatch = filterPart.match(/round\((.*?)\)/);
      if (roundMatch) {
        precision = parseInt(roundMatch[1], 10);
      }
      // Тут можна додати обробку інших простих фільтрів
    }

    // 3. Створюємо функцію для безпечного виконання виразу
    // Вона приймає 'value' (сире значення) та 'value_json' (розпарсений об'єкт)
    const func = new Function('value', 'value_json', `
      const float = (v) => parseFloat(v);
      const int = (v) => parseInt(v, 10);
      try {
        // Обчислюємо вираз, який ми визначили раніше
        return ${valueExpression};
      } catch (e) {
        return null; // Повертаємо null при помилці всередині шаблону
      }
    `);

    // 4. Виконуємо функцію з нашими даними
    const calculatedValue = func(rawValue, value_json);

    // Якщо вираз не вдалося обчислити, повертаємо плейсхолдер
    if (calculatedValue === null || calculatedValue === undefined) {
      return '---';
    }

    // 5. Застосовуємо форматування, якщо воно було вказане

    // Застосовуємо форматування з фільтра format()
    if (formatSpecifier) {
      // Спрощена реалізація для специфікаторів типу '%.1f' або '%0.0f'
      const precisionMatch = formatSpecifier.match(/\.(\d+)f/);
      if (precisionMatch && typeof calculatedValue === 'number') {
        const specifierPrecision = parseInt(precisionMatch[1], 10);
        if (!isNaN(specifierPrecision)) {
          return calculatedValue.toFixed(specifierPrecision);
        }
      }
      // Якщо специфікатор невідомий, повертаємо обчислене значення
      return String(calculatedValue);
    }

    // Застосовуємо заокруглення з фільтра round()
    if (precision !== null && typeof calculatedValue === 'number' && !isNaN(precision)) {
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