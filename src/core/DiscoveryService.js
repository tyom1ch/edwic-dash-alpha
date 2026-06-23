// src/core/DiscoveryService.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';
import { WIDGET_REGISTRY } from './widgetRegistry';

// ─── HA abbreviation expansion table ─────────────────────────────────────────
// Source: https://www.home-assistant.io/integrations/mqtt/#supported-abbreviations-in-mqtt-discovery-messages
const ABBREV_MAP = {
  // Payload-level abbreviations
  'act_t': 'action_topic', 'act_tpl': 'action_template',
  'atype': 'automation_type',
  'aux_cmd_t': 'aux_command_topic', 'aux_stat_t': 'aux_state_topic', 'aux_stat_tpl': 'aux_state_template',
  'av_tones': 'available_tones',
  'avty': 'availability', 'avty_mode': 'availability_mode',
  'avty_t': 'availability_topic', 'avty_tpl': 'availability_template',
  'away_mode_cmd_t': 'away_mode_command_topic', 'away_mode_stat_t': 'away_mode_state_topic',
  'away_mode_stat_tpl': 'away_mode_state_template',
  'b_tpl': 'blue_template',
  'bri_cmd_t': 'brightness_command_topic', 'bri_cmd_tpl': 'brightness_command_template',
  'bri_scl': 'brightness_scale', 'bri_stat_t': 'brightness_state_topic',
  'bri_tpl': 'brightness_template', 'bri_val_tpl': 'brightness_value_template',
  'clr_temp_cmd_tpl': 'color_temp_command_template', 'clr_temp_cmd_t': 'color_temp_command_topic',
  'clr_temp_k': 'color_temp_kelvin', 'clr_temp_stat_t': 'color_temp_state_topic',
  'clr_temp_tpl': 'color_temp_template', 'clr_temp_val_tpl': 'color_temp_value_template',
  'clrm_stat_t': 'color_mode_state_topic', 'clrm_val_tpl': 'color_mode_value_template',
  'cmd_off_tpl': 'command_off_template', 'cmd_on_tpl': 'command_on_template',
  'cmd_t': 'command_topic', 'cmd_tpl': 'command_template',
  'cmps': 'components',
  'cod_arm_req': 'code_arm_required', 'cod_dis_req': 'code_disarm_required',
  'cod_trig_req': 'code_trigger_required', 'cont_type': 'content_type',
  'curr_temp_t': 'current_temperature_topic', 'curr_temp_tpl': 'current_temperature_template',
  'def_ent_id': 'default_entity_id',
  'dev': 'device', 'dev_cla': 'device_class',
  'dir_cmd_t': 'direction_command_topic', 'dir_cmd_tpl': 'direction_command_template',
  'dir_stat_t': 'direction_state_topic', 'dir_val_tpl': 'direction_value_template',
  'dsp_prc': 'display_precision',
  'e': 'encoding', 'en': 'enabled_by_default',
  'ent_cat': 'entity_category', 'ent_pic': 'entity_picture',
  'evt_typ': 'event_types', 'exp_aft': 'expire_after',
  'fanspd_lst': 'fan_speed_list',
  'flsh': 'flash', 'flsh_tlng': 'flash_time_long', 'flsh_tsht': 'flash_time_short',
  'fx_cmd_t': 'effect_command_topic', 'fx_cmd_tpl': 'effect_command_template',
  'fx_list': 'effect_list', 'fx_stat_t': 'effect_state_topic',
  'fx_tpl': 'effect_template', 'fx_val_tpl': 'effect_value_template',
  'fan_mode_cmd_t': 'fan_mode_command_topic', 'fan_mode_cmd_tpl': 'fan_mode_command_template',
  'fan_mode_stat_t': 'fan_mode_state_topic', 'fan_mode_stat_tpl': 'fan_mode_state_template',
  'frc_upd': 'force_update',
  'g_tpl': 'green_template', 'grp': 'group',
  'hs_cmd_t': 'hs_command_topic', 'hs_cmd_tpl': 'hs_command_template',
  'hs_stat_t': 'hs_state_topic', 'hs_val_tpl': 'hs_value_template',
  'ic': 'icon', 'img_e': 'image_encoding', 'img_t': 'image_topic', 'init': 'initial',
  'hum_cmd_t': 'target_humidity_command_topic', 'hum_cmd_tpl': 'target_humidity_command_template',
  'hum_stat_t': 'target_humidity_state_topic', 'hum_state_tpl': 'target_humidity_state_template',
  'json_attr': 'json_attributes', 'json_attr_t': 'json_attributes_topic',
  'json_attr_tpl': 'json_attributes_template',
  'l_ver_t': 'latest_version_topic', 'l_ver_tpl': 'latest_version_template',
  'lrst_t': 'last_reset_topic', 'lrst_val_tpl': 'last_reset_value_template',
  'max': 'max', 'max_hum': 'max_humidity', 'max_k': 'max_kelvin',
  'max_mirs': 'max_mireds', 'max_temp': 'max_temp',
  'migr_discvry': 'migrate_discovery',
  'min': 'min', 'min_hum': 'min_humidity', 'min_k': 'min_kelvin',
  'min_mirs': 'min_mireds', 'min_temp': 'min_temp',
  'mode': 'mode', 'mode_cmd_t': 'mode_command_topic', 'mode_cmd_tpl': 'mode_command_template',
  'mode_stat_t': 'mode_state_topic', 'mode_stat_tpl': 'mode_state_template', 'modes': 'modes',
  'msg_exp_int': 'message_expiry_interval',
  'name': 'name',
  'o': 'origin',
  'off_dly': 'off_delay', 'on_cmd_type': 'on_command_type',
  'ops': 'options', 'opt': 'optimistic',
  'osc_cmd_t': 'oscillation_command_topic', 'osc_cmd_tpl': 'oscillation_command_template',
  'osc_stat_t': 'oscillation_state_topic', 'osc_val_tpl': 'oscillation_value_template',
  'p': 'platform',
  'pct_cmd_t': 'percentage_command_topic', 'pct_cmd_tpl': 'percentage_command_template',
  'pct_stat_t': 'percentage_state_topic', 'pct_val_tpl': 'percentage_value_template',
  'pl': 'payload',
  'pl_arm_away': 'payload_arm_away', 'pl_arm_custom_b': 'payload_arm_custom_bypass',
  'pl_arm_home': 'payload_arm_home', 'pl_arm_nite': 'payload_arm_night',
  'pl_arm_vacation': 'payload_arm_vacation',
  'pl_avail': 'payload_available', 'pl_cln_sp': 'payload_clean_spot',
  'pl_cls': 'payload_close', 'pl_dir_fwd': 'payload_direction_forward',
  'pl_dir_rev': 'payload_direction_reverse', 'pl_disarm': 'payload_disarm',
  'pl_home': 'payload_home', 'pl_inst': 'payload_install', 'pl_loc': 'payload_locate',
  'pl_lock': 'payload_lock', 'pl_not_avail': 'payload_not_available',
  'pl_not_home': 'payload_not_home', 'pl_off': 'payload_off', 'pl_on': 'payload_on',
  'pl_open': 'payload_open', 'pl_osc_off': 'payload_oscillation_off',
  'pl_osc_on': 'payload_oscillation_on', 'pl_paus': 'payload_pause',
  'pl_prs': 'payload_press', 'pl_ret': 'payload_return_to_base',
  'pl_rst': 'payload_reset', 'pl_rst_hum': 'payload_reset_humidity',
  'pl_rst_mode': 'payload_reset_mode', 'pl_rst_pct': 'payload_reset_percentage',
  'pl_rst_pr_mode': 'payload_reset_preset_mode', 'pl_stop': 'payload_stop',
  'pl_stop_tilt': 'payload_stop_tilt', 'pl_stpa': 'payload_start_pause',
  'pl_strt': 'payload_start', 'pl_toff': 'payload_turn_off', 'pl_ton': 'payload_turn_on',
  'pl_trig': 'payload_trigger', 'pl_unlk': 'payload_unlock',
  'pos': 'reports_position', 'pos_clsd': 'position_closed', 'pos_open': 'position_open',
  'pr_mode_cmd_t': 'preset_mode_command_topic', 'pr_mode_cmd_tpl': 'preset_mode_command_template',
  'pr_mode_stat_t': 'preset_mode_state_topic', 'pr_mode_val_tpl': 'preset_mode_value_template',
  'pr_modes': 'preset_modes', 'ptrn': 'pattern',
  'r_tpl': 'red_template', 'rel_s': 'release_summary', 'rel_u': 'release_url', 'ret': 'retain',
  'rgb_cmd_t': 'rgb_command_topic', 'rgb_cmd_tpl': 'rgb_command_template',
  'rgb_stat_t': 'rgb_state_topic', 'rgb_val_tpl': 'rgb_value_template',
  'rgbw_cmd_t': 'rgbw_command_topic', 'rgbw_cmd_tpl': 'rgbw_command_template',
  'rgbw_stat_t': 'rgbw_state_topic', 'rgbw_val_tpl': 'rgbw_value_template',
  'rgbww_cmd_t': 'rgbww_command_topic', 'rgbww_cmd_tpl': 'rgbww_command_template',
  'rgbww_stat_t': 'rgbww_state_topic', 'rgbww_val_tpl': 'rgbww_value_template',
  'send_cmd_t': 'send_command_topic', 'send_if_off': 'send_if_off',
  'set_fan_spd_t': 'set_fan_speed_topic',
  'set_pos_t': 'set_position_topic', 'set_pos_tpl': 'set_position_template',
  'pos_t': 'position_topic', 'pos_tpl': 'position_template',
  'spd_rng_min': 'speed_range_min', 'spd_rng_max': 'speed_range_max',
  'src_type': 'source_type',
  'stat_cla': 'state_class', 'stat_closing': 'state_closing', 'stat_clsd': 'state_closed',
  'stat_jam': 'state_jammed', 'stat_locked': 'state_locked', 'stat_locking': 'state_locking',
  'stat_off': 'state_off', 'stat_on': 'state_on', 'stat_open': 'state_open',
  'stat_opening': 'state_opening', 'stat_stopped': 'state_stopped',
  'stat_unlocked': 'state_unlocked', 'stat_unlocking': 'state_unlocking',
  'stat_t': 'state_topic', 'stat_tpl': 'state_template', 'stat_val_tpl': 'state_value_template',
  'step': 'step', 'stype': 'subtype',
  'sug_dsp_prc': 'suggested_display_precision', 'sup_clrm': 'supported_color_modes',
  'sup_dur': 'support_duration', 'sup_vol': 'support_volume_set', 'sup_feat': 'supported_features',
  'swing_mode_cmd_t': 'swing_mode_command_topic', 'swing_mode_cmd_tpl': 'swing_mode_command_template',
  'swing_mode_stat_t': 'swing_mode_state_topic', 'swing_mode_stat_tpl': 'swing_mode_state_template',
  't': 'topic',
  'temp_cmd_t': 'temperature_command_topic', 'temp_cmd_tpl': 'temperature_command_template',
  'temp_hi_cmd_t': 'temperature_high_command_topic', 'temp_hi_cmd_tpl': 'temperature_high_command_template',
  'temp_hi_stat_t': 'temperature_high_state_topic', 'temp_hi_stat_tpl': 'temperature_high_state_template',
  'temp_lo_cmd_t': 'temperature_low_command_topic', 'temp_lo_cmd_tpl': 'temperature_low_command_template',
  'temp_lo_stat_t': 'temperature_low_state_topic', 'temp_lo_stat_tpl': 'temperature_low_state_template',
  'temp_stat_t': 'temperature_state_topic', 'temp_stat_tpl': 'temperature_state_template',
  'temp_unit': 'temperature_unit',
  'tilt_clsd_val': 'tilt_closed_value', 'tilt_cmd_t': 'tilt_command_topic',
  'tilt_cmd_tpl': 'tilt_command_template', 'tilt_max': 'tilt_max', 'tilt_min': 'tilt_min',
  'tilt_opnd_val': 'tilt_opened_value', 'tilt_opt': 'tilt_optimistic',
  'tilt_status_t': 'tilt_status_topic', 'tilt_status_tpl': 'tilt_status_template',
  'tit': 'title', 'trns': 'transition', 'tz': 'timezone',
  'uniq_id': 'unique_id', 'unit_of_meas': 'unit_of_measurement',
  'url_t': 'url_topic', 'url_tpl': 'url_template',
  'val_tpl': 'value_template',
  'whit_cmd_t': 'white_command_topic', 'whit_scl': 'white_scale',
  'xy_cmd_t': 'xy_command_topic', 'xy_cmd_tpl': 'xy_command_template',
  'xy_stat_t': 'xy_state_topic', 'xy_val_tpl': 'xy_value_template',
  // Device registry abbreviations
  'cu': 'configuration_url', 'cns': 'connections', 'ids': 'identifiers',
  'mf': 'manufacturer', 'mdl': 'model', 'mdl_id': 'model_id',
  'hw': 'hw_version', 'sw': 'sw_version', 'sa': 'suggested_area', 'sn': 'serial_number',
};

