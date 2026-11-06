const MAX_TEMPLATE_LENGTH = 500;

const isEmpty = (value) => value === null || value === undefined || value === '';

export const evaluateValueTemplate = (template, rawValue) => {
  if (isEmpty(rawValue)) return '---';
  if (!template) return String(rawValue);

  const wrapped = String(template).trim().match(/^\{\{\s*([\s\S]*?)\s*\}\}$/);
  if (!wrapped) return String(rawValue);

  let expression = wrapped[1].trim();
  if (!expression || expression.length > MAX_TEMPLATE_LENGTH) return String(rawValue);

  let precision = null;
  let formatDigits = null;

  const formatMatch = expression.match(/^(['"])(.*?)\1\s*\|\s*format\((.*)\)\s*$/);
  if (formatMatch) {
    const digits = formatMatch[2].match(/\.(\d+)f/);
    if (digits) formatDigits = Number(digits[1]);
    expression = formatMatch[3].trim();
  } else {
    const pipe = expression.indexOf('|');
    if (pipe !== -1) {
      const filter = expression.slice(pipe + 1).split('|')[0].trim();
      expression = expression.slice(0, pipe).trim();
      const round = filter.match(/^round\(\s*(\d+)\s*\)$/);
      if (round) precision = Number(round[1]);
    }
  }

  let valueJson = null;
  if (typeof rawValue === 'string') {
    try {
      valueJson = JSON.parse(rawValue);
    } catch {
      valueJson = null;
    }
  } else if (rawValue && typeof rawValue === 'object') {
    valueJson = rawValue;
  }

  try {
    const result = evaluateExpression(expression, rawValue, valueJson);
    if (result === null || result === undefined || Number.isNaN(result)) return '---';
    if (typeof result === 'number' && formatDigits !== null) return result.toFixed(formatDigits);
    if (typeof result === 'number' && precision !== null) return result.toFixed(precision);
    if (typeof result === 'object') return JSON.stringify(result);
    return String(result);
  } catch {
    return String(rawValue);
  }
};

function evaluateExpression(source, rawValue, valueJson) {
  let i = 0;

  const skip = () => {
    while (i < source.length && source.charCodeAt(i) <= 32) i += 1;
  };

  const parseExpression = () => {
    let left = parseTerm();
    for (;;) {
      skip();
      const op = source[i];
      if (op !== '+' && op !== '-') break;
      i += 1;
      left = applyOp(left, op, parseTerm());
    }
    return left;
  };

  const parseTerm = () => {
    let left = parseUnary();
    for (;;) {
      skip();
      const op = source[i];
      if (op !== '*' && op !== '/') break;
      i += 1;
      left = applyOp(left, op, parseUnary());
    }
    return left;
  };

  const parseUnary = () => {
    skip();
    if (source[i] === '+') {
      i += 1;
      return applyOp(0, '+', parseUnary());
    }
    if (source[i] === '-') {
      i += 1;
      return applyOp(0, '-', parseUnary());
    }
    return parsePrimary();
  };

  const parsePrimary = () => {
    skip();
    const ch = source[i];
    if (ch === '(') {
      i += 1;
      const value = parseExpression();
      skip();
      if (source[i] !== ')') throw new Error('expected )');
      i += 1;
      return value;
    }
    if (ch === '"' || ch === "'") return parseString();
    if (ch >= '0' && ch <= '9') return parseNumber();
    if (ch === '.' && source[i + 1] >= '0' && source[i + 1] <= '9') return parseNumber();
    if (isIdentStart(ch)) return parseIdentOrCall();
    throw new Error('unexpected token');
  };

  const parseIdentOrCall = () => {
    const name = parseIdent();
    skip();
    if (source[i] === '(') {
      if (name !== 'float' && name !== 'int') throw new Error('call');
      i += 1;
      const arg = parseExpression();
      skip();
      if (source[i] !== ')') throw new Error('expected )');
      i += 1;
      const parsed = name === 'int' ? parseInt(arg, 10) : parseFloat(arg);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (name === 'value') return rawValue;
    if (name === 'value_json') return readPath(valueJson);
    throw new Error('name');
  };

  const readPath = (base) => {
    let current = base;
    for (;;) {
      skip();
      if (source[i] === '.') {
        i += 1;
        current = own(current, parseIdent());
      } else if (source[i] === '[') {
        i += 1;
        skip();
        const key = source[i] === '"' || source[i] === "'"
          ? parseString()
          : String(parseNumber());
        skip();
        if (source[i] !== ']') throw new Error('expected ]');
        i += 1;
        current = own(current, key);
      } else {
        return current;
      }
    }
  };

  const parseIdent = () => {
    skip();
    const start = i;
    if (!isIdentStart(source[i])) throw new Error('ident');
    i += 1;
    while (isIdentPart(source[i])) i += 1;
    return source.slice(start, i);
  };

  const parseString = () => {
    const quote = source[i];
    i += 1;
    let value = '';
    while (i < source.length && source[i] !== quote) {
      if (source[i] === '\\' && i + 1 < source.length) {
        i += 1;
        value += source[i];
        i += 1;
        continue;
      }
      value += source[i];
      i += 1;
    }
    if (source[i] !== quote) throw new Error('string');
    i += 1;
    return value;
  };

  const parseNumber = () => {
    skip();
    const start = i;
    if (source[i] === '.') i += 1;
    if (source[i] < '0' || source[i] > '9') throw new Error('number');
    while (source[i] >= '0' && source[i] <= '9') i += 1;
    if (source[i] === '.') {
      i += 1;
      while (source[i] >= '0' && source[i] <= '9') i += 1;
    }
    const value = Number(source.slice(start, i));
    if (!Number.isFinite(value)) throw new Error('number');
    return value;
  };

  const result = parseExpression();
  skip();
  if (i !== source.length) throw new Error('trailing');
  if (typeof result === 'function') throw new Error('function');
  return result;
}

function own(obj, key) {
  if (obj === null || typeof obj !== 'object') return null;
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') return null;
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return null;
  const value = obj[key];
  return typeof value === 'function' ? null : value;
}

function applyOp(left, op, right) {
  const a = typeof left === 'number' ? left : Number(left);
  const b = typeof right === 'number' ? right : Number(right);
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('nan');
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  if (op === '/') return b === 0 ? null : a / b;
  throw new Error('op');
}

function isIdentStart(ch) {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_' || ch === '$';
}

function isIdentPart(ch) {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9');
}
