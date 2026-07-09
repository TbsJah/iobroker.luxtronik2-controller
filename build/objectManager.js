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
var objectManager_exports = {};
__export(objectManager_exports, {
  cleanupCustomStates: () => cleanupCustomStates,
  cleanupEmptyFolders: () => cleanupEmptyFolders,
  cleanupStates: () => cleanupStates,
  ensureAllObjectsExist: () => ensureAllObjectsExist,
  ensureCustomObjectsExist: () => ensureCustomObjectsExist,
  isStateEnabled: () => isStateEnabled,
  sanitizeName: () => sanitizeName
});
module.exports = __toCommonJS(objectManager_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
function isStateEnabled(key, definition, config) {
  if (definition.required) {
    return true;
  }
  const configKey = `sync_${key}`;
  let isEnabled = true;
  if (config[configKey] === false || String(config[configKey]) === "false") {
    isEnabled = false;
  }
  if (key.startsWith("HZ_MoSo_")) {
    isEnabled = config.sync_heatingOperationTimerTableWeek !== false;
  } else if (key.startsWith("HZ_MoFr_") || key.startsWith("HZ_SaSo_")) {
    isEnabled = config.sync_heatingOperationTimerTable52MonFri !== false;
  } else if (key.startsWith("HZ_Montag_")) {
    isEnabled = config.sync_heatingOperationTimerTableDayMonday !== false;
  } else if (key.startsWith("HZ_Dienstag_")) {
    isEnabled = config.sync_heatingOperationTimerTableDayTuesday !== false;
  } else if (key.startsWith("HZ_Mittwoch_")) {
    isEnabled = config.sync_heatingOperationTimerTableDayWednesday !== false;
  } else if (key.startsWith("HZ_Donnerstag_")) {
    isEnabled = config.sync_heatingOperationTimerTableDayThursday !== false;
  } else if (key.startsWith("HZ_Freitag_")) {
    isEnabled = config.sync_heatingOperationTimerTableDayFriday !== false;
  } else if (key.startsWith("HZ_Samstag_")) {
    isEnabled = config.sync_heatingOperationTimerTableDaySaturday !== false;
  } else if (key.startsWith("HZ_Sonntag_")) {
    isEnabled = config.sync_heatingOperationTimerTableDaySunday !== false;
  } else if (key.startsWith("WW_MoSo_")) {
    isEnabled = config.sync_hotWaterTableWeek !== false;
  } else if (key.startsWith("WW_MoFr_") || key.startsWith("WW_SaSo_")) {
    isEnabled = config.sync_hotWaterTable52MonFri !== false;
  } else if (key.startsWith("WW_Montag_")) {
    isEnabled = config.sync_hotWaterTableDayMonday !== false;
  } else if (key.startsWith("WW_Dienstag_")) {
    isEnabled = config.sync_hotWaterTableDayTuesday !== false;
  } else if (key.startsWith("WW_Mittwoch_")) {
    isEnabled = config.sync_hotWaterTableDayWednesday !== false;
  } else if (key.startsWith("WW_Donnerstag_")) {
    isEnabled = config.sync_hotWaterTableDayThursday !== false;
  } else if (key.startsWith("WW_Freitag_")) {
    isEnabled = config.sync_hotWaterTableDayFriday !== false;
  } else if (key.startsWith("WW_Samstag_")) {
    isEnabled = config.sync_hotWaterTableDaySaturday !== false;
  } else if (key.startsWith("WW_Sonntag_")) {
    isEnabled = config.sync_hotWaterTableDaySunday !== false;
  } else if (key.startsWith("Zirkulation_MoSo_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTableWeek !== false;
  } else if (key.startsWith("Zirkulation_MoFr_") || key.startsWith("Zirkulation_SaSo_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTable52MonFri !== false;
  } else if (key.startsWith("Zirkulation_Montag_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTableDayMonday !== false;
  } else if (key.startsWith("Zirkulation_Dienstag_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTableDayTuesday !== false;
  } else if (key.startsWith("Zirkulation_Mittwoch_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTableDayWednesday !== false;
  } else if (key.startsWith("Zirkulation_Donnerstag_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTableDayThursday !== false;
  } else if (key.startsWith("Zirkulation_Freitag_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTableDayFriday !== false;
  } else if (key.startsWith("Zirkulation_Samstag_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTableDaySaturday !== false;
  } else if (key.startsWith("Zirkulation_Sonntag_")) {
    isEnabled = config.sync_hotWaterCircPumpTimerTableDaySunday !== false;
  }
  return isEnabled;
}
function sanitizeName(name) {
  return name.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss").replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}
async function cleanupStates(adapter) {
  const config = adapter.config;
  const activeStateIds = /* @__PURE__ */ new Set();
  for (const [key, definition] of Object.entries(import_stateMapping.STATE_MAPPING)) {
    if (isStateEnabled(key, definition, config)) {
      activeStateIds.add(`${definition.folder}.${key}`);
    }
  }
  try {
    const objects = await adapter.getAdapterObjectsAsync();
    for (const fullId in objects) {
      const obj = objects[fullId];
      if (obj && obj.type === "state") {
        const localId = fullId.replace(`${adapter.namespace}.`, "");
        if (localId.startsWith("Benutzer.")) {
          continue;
        }
        if (!activeStateIds.has(localId)) {
          await adapter.delStateAsync(localId).catch(() => {
          });
          await adapter.delObjectAsync(localId).catch(() => {
          });
          adapter.createdStates.delete(localId);
          (0, import_logger.writeLog)(
            `Datenpunkt '${localId}' ist abgew\xE4hlt oder im Code gel\xF6scht -> rigoros entfernt.`,
            "info"
          );
        }
      }
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Aufr\xE4umen von alten Datenpunkten: ${err.message}`, "debug");
  }
}
async function cleanupEmptyFolders(adapter) {
  try {
    const objects = await adapter.getAdapterObjectsAsync();
    const allIds = Object.keys(objects);
    const folderIds = allIds.filter((id) => {
      var _a;
      const type = (_a = objects[id]) == null ? void 0 : _a.type;
      return type === "channel" || type === "folder" || type === "device";
    });
    folderIds.sort((a, b) => b.length - a.length);
    for (const fullId of folderIds) {
      if (fullId === adapter.namespace) {
        continue;
      }
      const prefix = `${fullId}.`;
      const hasChildren = allIds.some((id) => id !== fullId && id.startsWith(prefix) && objects[id] !== void 0);
      if (!hasChildren) {
        const localId = fullId.replace(`${adapter.namespace}.`, "");
        await adapter.delObjectAsync(localId).catch(() => {
        });
        (0, import_logger.writeLog)(`Leerer Ordner '${localId}' wurde aus dem Objektbaum aufger\xE4umt.`, "info");
        objects[fullId] = void 0;
      }
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Aufr\xE4umen leerer Ordner: ${err.message}`, "debug");
  }
}
async function cleanupCustomStates(adapter) {
  const config = adapter.config;
  const customStates = config.custom_states || [];
  const activeIds = customStates.filter((c) => c.active && c.luxId !== void 0 && c.name).map((c) => `Benutzer.${sanitizeName(c.name)}`);
  try {
    const objects = await adapter.getAdapterObjectsAsync();
    for (const id in objects) {
      if (id.startsWith(`${adapter.namespace}.Benutzer.`)) {
        const shortId = id.replace(`${adapter.namespace}.`, "");
        if (shortId === "Benutzer") {
          continue;
        }
        if (!activeIds.includes(shortId)) {
          await adapter.delStateAsync(shortId).catch(() => {
          });
          await adapter.delObjectAsync(shortId).catch(() => {
          });
          adapter.createdStates.delete(shortId);
          (0, import_logger.writeLog)(`Benutzerdefinierter Datenpunkt '${shortId}' entfernt.`, "info");
        }
      }
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Aufr\xE4umen benutzerdefinierter Werte: ${err.message}`, "debug");
  }
}
async function ensureAllObjectsExist(adapter) {
  const config = adapter.config;
  try {
    const existingObjects = await adapter.getAdapterObjectsAsync();
    for (const [key, definition] of Object.entries(import_stateMapping.STATE_MAPPING)) {
      if (!isStateEnabled(key, definition, config)) {
        continue;
      }
      const stateId = `${definition.folder}.${key}`;
      const fullId = `${adapter.namespace}.${stateId}`;
      let targetType = definition.type === "json" ? "string" : definition.type;
      if (definition.unit === "s" && definition.type === "number") {
        targetType = "string";
      }
      if (definition.role && ["value.datetime", "value.time", "date"].includes(definition.role)) {
        targetType = "string";
      }
      const commonDef = {
        name: definition.name,
        type: targetType,
        role: definition.role,
        unit: definition.unit || "",
        read: true,
        write: definition.write || false,
        min: definition.min,
        max: definition.max,
        states: definition.states
      };
      const existingObj = existingObjects[fullId];
      if (!existingObj) {
        const folderParts = definition.folder.split(".");
        let currentFolder = "";
        for (const part of folderParts) {
          currentFolder = currentFolder === "" ? part : `${currentFolder}.${part}`;
          await adapter.setObjectNotExistsAsync(currentFolder, {
            type: currentFolder.includes(".") ? "channel" : "folder",
            common: { name: part },
            native: {}
          });
        }
        await adapter.setObjectNotExistsAsync(stateId, { type: "state", common: commonDef, native: {} });
      } else {
        let needsUpdate = false;
        const existingCommon = existingObj.common;
        if (existingCommon.type !== targetType) {
          needsUpdate = true;
        }
        if (existingCommon.role !== definition.role) {
          needsUpdate = true;
        }
        if ((existingCommon.unit || "") !== (definition.unit || "")) {
          needsUpdate = true;
        }
        if (needsUpdate) {
          await adapter.extendObjectAsync(stateId, { common: commonDef });
          (0, import_logger.writeLog)(
            `Typ-Korrektur: '${stateId}' wurde repariert (Typ/Einheit aktualisiert auf '${targetType}').`,
            "info"
          );
        }
      }
      if (definition.write) {
        adapter.subscribeStates(stateId);
      }
      adapter.createdStates.add(stateId);
      if (definition.folder === "Aktionen") {
        const currentState = await adapter.getStateAsync(stateId);
        if (!currentState) {
          await adapter.setStateAsync(stateId, {
            val: definition.def !== void 0 ? definition.def : false,
            ack: true
          });
        } else if (currentState.ack === false) {
          const valToSet = definition.role === "button" ? false : currentState.val;
          await adapter.setStateAsync(stateId, { val: valToSet, ack: true });
        }
      }
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler bei der Objekt\xFCberpr\xFCfung: ${err.message}`, "error");
  }
}
async function ensureCustomObjectsExist(adapter) {
  const config = adapter.config;
  const customStates = config.custom_states || [];
  if (customStates.some((c) => c.active)) {
    await adapter.setObjectNotExistsAsync("Benutzer", {
      type: "channel",
      common: { name: "Benutzerdefinierte Werte" },
      native: {}
    });
  }
  for (const custom of customStates) {
    if (!custom.active || custom.luxId === void 0 || !custom.name) {
      continue;
    }
    const stateId = `Benutzer.${sanitizeName(custom.name)}`;
    let role = "state";
    let targetType = custom.type || "string";
    if (custom.type === "number") {
      role = "value";
    } else if (custom.type === "string") {
      role = "text";
    } else if (custom.type === "boolean") {
      role = "indicator";
    } else if (custom.type === "datetime") {
      role = "value.datetime";
      targetType = "string";
    }
    const isWritable = custom.source === "parameter";
    const objDef = {
      type: "state",
      common: {
        name: custom.name,
        type: targetType,
        role,
        unit: custom.unit || "",
        read: true,
        write: isWritable
      },
      native: {
        luxId: custom.luxId,
        source: custom.source,
        factor: custom.factor || null,
        customType: custom.type
      }
    };
    if (!adapter.createdStates.has(stateId)) {
      await adapter.setObjectNotExistsAsync(stateId, objDef);
      adapter.createdStates.add(stateId);
    }
    await adapter.extendObjectAsync(stateId, { common: objDef.common, native: objDef.native });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cleanupCustomStates,
  cleanupEmptyFolders,
  cleanupStates,
  ensureAllObjectsExist,
  ensureCustomObjectsExist,
  isStateEnabled,
  sanitizeName
});
//# sourceMappingURL=objectManager.js.map