/**
 * Expand all abbreviated keys in an HA MQTT discovery payload to their full names.
 * Handles nested `device` (`dev`) object abbreviations too.
 */
const expandAbbreviations = (raw) => {
  const expanded = {};
  for (const [k, v] of Object.entries(raw)) {
    const fullKey = ABBREV_MAP[k] || k;
    expanded[fullKey] = v;
  }
  // Also expand nested device object
  if (expanded.device && typeof expanded.device === 'object') {
    const devExpanded = {};
    for (const [k, v] of Object.entries(expanded.device)) {
      devExpanded[ABBREV_MAP[k] || k] = v;
    }
    expanded.device = devExpanded;
  }
  return expanded;
};

// ─── Component type → dashboard widget mapping ────────────────────────────────
const mapHaTypeToDashboardType = (entityConfig) => {
  const componentType = entityConfig.componentType || 'unknown';

  if (componentType === 'climate') {
    const hasLowTempTopic = entityConfig.temperature_low_state_topic;
    const hasHighTempTopic = entityConfig.temperature_high_state_topic;
    return { type: 'climate', variant: (hasLowTempTopic && hasHighTempTopic) ? 'range' : 'single' };
  }

  if (['switch', 'light', 'fan', 'lock', 'cover', 'valve', 'siren', 'water_heater'].includes(componentType)) {
    return { type: 'switch' };
  }

  if (['sensor', 'binary_sensor', 'number', 'text', 'device_tracker'].includes(componentType)) {
    return { type: 'sensor' };
  }

  if (['button', 'scene'].includes(componentType)) {
    return { type: 'button' };
  }

  const knownWidgetTypes = WIDGET_REGISTRY.map(w => w.type);
  if (knownWidgetTypes.includes(componentType)) {
    return { type: componentType };
  }

  return { type: 'generic_info' };
};

