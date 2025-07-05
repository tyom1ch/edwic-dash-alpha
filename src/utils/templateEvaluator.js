// src/utils/templateEvaluator.js

/**
 * Обробляє шаблон значення (val_tpl) з Home Assistant.
 * @param {string | undefined} template - Рядок шаблону, напр. "{{ '%0.2f'|format(float(value)*0.1) }}"
 * @param {string | number | undefined} rawValue - Сире значення, отримане з MQTT.
 * @returns {string} - Оброблений і відформатований рядок для відображення.
 */
export const evaluateValueTemplate = (template, rawValue) => {
  // Якщо немає шаблону або значення, повертаємо сире значення або плейсхолдер
  if (!template || rawValue === null || rawValue === undefined) {
    return rawValue ?? '---';
  }

  try {
    // 1. Отримуємо вираз зсередини {{ ... }}
    let expression = template.slice(2, -2).trim();

    // 2. Обробляємо поширений фільтр |format для форматування чисел
    const formatMatch = expression.match(/'%([0-9.]*)f'\|format\((.*)\)/);
    let valueExpression = expression;
    let precision = null;

    if (formatMatch) {
      // Витягуємо точність (кількість знаків після коми) та сам вираз для обчислення
      const precisionStr = formatMatch[1];
      precision = precisionStr.includes('.') ? parseInt(precisionStr.split('.')[1], 10) : 0;
      valueExpression = formatMatch[2].trim();
    }

    // 3. Готуємо вираз для безпечного виконання в JS
    // - Замінюємо 'value' на реальне отримане значення
    // - Замінюємо функції Jinja (float) на їхні аналоги в JS (parseFloat)
    const jsExpression = valueExpression
      .replace(/value/g, String(rawValue))
      .replace(/float/g, 'parseFloat');
      // сюди можна додати інші заміни, напр. .replace(/int/g, 'parseInt')

    // 4. Безпечно обчислюємо вираз за допомогою конструктора Function
    // Це безпечніше, ніж eval(), оскільки не має доступу до локального скоупу.
    const calculatedValue = new Function(`return ${jsExpression}`)();

    // 5. Якщо було задано форматування, застосовуємо його
    if (precision !== null && typeof calculatedValue === 'number') {
      return calculatedValue.toFixed(precision);
    }

    // Повертаємо обчислене значення, якщо форматування не було або результат не є числом
    return String(calculatedValue);

  } catch (error) {
    console.error(`Помилка обробки шаблону: "${template}" зі значенням: "${rawValue}"`, error);
    // У разі помилки повертаємо сире значення, щоб не "зламати" віджет
    return String(rawValue);
  }
};