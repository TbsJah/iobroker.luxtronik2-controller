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
var notificationManager_exports = {};
__export(notificationManager_exports, {
  checkAndSendErrorNotifications: () => checkAndSendErrorNotifications,
  handleTestMessage: () => handleTestMessage,
  sendTelegramNotification: () => sendTelegramNotification
});
module.exports = __toCommonJS(notificationManager_exports);
var import_logger = require("./logger");
var import_stateMapping = require("./stateMapping");
function sendTelegramNotification(adapter, message) {
  const config = adapter.config;
  if (config.telegram_enabled && config.telegram_instance) {
    const sendObj = { text: message };
    if (config.telegram_receiver && config.telegram_receiver.trim() !== "") {
      const receiver = config.telegram_receiver.trim();
      if (/^-?\d+$/.test(receiver)) {
        sendObj.chatId = parseInt(receiver, 10);
      } else {
        sendObj.user = receiver;
      }
    }
    void adapter.sendTo(config.telegram_instance, "send", sendObj);
    (0, import_logger.writeLog)(`Telegram-Nachricht gesendet an ${config.telegram_instance}`, "debug");
  }
}
async function handleTestMessage(adapter, obj) {
  try {
    (0, import_logger.writeLog)("Test-Button empfangen!", "info");
    const config = adapter.config;
    const isTelegramActive = config.telegram_enabled === true && config.telegram_instance && config.telegram_instance !== "none";
    const isIoBrokerNotifyActive = config.notification_bell === true;
    if (!isTelegramActive && !isIoBrokerNotifyActive) {
      if (obj.callback) {
        void adapter.sendTo(
          obj.from,
          obj.command,
          {
            error: "Fehler: Weder Telegram noch Glocke sind aktiv gespeichert! Bitte erst SPEICHERN klicken."
          },
          obj.callback
        );
      }
      return;
    }
    const lastErrorState = await adapter.getStateAsync((0, import_stateMapping.getDpPath)("Fehlerspeicher"));
    let msg = "";
    if (lastErrorState && typeof lastErrorState.val === "string") {
      try {
        const errorList = JSON.parse(lastErrorState.val);
        if (Array.isArray(errorList) && errorList.length > 0) {
          const newestError = errorList[0];
          msg = "\u{1F6A8} *Test-Alarm: Fehlerspeicher*\n\n";
          msg += `Aktuellster Fehler:
Code: ${newestError.code}
Fehler: ${newestError.beschreibung}
Datum: ${newestError.datum}

`;
          if (errorList.length > 1) {
            msg += `Historie:
`;
            for (let i = 1; i < errorList.length; i++) {
              msg += `Datum: ${errorList[i].datum} 
Code: ${errorList[i].code}
Fehler: ${errorList[i].beschreibung}

`;
            }
          }
        }
      } catch (parseErr) {
        (0, import_logger.writeLog)(`JSON Parse-Fehler beim Test-Button: ${parseErr.message}`, "debug");
      }
    }
    if (msg === "") {
      msg = "\u2705 *Erfolgreicher Test*\n\nDies ist eine generierte Test-Nachricht. Die Kommunikation zu Telegram und ioBroker funktioniert einwandfrei! (Es liegen aktuell keine echten Heizungsfehler vor).";
    }
    const successMessages = [];
    if (isIoBrokerNotifyActive) {
      if (typeof adapter.registerNotification === "function") {
        await adapter.registerNotification("luxtronik2-controller", "lwpError", msg);
        (0, import_logger.writeLog)("Test-Benachrichtigung an ioBroker-Glocke gesendet.", "info");
        successMessages.push("Glocke");
      }
    }
    if (isTelegramActive) {
      sendTelegramNotification(adapter, msg);
      (0, import_logger.writeLog)(`Test-Fehlermeldung via Telegram versendet an ${config.telegram_instance}.`, "info");
      successMessages.push("Telegram");
    }
    if (obj.callback) {
      void adapter.sendTo(
        obj.from,
        obj.command,
        { result: `Erfolgreich ausgel\xF6st: ${successMessages.join(" & ")}` },
        obj.callback
      );
    }
  } catch (err) {
    (0, import_logger.writeLog)(`Fehler beim Test-Button: ${err.message}`, "error");
    if (obj.callback) {
      void adapter.sendTo(obj.from, obj.command, { error: `Skriptfehler: ${err.message}` }, obj.callback);
    }
  }
}
async function checkAndSendErrorNotifications(adapter, oldFehlerVal, newFehlerVal) {
  if (newFehlerVal && newFehlerVal !== oldFehlerVal) {
    try {
      const oldList = oldFehlerVal ? JSON.parse(oldFehlerVal) : [];
      const newList = JSON.parse(newFehlerVal);
      if (newList.length > 0) {
        const newestError = newList[0];
        const oldNewestError = oldList.length > 0 ? oldList[0] : null;
        if (!oldNewestError || newestError.timestamp !== oldNewestError.timestamp) {
          const msg = `\u{1F6A8} *St\xF6rung W\xE4rmepumpe!*
Ein Fehler an der W\xE4rmepumpe wurde registriert:

*Code:* ${newestError.code}
*Fehler:* ${newestError.beschreibung}
*Datum:* ${newestError.datum}`;
          const currentErrorTimestamp = newestError.timestamp;
          const currentErrorCode = newestError.code;
          if (adapter.lastKnownErrorTimestamp === null) {
            if (currentErrorTimestamp !== void 0) {
              adapter.lastKnownErrorTimestamp = currentErrorTimestamp;
            }
          } else if (currentErrorTimestamp !== void 0 && currentErrorTimestamp > adapter.lastKnownErrorTimestamp) {
            adapter.lastKnownErrorTimestamp = currentErrorTimestamp;
            if (currentErrorCode !== 0) {
              sendTelegramNotification(adapter, msg);
              const config = adapter.config;
              if (config.notification_bell) {
                if (typeof adapter.registerNotification === "function") {
                  await adapter.registerNotification("luxtronik2-controller", "lwpError", msg);
                } else {
                  (0, import_logger.writeLog)(
                    `\u{1F6A8} W\xE4rmepumpen-Fehler: Code ${newestError.code} - ${newestError.beschreibung}`,
                    "warn"
                  );
                }
              }
            }
          }
        }
      }
    } catch {
      (0, import_logger.writeLog)("Konnte Fehlerhistorie f\xFCr Benachrichtigungen nicht parsen.", "debug");
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkAndSendErrorNotifications,
  handleTestMessage,
  sendTelegramNotification
});
//# sourceMappingURL=notificationManager.js.map