// ─── Component types that don't need a state_topic ───────────────────────────
const STATELESS_COMPONENTS = new Set(['button', 'scene', 'device_automation', 'tag']);

class DiscoveryService {
  constructor() {
    this.discoveredDevices = new Map();
    this.configTopicToEntityId = new Map();
    this.currentDiscoveryTopic = null;
    this.currentDiscoveryBase = null;
    // Map<availTopic, { brokerId: string, entities: Set<entityId> }>
    this.availabilityTopics = new Map();
    this._debounceTimeout = null;
    this.setupListeners();
    console.log('[DiscoveryService] Initialized.');
  }

  setupListeners() {
    eventBus.on('broker:connected', (brokerId, brokerConfig) =>
      this.handleBrokerConnected(brokerId, brokerConfig)
    );

    eventBus.on('broker:reconnecting', (brokerId) => {
      console.log(`[DiscoveryService] Broker ${brokerId} reconnecting. Clearing state...`);
      this.clearDiscoveredData();
      this.currentDiscoveryTopic = null;
      this.currentDiscoveryBase = null;
    });

    eventBus.on('broker:removed', (brokerId) => {
      console.log(`[DiscoveryService] Broker ${brokerId} removed. Clearing state.`);
      this.clearDiscoveredData();
      this.currentDiscoveryTopic = null;
      this.currentDiscoveryBase = null;
    });

    eventBus.on('mqtt:raw_message', this.handleMqttMessage.bind(this));
  }

