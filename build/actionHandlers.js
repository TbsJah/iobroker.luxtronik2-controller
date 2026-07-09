"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var actionHandlers_exports = {};
__export(actionHandlers_exports, {
  handleActivateZip: () => handleActivateZip,
  handleZwangsheizen: () => handleZwangsheizen,
  handleZwangswarmwasser: () => handleZwangswarmwasser
});
module.exports = __toCommonJS(actionHandlers_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
async function handleZwangswarmwasser(adapter, id) {
  await adapter.setForeignStateAsync(id, { val: false, ack: true });
  const wwIstState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist"));
  const wwSollState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll"));
  const wwIst = typeof (wwIstState == null ? void 0 : wwIstState.val) === "number" ? wwIstState.val : 0;
  const wwSoll = typeof (wwSollState == null ? void 0 : wwSollState.val) === "number" ? wwSollState.val : 0;
  if (wwIst < wwSoll - 1) {
    await adapter.syncConfigValue("hotWaterTemperatureHysteresis", 1);
    (0, import_logger.writeLog)(
      `Zwangswarmwasser ausgel\xF6st: Ist (${wwIst}\xB0C) < Soll-1 (${wwSoll - 1}\xB0C). Hysterese auf 1K gesetzt.`,
      "info"
    );
  } else {
    (0, import_logger.writeLog)(`Zwangswarmwasser ignoriert: Ist (${wwIst}\xB0C) ist bereits ausreichend (Soll: ${wwSoll}\xB0C).`, "info");
  }
}
async function handleZwangsheizen(adapter, id) {
  await adapter.setForeignStateAsync(id, { val: false, ack: true });
  const [bzState, ruecklaufState, ruecklaufSollState, hystereseState] = await Promise.all([
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_target_return")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("returnTemperatureHysteresis"))
  ]);
  const bzVal = bzState && bzState.val !== null ? Number(bzState.val) : -1;
  const ruecklauf = typeof (ruecklaufState == null ? void 0 : ruecklaufState.val) === "number" ? ruecklaufState.val : 0;
  const ruecklaufSoll = typeof (ruecklaufSollState == null ? void 0 : ruecklaufSollState.val) === "number" ? ruecklaufSollState.val : 0;
  const hysterese = typeof (hystereseState == null ? void 0 : hystereseState.val) === "number" ? hystereseState.val : 0;
  if (bzVal === 5) {
    if (ruecklauf < ruecklaufSoll + hysterese) {
      await adapter.syncConfigValue("heating_curve_parallel_offset", 35);
      (0, import_logger.writeLog)(`Zwangsheizen ausgel\xF6st. Fusspunkt tempor\xE4r auf 35\xB0C gesetzt.`, "info");
    } else {
      (0, import_logger.writeLog)(`Zwangsheizen ignoriert: R\xFCcklauf hoch genug.`, "info");
    }
  } else {
    (0, import_logger.writeLog)(`Zwangsheizen ignoriert: Anlage ist nicht im Leerlauf.`, "info");
  }
}
async function handleActivateZip(adapter, id, durationSeconds) {
  await adapter.setForeignStateAsync(id, { val: true, ack: true });
  if (durationSeconds <= 0) {
    await adapter.setForeignStateAsync(id, { val: false, ack: true });
    return;
  }
  const bzState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("WP_BZ_akt"));
  const bzVal = bzState ? Number(bzState.val) : 5;
  const [wwIstS, wwSollS, wwHystS, rLState, rSollState, hzHystState] = await Promise.all([
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Ist")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("Wamwassertemperatur_Soll")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("hotWaterTemperatureHysteresis")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_return")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("temperature_target_return")),
    adapter.getStateAsync((0, import_stateMapping.getDpPath)("returnTemperatureHysteresis"))
  ]);
  const useDeaeration = bzVal === 5 && Number(wwIstS == null ? void 0 : wwIstS.val) > Number(wwSollS == null ? void 0 : wwSollS.val) - Number(wwHystS == null ? void 0 : wwHystS.val) && Number(rLState == null ? void 0 : rLState.val) > Number(rSollState == null ? void 0 : rSollState.val) - Number(hzHystState == null ? void 0 : hzHystState.val);
  if (adapter.zipTimer) {
    clearTimeout(adapter.zipTimer);
    adapter.zipTimer = void 0;
  }
  if (useDeaeration) {
    await adapter.queueWrite(158, 1);
    await new Promise((r) => setTimeout(r, 100));
    await adapter.queueWrite(684, 1);
    await adapter.syncConfigValue("runDeaerate", 1);
    await adapter.syncConfigValue("hotWaterCircPumpDeaerate", 1);
  } else {
    const onTimeMinutes = Math.ceil(durationSeconds / 60);
    if (!adapter.originalZipConfig) {
      const keysToSave = [
        "hotWaterCircPumpTimerTableSelected",
        "WW_MoSo_Start1",
        "WW_MoSo_End1",
        "WW_MoSo_Start2",
        "WW_MoSo_End2",
        "WW_MoSo_Start3",
        "WW_MoSo_End3",
        "WW_MoSo_Start4",
        "WW_MoSo_End4",
        "WW_MoSo_Start5",
        "WW_MoSo_End5",
        "hotWaterCircPumpOnTime",
        "hotWaterCircPumpOffTime"
      ];
      adapter.originalZipConfig = {};
      for (const k of keysToSave) {
        const s = await adapter.getStateAsync((0, import_stateMapping.getDpPath)(k));
        adapter.originalZipConfig[k] = s ? s.val : null;
      }
    }
    const updates = [
      { key: "hotWaterCircPumpTimerTableSelected", raw: 0 },
      { key: "WW_MoSo_Start1", raw: 0 },
      { key: "WW_MoSo_End1", raw: 86340 },
      { key: "WW_MoSo_Start2", raw: 0 },
      { key: "WW_MoSo_End2", raw: 0 },
      { key: "hotWaterCircPumpOnTime", raw: onTimeMinutes },
      { key: "hotWaterCircPumpOffTime", raw: 60 }
    ];
    for (const u of updates) {
      await adapter.queueWrite(parseInt(import_stateMapping.STATE_MAPPING[u.key].luxWriteId, 10), u.raw);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  adapter.zipTimer = setTimeout(async () => {
    await adapter.stopZipAndDeaeration();
  }, durationSeconds * 1e3);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleActivateZip,
  handleZwangsheizen,
  handleZwangswarmwasser
});
//# sourceMappingURL=actionHandlers.js.map
