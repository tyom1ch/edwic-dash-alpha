import { evaluateValueTemplate } from '../utils/templateEvaluator';

const replaceBase = (topic, baseTopic) => {
  if (typeof topic !== 'string') return null;
  const trimmed = topic.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('~/') && baseTopic) return `${baseTopic}${trimmed.slice(1)}`;
  return trimmed;
};

export const graphTopicOf = (card) => replaceBase(card?.graph_topic || card?.topic, card?.['~']);

export const historyTopic = (card) => {
  if (!card) return null;
  const base = card['~'];
  if (card.type === 'history-graph') return graphTopicOf(card);
  if (card.type === 'sensor' || card.type === 'number') {
    return replaceBase(card.state_topic || card.stat_t, base);
  }
  if (card.type === 'climate') {
    return replaceBase(card.current_temperature_topic || card.curr_temp_t, base);
  }
  return null;
};

const templateOf = (card) => {
  if (!card || card.type === 'history-graph') return null;
  if (card.type === 'climate') {
    return card.current_temperature_template || card.curr_temp_tpl || null;
  }
  return card.value_template || card.val_tpl || card.state_value_template || null;
};

export const historySeriesOf = (card, fallbackBrokerId) => {
  const topic = historyTopic(card);
  const brokerId = card?.brokerId || fallbackBrokerId || null;
  if (!brokerId || !topic) return null;
  return { brokerId, topic, template: templateOf(card) };
};

const leadingNumber = (text) => {
  const trimmed = String(text).trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)/.test(trimmed)) return null;
  const value = parseFloat(trimmed);
  return Number.isFinite(value) ? value : null;
};

export const numericFromPayload = (raw, template) => {
  const text = raw == null ? '' : String(raw);
  const direct = leadingNumber(text);
  if (direct !== null) return direct;
  if (!template) return null;
  const rendered = evaluateValueTemplate(template, text);
  if (!rendered || rendered === '---') return null;
  return leadingNumber(rendered);
};