  handleBrokerConnected(brokerId, brokerConfig) {
    this.updateDiscoverySubscription(brokerId, brokerConfig);
    // Publish Birth message so devices know to (re)send their discovery payloads
    if (this.currentDiscoveryBase) {
      const birthTopic = `${this.currentDiscoveryBase}/status`;
      connectionManager.publishToTopic(brokerId, birthTopic, 'online');
      console.log(`[DiscoveryService] Published Birth message → ${birthTopic}`);
    }
  }

  updateDiscoverySubscription(brokerId, brokerConfig) {
    const discoveryTopicBase = brokerConfig?.discovery_topic?.trim() || 'homeassistant';
    const newDiscoveryTopic = `${discoveryTopicBase}/#`;

    if (this.currentDiscoveryTopic !== newDiscoveryTopic) {
      if (this.currentDiscoveryTopic) {
        connectionManager.unsubscribeFromTopic(brokerId, this.currentDiscoveryTopic);
      }
      console.log(`[DiscoveryService] Subscribing to discovery topic: ${newDiscoveryTopic}`);
      connectionManager.subscribeToTopic(brokerId, newDiscoveryTopic);
      this.currentDiscoveryTopic = newDiscoveryTopic;
      this.currentDiscoveryBase = discoveryTopicBase;
      this.clearDiscoveredData();
    }
  }

