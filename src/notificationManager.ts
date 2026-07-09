import { writeLog } from './logger';
import { getDpPath } from './stateMapping';

// =========================================================
// TELEGRAM NACHRICHT SENDEN
// =========================================================
/**
 * Sends a Telegram notification with the given message.
 *
 * @param adapter - The adapter instance
 * @param message - The message to send
 */
export function sendTelegramNotification(adapter: any, message: string): void {
	const config = adapter.config as Record<string, any>;
	if (config.telegram_enabled && config.telegram_instance) {
		const sendObj: Record<string, any> = { text: message };
		if (config.telegram_receiver && config.telegram_receiver.trim() !== '') {
			const receiver = config.telegram_receiver.trim();
			if (/^-?\d+$/.test(receiver)) {
				sendObj.chatId = parseInt(receiver, 10);
			} else {
				sendObj.user = receiver;
			}
		}
		void adapter.sendTo(config.telegram_instance, 'send', sendObj);
		writeLog(`Telegram-Nachricht gesendet an ${config.telegram_instance}`, 'debug');
	}
}

// =========================================================
// TEST-BUTTON AUS DER OBERFLÄCHE BEHANDELN
// =========================================================
/**
 * Handles test messages from the UI interface.
 *
 * @param adapter - The adapter instance
 * @param obj - The message object
 */
export async function handleTestMessage(adapter: any, obj: ioBroker.Message): Promise<void> {
	try {
		writeLog('Test-Button empfangen!', 'info');
		const config = adapter.config as Record<string, any>;

		const isTelegramActive =
			config.telegram_enabled === true && config.telegram_instance && config.telegram_instance !== 'none';
		const isIoBrokerNotifyActive = config.notification_bell === true;

		if (!isTelegramActive && !isIoBrokerNotifyActive) {
			if (obj.callback) {
				void adapter.sendTo(
					obj.from,
					obj.command,
					{
						error: 'Fehler: Weder Telegram noch Glocke sind aktiv gespeichert! Bitte erst SPEICHERN klicken.',
					},
					obj.callback,
				);
			}
			return;
		}

		const lastErrorState = await adapter.getStateAsync(getDpPath('Fehlerspeicher'));
		let msg = '';

		if (lastErrorState && typeof lastErrorState.val === 'string') {
			try {
				const errorList = JSON.parse(lastErrorState.val);
				if (Array.isArray(errorList) && errorList.length > 0) {
					const newestError = errorList[0];
					msg = '🚨 *Test-Alarm: Fehlerspeicher*\n\n';
					msg += `Aktuellster Fehler:\nCode: ${newestError.code}\nFehler: ${newestError.beschreibung}\nDatum: ${newestError.datum}\n\n`;

					if (errorList.length > 1) {
						msg += `Historie:\n`;
						for (let i = 1; i < errorList.length; i++) {
							msg += `Datum: ${errorList[i].datum} \nCode: ${errorList[i].code}\nFehler: ${errorList[i].beschreibung}\n\n`;
						}
					}
				}
			} catch (parseErr: any) {
				writeLog(`JSON Parse-Fehler beim Test-Button: ${parseErr.message}`, 'debug');
			}
		}

		if (msg === '') {
			msg =
				'✅ *Erfolgreicher Test*\n\nDies ist eine generierte Test-Nachricht. Die Kommunikation zu Telegram und ioBroker funktioniert einwandfrei! (Es liegen aktuell keine echten Heizungsfehler vor).';
		}

		const successMessages: string[] = [];

		if (isIoBrokerNotifyActive) {
			if (typeof adapter.registerNotification === 'function') {
				await adapter.registerNotification('luxtronik2-controller', 'lwpError', msg);
				writeLog('Test-Benachrichtigung an ioBroker-Glocke gesendet.', 'info');
				successMessages.push('Glocke');
			}
		}

		if (isTelegramActive) {
			sendTelegramNotification(adapter, msg);
			writeLog(`Test-Fehlermeldung via Telegram versendet an ${config.telegram_instance}.`, 'info');
			successMessages.push('Telegram');
		}

		if (obj.callback) {
			void adapter.sendTo(
				obj.from,
				obj.command,
				{ result: `Erfolgreich ausgelöst: ${successMessages.join(' & ')}` },
				obj.callback,
			);
		}
	} catch (err: any) {
		writeLog(`Fehler beim Test-Button: ${err.message}`, 'error');
		if (obj.callback) {
			void adapter.sendTo(obj.from, obj.command, { error: `Skriptfehler: ${err.message}` }, obj.callback);
		}
	}
}

// =========================================================
// INTELLIGENTER FEHLER-FILTER UND ALARM
// =========================================================
/**
 * Checks for new heat pump errors and sends notifications.
 *
 * @param adapter - The adapter instance
 * @param oldFehlerVal - The previous error list as JSON string
 * @param newFehlerVal - The new error list as JSON string
 */
export async function checkAndSendErrorNotifications(
	adapter: any,
	oldFehlerVal: string | undefined,
	newFehlerVal: string | undefined,
): Promise<void> {
	if (newFehlerVal && newFehlerVal !== oldFehlerVal) {
		try {
			const oldList = oldFehlerVal ? JSON.parse(oldFehlerVal) : [];
			const newList = JSON.parse(newFehlerVal);

			if (newList.length > 0) {
				const newestError = newList[0];
				const oldNewestError = oldList.length > 0 ? oldList[0] : null;

				if (!oldNewestError || newestError.timestamp !== oldNewestError.timestamp) {
					const msg = `🚨 *Störung Wärmepumpe!*\nEin Fehler an der Wärmepumpe wurde registriert:\n\n*Code:* ${newestError.code}\n*Fehler:* ${newestError.beschreibung}\n*Datum:* ${newestError.datum}`;

					const currentErrorTimestamp = newestError.timestamp;
					const currentErrorCode = newestError.code;

					if (adapter.lastKnownErrorTimestamp === null) {
						if (currentErrorTimestamp !== undefined) {
							adapter.lastKnownErrorTimestamp = currentErrorTimestamp;
						}
					} else if (
						currentErrorTimestamp !== undefined &&
						currentErrorTimestamp > adapter.lastKnownErrorTimestamp
					) {
						adapter.lastKnownErrorTimestamp = currentErrorTimestamp;

						if (currentErrorCode !== 0) {
							sendTelegramNotification(adapter, msg);

							const config = adapter.config as Record<string, any>;
							if (config.notification_bell) {
								if (typeof adapter.registerNotification === 'function') {
									await adapter.registerNotification('luxtronik2-controller', 'lwpError', msg);
								} else {
									writeLog(
										`🚨 Wärmepumpen-Fehler: Code ${newestError.code} - ${newestError.beschreibung}`,
										'warn',
									);
								}
							}
						}
					}
				}
			}
		} catch {
			writeLog('Konnte Fehlerhistorie für Benachrichtigungen nicht parsen.', 'debug');
		}
	}
}
