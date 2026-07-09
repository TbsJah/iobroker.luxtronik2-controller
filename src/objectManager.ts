import { writeLog } from './logger';
import { STATE_MAPPING } from './stateMapping';

// =========================================================
// ZENTRALE FILTER-LOGIK
// =========================================================
/**
 * Checks whether a state is enabled based on its definition and the current configuration.
 *
 * @param key - The state key to evaluate.
 * @param definition - The state definition object.
 * @param config - The adapter configuration.
 * @returns True if the state is enabled, otherwise false.
 */
export function isStateEnabled(key: string, definition: any, config: Record<string, any>): boolean {
	if (definition.required) {
		return true;
	}

	const configKey = `sync_${key}`;
	let isEnabled = true;

	if (config[configKey] === false || String(config[configKey]) === 'false') {
		isEnabled = false;
	}

	if (key.startsWith('HZ_MoSo_')) {
		isEnabled = config.sync_heatingOperationTimerTableWeek !== false;
	} else if (key.startsWith('HZ_MoFr_') || key.startsWith('HZ_SaSo_')) {
		isEnabled = config.sync_heatingOperationTimerTable52MonFri !== false;
	} else if (key.startsWith('HZ_Montag_')) {
		isEnabled = config.sync_heatingOperationTimerTableDayMonday !== false;
	} else if (key.startsWith('HZ_Dienstag_')) {
		isEnabled = config.sync_heatingOperationTimerTableDayTuesday !== false;
	} else if (key.startsWith('HZ_Mittwoch_')) {
		isEnabled = config.sync_heatingOperationTimerTableDayWednesday !== false;
	} else if (key.startsWith('HZ_Donnerstag_')) {
		isEnabled = config.sync_heatingOperationTimerTableDayThursday !== false;
	} else if (key.startsWith('HZ_Freitag_')) {
		isEnabled = config.sync_heatingOperationTimerTableDayFriday !== false;
	} else if (key.startsWith('HZ_Samstag_')) {
		isEnabled = config.sync_heatingOperationTimerTableDaySaturday !== false;
	} else if (key.startsWith('HZ_Sonntag_')) {
		isEnabled = config.sync_heatingOperationTimerTableDaySunday !== false;
	} else if (key.startsWith('WW_MoSo_')) {
		isEnabled = config.sync_hotWaterTableWeek !== false;
	} else if (key.startsWith('WW_MoFr_') || key.startsWith('WW_SaSo_')) {
		isEnabled = config.sync_hotWaterTable52MonFri !== false;
	} else if (key.startsWith('WW_Montag_')) {
		isEnabled = config.sync_hotWaterTableDayMonday !== false;
	} else if (key.startsWith('WW_Dienstag_')) {
		isEnabled = config.sync_hotWaterTableDayTuesday !== false;
	} else if (key.startsWith('WW_Mittwoch_')) {
		isEnabled = config.sync_hotWaterTableDayWednesday !== false;
	} else if (key.startsWith('WW_Donnerstag_')) {
		isEnabled = config.sync_hotWaterTableDayThursday !== false;
	} else if (key.startsWith('WW_Freitag_')) {
		isEnabled = config.sync_hotWaterTableDayFriday !== false;
	} else if (key.startsWith('WW_Samstag_')) {
		isEnabled = config.sync_hotWaterTableDaySaturday !== false;
	} else if (key.startsWith('WW_Sonntag_')) {
		isEnabled = config.sync_hotWaterTableDaySunday !== false;
	} else if (key.startsWith('Zirkulation_MoSo_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTableWeek !== false;
	} else if (key.startsWith('Zirkulation_MoFr_') || key.startsWith('Zirkulation_SaSo_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTable52MonFri !== false;
	} else if (key.startsWith('Zirkulation_Montag_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTableDayMonday !== false;
	} else if (key.startsWith('Zirkulation_Dienstag_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTableDayTuesday !== false;
	} else if (key.startsWith('Zirkulation_Mittwoch_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTableDayWednesday !== false;
	} else if (key.startsWith('Zirkulation_Donnerstag_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTableDayThursday !== false;
	} else if (key.startsWith('Zirkulation_Freitag_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTableDayFriday !== false;
	} else if (key.startsWith('Zirkulation_Samstag_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTableDaySaturday !== false;
	} else if (key.startsWith('Zirkulation_Sonntag_')) {
		isEnabled = config.sync_hotWaterCircPumpTimerTableDaySunday !== false;
	}

	return isEnabled;
}

/**
 * Sanitize a string to a valid object name.
 *
 * @param name Input name to sanitize.
 * @returns Sanitized name.
 */
export function sanitizeName(name: string): string {
	return name
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/Ä/g, 'Ae')
		.replace(/Ö/g, 'Oe')
		.replace(/Ü/g, 'Ue')
		.replace(/ß/g, 'ss')
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '');
}

// =========================================================
// MÜLLABFUHR
// =========================================================
/**
 * Clean up states that are no longer active or enabled.
 *
 * @param adapter The ioBroker adapter instance.
 */
export async function cleanupStates(adapter: any): Promise<void> {
	const config = adapter.config as Record<string, any>;
	const activeStateIds = new Set<string>();
	for (const [key, definition] of Object.entries(STATE_MAPPING)) {
		if (isStateEnabled(key, definition, config)) {
			activeStateIds.add(`${definition.folder}.${key}`);
		}
	}

	try {
		const objects = await adapter.getAdapterObjectsAsync();
		for (const fullId in objects) {
			const obj = objects[fullId];
			if (obj && obj.type === 'state') {
				const localId = fullId.replace(`${adapter.namespace}.`, '');
				if (localId.startsWith('Benutzer.')) {
					continue;
				}
				if (!activeStateIds.has(localId)) {
					await adapter.delStateAsync(localId).catch(() => {});
					await adapter.delObjectAsync(localId).catch(() => {});
					adapter.createdStates.delete(localId);
					writeLog(
						`Datenpunkt '${localId}' ist abgewählt oder im Code gelöscht -> rigoros entfernt.`,
						'info',
					);
				}
			}
		}
	} catch (err: any) {
		writeLog(`Fehler beim Aufräumen von alten Datenpunkten: ${err.message}`, 'debug');
	}
}

/**
 * Removes empty folders from the adapter's object tree
 *
 * @param adapter - The adapter instance
 */
export async function cleanupEmptyFolders(adapter: any): Promise<void> {
	try {
		const objects = await adapter.getAdapterObjectsAsync();
		const allIds = Object.keys(objects);
		const folderIds = allIds.filter(id => {
			const type = objects[id]?.type;
			return type === 'channel' || type === 'folder' || type === 'device';
		});

		folderIds.sort((a, b) => b.length - a.length);

		for (const fullId of folderIds) {
			if (fullId === adapter.namespace) {
				continue;
			}
			const prefix = `${fullId}.`;
			const hasChildren = allIds.some(id => id !== fullId && id.startsWith(prefix) && objects[id] !== undefined);

			if (!hasChildren) {
				const localId = fullId.replace(`${adapter.namespace}.`, '');
				await adapter.delObjectAsync(localId).catch(() => {});
				writeLog(`Leerer Ordner '${localId}' wurde aus dem Objektbaum aufgeräumt.`, 'info');
				objects[fullId] = undefined as any;
			}
		}
	} catch (err: any) {
		writeLog(`Fehler beim Aufräumen leerer Ordner: ${err.message}`, 'debug');
	}
}

/**
 *
 * Cleans up custom states that are no longer active.
 *
 * @param adapter - The adapter instance
 */
export async function cleanupCustomStates(adapter: any): Promise<void> {
	const config = adapter.config as Record<string, any>;
	const customStates = (config.custom_states as any[]) || [];
	const activeIds = customStates
		.filter(c => c.active && c.luxId !== undefined && c.name)
		.map(c => `Benutzer.${sanitizeName(c.name)}`);

	try {
		const objects = await adapter.getAdapterObjectsAsync();
		for (const id in objects) {
			if (id.startsWith(`${adapter.namespace}.Benutzer.`)) {
				const shortId = id.replace(`${adapter.namespace}.`, '');
				if (shortId === 'Benutzer') {
					continue;
				}

				if (!activeIds.includes(shortId)) {
					await adapter.delStateAsync(shortId).catch(() => {});
					await adapter.delObjectAsync(shortId).catch(() => {});
					adapter.createdStates.delete(shortId);
					writeLog(`Benutzerdefinierter Datenpunkt '${shortId}' entfernt.`, 'info');
				}
			}
		}
	} catch (err: any) {
		writeLog(`Fehler beim Aufräumen benutzerdefinierter Werte: ${err.message}`, 'debug');
	}
}

// =========================================================
// OBJEKTE ANLEGEN
// =========================================================
/**
 * Ensures all configured objects exist in the adapter
 *
 * @param adapter The adapter instance
 */
export async function ensureAllObjectsExist(adapter: any): Promise<void> {
	const config = adapter.config as Record<string, any>;
	try {
		const existingObjects = await adapter.getAdapterObjectsAsync();

		for (const [key, definition] of Object.entries(STATE_MAPPING)) {
			if (!isStateEnabled(key, definition, config)) {
				continue;
			}

			const stateId = `${definition.folder}.${key}`;
			const fullId = `${adapter.namespace}.${stateId}`;

			let targetType: any = definition.type === 'json' ? 'string' : definition.type;
			if (definition.unit === 's' && definition.type === 'number') {
				targetType = 'string';
			}
			if (definition.role && ['value.datetime', 'value.time', 'date'].includes(definition.role)) {
				targetType = 'string';
			}

			const commonDef: any = {
				name: definition.name,
				type: targetType,
				role: definition.role,
				unit: definition.unit || '',
				read: true,
				write: definition.write || false,
				min: definition.min,
				max: definition.max,
				states: definition.states,
			};

			const existingObj = existingObjects[fullId];

			if (!existingObj) {
				const folderParts = definition.folder.split('.');
				let currentFolder = '';
				for (const part of folderParts) {
					currentFolder = currentFolder === '' ? part : `${currentFolder}.${part}`;
					await adapter.setObjectNotExistsAsync(currentFolder, {
						type: currentFolder.includes('.') ? 'channel' : 'folder',
						common: { name: part },
						native: {},
					});
				}
				await adapter.setObjectNotExistsAsync(stateId, { type: 'state', common: commonDef, native: {} });
			} else {
				let needsUpdate = false;
				const existingCommon = existingObj.common;

				if (existingCommon.type !== targetType) {
					needsUpdate = true;
				}
				if (existingCommon.role !== definition.role) {
					needsUpdate = true;
				}
				if ((existingCommon.unit || '') !== (definition.unit || '')) {
					needsUpdate = true;
				}

				if (needsUpdate) {
					await adapter.extendObjectAsync(stateId, { common: commonDef });
					writeLog(
						`Typ-Korrektur: '${stateId}' wurde repariert (Typ/Einheit aktualisiert auf '${targetType}').`,
						'info',
					);
				}
			}

			if (definition.write) {
				adapter.subscribeStates(stateId);
			}
			adapter.createdStates.add(stateId);

			if (definition.folder === 'Aktionen') {
				const currentState = await adapter.getStateAsync(stateId);
				if (!currentState) {
					await adapter.setStateAsync(stateId, {
						val: definition.def !== undefined ? definition.def : false,
						ack: true,
					});
				} else if (currentState.ack === false) {
					const valToSet = definition.role === 'button' ? false : currentState.val;
					await adapter.setStateAsync(stateId, { val: valToSet, ack: true });
				}
			}
		}
	} catch (err: any) {
		writeLog(`Fehler bei der Objektüberprüfung: ${err.message}`, 'error');
	}
}

/**
 * Ensures custom objects exist in ioBroker.
 *
 * @param adapter - The ioBroker adapter instance
 */
export async function ensureCustomObjectsExist(adapter: any): Promise<void> {
	const config = adapter.config as Record<string, any>;
	const customStates = (config.custom_states as any[]) || [];

	if (customStates.some(c => c.active)) {
		await adapter.setObjectNotExistsAsync('Benutzer', {
			type: 'channel',
			common: { name: 'Benutzerdefinierte Werte' },
			native: {},
		});
	}

	for (const custom of customStates) {
		if (!custom.active || custom.luxId === undefined || !custom.name) {
			continue;
		}

		const stateId = `Benutzer.${sanitizeName(custom.name)}`;
		let role = 'state';
		let targetType = custom.type || 'string';

		if (custom.type === 'number') {
			role = 'value';
		} else if (custom.type === 'string') {
			role = 'text';
		} else if (custom.type === 'boolean') {
			role = 'indicator';
		} else if (custom.type === 'datetime') {
			role = 'value.datetime';
			targetType = 'string';
		}

		const isWritable = custom.source === 'parameter';
		const objDef = {
			type: 'state' as const,
			common: {
				name: custom.name,
				type: targetType,
				role: role,
				unit: custom.unit || '',
				read: true,
				write: isWritable,
			},
			native: {
				luxId: custom.luxId,
				source: custom.source,
				factor: custom.factor || null,
				customType: custom.type,
			},
		};

		if (!adapter.createdStates.has(stateId)) {
			await adapter.setObjectNotExistsAsync(stateId, objDef);
			adapter.createdStates.add(stateId);
		}
		await adapter.extendObjectAsync(stateId, { common: objDef.common, native: objDef.native });
	}
}