  clearDiscoveredData() {
    console.log('[DiscoveryService] Clearing all discovered data.');

    for (const [topic, data] of this.availabilityTopics.entries()) {
      connectionManager.unsubscribeFromTopic(data.brokerId, topic);
    }

    this.discoveredDevices.clear();
    this.configTopicToEntityId.clear();
    this.availabilityTopics.clear();

    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
      this._debounceTimeout = null;
    }

    // Emit empty update so UI reflects cleared state
    eventBus.emit('discovery:updated', []);
  }

  emitDebouncedUpdate() {
    if (this._debounceTimeout) clearTimeout(this._debounceTimeout);
    this._debounceTimeout = setTimeout(() => {
      eventBus.emit('discovery:updated', this.getDiscoveredDevices());
    }, 200);
  }

  _getDeviceId(config) {
    const dev = config.device || {};
    if (dev.identifiers && dev.identifiers[0]) return dev.identifiers[0];
    if (dev.connections && dev.connections[0] && dev.connections[0][1]) return dev.connections[0][1];
    if (dev.name) return dev.name;
    return config.unique_id;
  }

  handleMqttMessage(brokerId, topic, messageBuffer) {
    const message = messageBuffer.toString('utf8').replace(/\0/g, '').trim();

    if (!this.currentDiscoveryBase) return;
    const baseTopic = this.currentDiscoveryBase;

    // Handle availability topics registered during discovery
    if (this.availabilityTopics.has(topic)) {
      const data = this.availabilityTopics.get(topic);
      data.entities.forEach(entityId => this.updateEntityAvailability(entityId, message, data));
      return;
    }

    if (topic.startsWith(`${baseTopic}/`) && topic.endsWith('/config')) {
      this.processConfigMessage(brokerId, topic, message, baseTopic);
    }
  }

  processConfigMessage(brokerId, topic, message, baseTopicPrefix) {
    if (!message) {
      this.removeEntityByTopic(topic);
      return;
    }

    try {
      const rawConfig = JSON.parse(message);

      // Handle migrate_discovery signal — just clear, real config comes separately
      if (rawConfig.migrate_discovery) {
        console.log(`[DiscoveryService] migrate_discovery received on ${topic}, clearing entry.`);
        this.removeEntityByTopic(topic);
        return;
      }

      // Expand all abbreviated keys to full names
      const config = expandAbbreviations(rawConfig);

      // Extract HA component from topic: baseTopic/component/[node_id]/object_id/config
      const strippedTopic = topic.substring(baseTopicPrefix.length + 1, topic.length - 7);
      const topicParts = strippedTopic.split('/');
      if (topicParts.length < 1) return;
      const haComponentType = topicParts[0];

      // ── Device Discovery format: homeassistant/device/<object_id>/config ────
      if (haComponentType === 'device') {
        this._processDeviceDiscovery(brokerId, topic, config, baseTopicPrefix);
        return;
      }

      // ── Single Component Discovery ─────────────────────────────────────────
      this._processSingleComponentDiscovery(brokerId, topic, config, haComponentType, baseTopicPrefix);

    } catch (e) {
      console.warn(`[DiscoveryService] Dropped malformed JSON from ${topic}:`, e.message);
    }
  }

  /**
   * Process HA Device Discovery payload (component = "device", payload has `components` key).
   * Single discovery message describes the whole device and all its entities.
   */
  _processDeviceDiscovery(brokerId, configTopic, config, baseTopicPrefix) {
    const components = config.components;
    if (!components || typeof components !== 'object') {
      console.warn('[DiscoveryService] Device discovery payload missing `components`.', configTopic);
      return;
    }

    const deviceId = this._getDeviceId(config);
    if (!deviceId) {
      console.warn('[DiscoveryService] Device discovery: missing device identifiers.', configTopic);
      return;
    }

    const dev = config.device || {};
    if (!this.discoveredDevices.has(deviceId)) {
      this.discoveredDevices.set(deviceId, {
        id: deviceId,
        name: dev.name || deviceId,
        model: dev.model || 'Unknown',
        manufacturer: dev.manufacturer || 'Unknown',
        entities: new Map(),
      });
    }
    const device = this.discoveredDevices.get(deviceId);

    // Shared options from root level (state_topic, command_topic, qos, encoding, availability)
    const sharedConfig = {};
    for (const key of ['state_topic', 'command_topic', 'qos', 'encoding', 'availability',
                        'availability_topic', 'availability_mode', 'payload_available',
                        'payload_not_available']) {
      if (config[key] !== undefined) sharedConfig[key] = config[key];
    }

    const tildeBasePrefix = config['~'] || configTopic.substring(0, configTopic.lastIndexOf('/'));

    let anyAdded = false;
    for (const [componentKey, rawCmpConfig] of Object.entries(components)) {
      if (!rawCmpConfig || typeof rawCmpConfig !== 'object') continue;

      const cmpConfig = expandAbbreviations(rawCmpConfig);
      const haComponentType = cmpConfig.platform;
      if (!haComponentType) continue;

      // Merge: shared root config + component-specific config (component wins)
      const mergedConfig = { ...sharedConfig, ...cmpConfig, device: dev };

      const uniqueId = mergedConfig.unique_id;
      if (!uniqueId && !STATELESS_COMPONENTS.has(haComponentType)) {
        console.warn(`[DiscoveryService] Device discovery component "${componentKey}" missing unique_id.`);
        continue;
      }

      const entity = this._buildEntity(
        brokerId,
        configTopic,
        mergedConfig,
        haComponentType,
        tildeBasePrefix,
        uniqueId || `${deviceId}_${componentKey}`
      );

      device.entities.set(entity.id, entity);
      // Track using composite key: configTopic + componentKey
      const compositeKey = `${configTopic}::${componentKey}`;
      this.configTopicToEntityId.set(compositeKey, { deviceId, entityId: entity.id });
      anyAdded = true;
    }

    // Also track the device config topic itself for removal
    this.configTopicToEntityId.set(configTopic, { deviceId, isDeviceRoot: true });

    if (anyAdded) this.emitDebouncedUpdate();
  }

  /**
   * Process classic single-component discovery payload.
   */
  _processSingleComponentDiscovery(brokerId, topic, config, haComponentType, baseTopicPrefix) {
    const uniqueId = config.unique_id;

    // Validate: must have unique_id for entity-based components
    if (!uniqueId && !STATELESS_COMPONENTS.has(haComponentType)) {
      console.warn(`[DiscoveryService] Skipping ${topic}: missing unique_id for component type "${haComponentType}".`);
      return;
    }

    // Validate: must have some state topic (unless stateless)
    const hasStateTopic = config.state_topic || config.topic;
    if (!hasStateTopic && !STATELESS_COMPONENTS.has(haComponentType)) {
      console.warn(`[DiscoveryService] Skipping ${topic}: no state_topic for "${haComponentType}".`);
      return;
    }

    const deviceId = this._getDeviceId(config);
    if (!deviceId && !STATELESS_COMPONENTS.has(haComponentType)) {
      console.warn(`[DiscoveryService] Skipping ${topic}: cannot determine device ID.`);
      return;
    }

    const tildeBasePrefix = config['~'] || topic.substring(0, topic.lastIndexOf('/'));
    const entityId = uniqueId || `${haComponentType}_${topic}`;

    const entity = this._buildEntity(brokerId, topic, config, haComponentType, tildeBasePrefix, entityId);

    const resolvedDeviceId = deviceId || entityId;
    if (!this.discoveredDevices.has(resolvedDeviceId)) {
      const dev = config.device || {};
      this.discoveredDevices.set(resolvedDeviceId, {
        id: resolvedDeviceId,
        name: dev.name || resolvedDeviceId,
        model: dev.model || 'Unknown',
        manufacturer: dev.manufacturer || 'Unknown',
        entities: new Map(),
      });
    }

    const device = this.discoveredDevices.get(resolvedDeviceId);
    device.entities.set(entity.id, entity);
    this.configTopicToEntityId.set(topic, { deviceId: resolvedDeviceId, entityId: entity.id });

    this.emitDebouncedUpdate();
  }

  /**
   * Build a normalized entity object from an already-expanded config.
   */
  _buildEntity(brokerId, configTopic, config, haComponentType, tildeBasePrefix, entityId) {
    const resolveTopic = (topicFragment) => {
      if (!topicFragment) return null;
      if (topicFragment.includes('+') || topicFragment.includes('#')) return topicFragment;
      return topicFragment.includes('~')
        ? topicFragment.replace(/~/g, tildeBasePrefix)
        : topicFragment;
    };

    const widgetInfo = mapHaTypeToDashboardType({ ...config, componentType: haComponentType });

    const entity = {
      id: entityId,
      name: config.name || entityId,
      componentType: haComponentType,
      type: widgetInfo.type,
      ...widgetInfo,
      brokerId,
      _config_topic: configTopic,
      available: true,
    };

    // Copy all config fields, resolving topic tildes for topic-valued strings
    for (const [key, value] of Object.entries(config)) {
      if (key === 'device' || key === 'availability') continue; // handled separately
      if (typeof value === 'string' && (key.endsWith('_topic') || key === 'topic')) {
        entity[key] = resolveTopic(value);
      } else {
        entity[key] = value;
      }
    }

    // ── Availability subscription ─────────────────────────────────────────────
    // Support both: availability_topic (string) and availability (array of objects)
    const availList = this._resolveAvailabilityList(config, resolveTopic);
    for (const { topic: availTopic, payload_available, payload_not_available } of availList) {
      if (!availTopic) continue;

      if (!this.availabilityTopics.has(availTopic)) {
        this.availabilityTopics.set(availTopic, {
          brokerId,
          entities: new Set(),
          payload_available: payload_available || 'online',
          payload_not_available: payload_not_available || 'offline',
        });
        connectionManager.subscribeToTopic(brokerId, availTopic);
      }
      this.availabilityTopics.get(availTopic).entities.add(entity.id);
    }

    // Keep payload_available/not_available on entity for availability checks
    entity.payload_available = config.payload_available || 'online';
    entity.payload_not_available = config.payload_not_available || 'offline';

    return entity;
  }

  /**
   * Resolve availability into a uniform list of { topic, payload_available, payload_not_available }.
   * Handles both `availability_topic` (string) and `availability` (array of objects).
   */
  _resolveAvailabilityList(config, resolveTopic) {
    const results = [];

    if (config.availability_topic) {
      results.push({
        topic: resolveTopic(config.availability_topic),
        payload_available: config.payload_available || 'online',
        payload_not_available: config.payload_not_available || 'offline',
      });
    }

    if (Array.isArray(config.availability)) {
      for (const avEntry of config.availability) {
        if (!avEntry || typeof avEntry !== 'object') continue;
        // Expand abbreviations within availability entry
        const expanded = expandAbbreviations(avEntry);
        const t = expanded.topic || expanded.availability_topic;
        if (t) {
          results.push({
            topic: resolveTopic(t),
            payload_available: expanded.payload_available || config.payload_available || 'online',
            payload_not_available: expanded.payload_not_available || config.payload_not_available || 'offline',
          });
        }
      }
    }

    return results;
  }

  updateEntityAvailability(entityId, payload, topicData) {
    const payloadAvail = topicData?.payload_available || 'online';
    const isAvailable = payload === payloadAvail;

    for (const device of this.discoveredDevices.values()) {
      if (device.entities.has(entityId)) {
        const entity = device.entities.get(entityId);
        if (entity.available !== isAvailable) {
          entity.available = isAvailable;
          this.emitDebouncedUpdate();
        }
        return;
      }
    }
  }

  removeEntityByTopic(configTopic) {
    const entry = this.configTopicToEntityId.get(configTopic);
    if (!entry) return;

    if (entry.isDeviceRoot) {
      // Remove all entities belonging to this device root
      const device = this.discoveredDevices.get(entry.deviceId);
      if (device) {
        for (const entityId of device.entities.keys()) {
          this._cleanupEntityAvailability(entityId);
        }
        device.entities.clear();
        this.discoveredDevices.delete(entry.deviceId);
      }
      // Also clean up all composite keys for this device root
      for (const [key] of this.configTopicToEntityId.entries()) {
        if (key.startsWith(`${configTopic}::`)) {
          this.configTopicToEntityId.delete(key);
        }
      }
    } else {
      const { deviceId, entityId } = entry;
      const device = this.discoveredDevices.get(deviceId);

      if (device?.entities.has(entityId)) {
        this._cleanupEntityAvailability(entityId);
        device.entities.delete(entityId);
        if (device.entities.size === 0) {
          this.discoveredDevices.delete(deviceId);
        }
      }
    }

    this.configTopicToEntityId.delete(configTopic);
    this.emitDebouncedUpdate();
  }

  _cleanupEntityAvailability(entityId) {
    for (const [availTopic, data] of this.availabilityTopics.entries()) {
      if (data.entities.has(entityId)) {
        data.entities.delete(entityId);
        if (data.entities.size === 0) {
          connectionManager.unsubscribeFromTopic(data.brokerId, availTopic);
          this.availabilityTopics.delete(availTopic);
        }
      }
    }
  }

  getDiscoveredDevices() {
    return Array.from(this.discoveredDevices.values()).map(device => ({
      ...device,
      entities: Array.from(device.entities.values()),
    }));
  }
}

const discoveryServiceInstance = new DiscoveryService();
export default discoveryServiceInstance;