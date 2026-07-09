import { writeLog } from './logger';
import { getDpPath, STATE_MAPPING } from './stateMapping';

/**
 * Handles the forced hot-water action for the heat pump.
 *
 * @param adapter - The adapter instance used to access state and configuration APIs.
 * @param id - The state ID that should be acknowledged and reset.
 * @returns A promise that resolves once the forced hot-water action has been processed.
 */
export async function handleZwangswarmwasser(adapter: any, id: string): Promise<void> {
	await adapter.setForeignStateAsync(id, { val: false, ack: true });

	const wwIstState = await adapter.getStateAsync(getDpPath('Wamwassertemperatur_Ist'));
	const wwSollState = await adapter.getStateAsync(getDpPath('Wamwassertemperatur_Soll'));

	const wwIst = typeof wwIstState?.val === 'number' ? wwIstState.val : 0;
	const wwSoll = typeof wwSollState?.val === 'number' ? wwSollState.val : 0;

	if (wwIst < wwSoll - 1) {
		await adapter.syncConfigValue('hotWaterTemperatureHysteresis', 1);
		writeLog(
			`Zwangswarmwasser ausgelöst: Ist (${wwIst}°C) < Soll-1 (${wwSoll - 1}°C). Hysterese auf 1K gesetzt.`,
			'info',
		);
	} else {
		writeLog(`Zwangswarmwasser ignoriert: Ist (${wwIst}°C) ist bereits ausreichend (Soll: ${wwSoll}°C).`, 'info');
	}
}

/**
 * Handles the forced heating action for the heat pump.
 *
 * @param adapter - The adapter instance used to access state and configuration APIs.
 * @param id - The state ID that should be acknowledged and reset.
 * @returns A promise that resolves once the forced-heating action has been processed.
 */
export async function handleZwangsheizen(adapter: any, id: string): Promise<void> {
	await adapter.setForeignStateAsync(id, { val: false, ack: true });

	const [bzState, ruecklaufState, ruecklaufSollState, hystereseState] = await Promise.all([
		adapter.getStateAsync(getDpPath('WP_BZ_akt')),
		adapter.getStateAsync(getDpPath('temperature_return')),
		adapter.getStateAsync(getDpPath('temperature_target_return')),
		adapter.getStateAsync(getDpPath('returnTemperatureHysteresis')),
	]);

	const bzVal = bzState && bzState.val !== null ? Number(bzState.val) : -1;
	const ruecklauf = typeof ruecklaufState?.val === 'number' ? ruecklaufState.val : 0;
	const ruecklaufSoll = typeof ruecklaufSollState?.val === 'number' ? ruecklaufSollState.val : 0;
	const hysterese = typeof hystereseState?.val === 'number' ? hystereseState.val : 0;

	if (bzVal === 5) {
		if (ruecklauf < ruecklaufSoll + hysterese) {
			await adapter.syncConfigValue('heating_curve_parallel_offset', 35);
			writeLog(`Zwangsheizen ausgelöst. Fusspunkt temporär auf 35°C gesetzt.`, 'info');
		} else {
			writeLog(`Zwangsheizen ignoriert: Rücklauf hoch genug.`, 'info');
		}
	} else {
		writeLog(`Zwangsheizen ignoriert: Anlage ist nicht im Leerlauf.`, 'info');
	}
}

/**
 * Activates the hot-water circulation/venting action for a specified duration.
 *
 * @param adapter - The adapter instance used to access state and configuration APIs.
 * @param id - The state ID that should be acknowledged and toggled.
 * @param durationSeconds - The duration for the ZIP action in seconds.
 * @returns A promise that resolves once the ZIP action has been processed.
 */
export async function handleActivateZip(adapter: any, id: string, durationSeconds: number): Promise<void> {
	await adapter.setForeignStateAsync(id, { val: true, ack: true });

	if (durationSeconds <= 0) {
		await adapter.setForeignStateAsync(id, { val: false, ack: true });
		return;
	}

	const bzState = await adapter.getStateAsync(getDpPath('WP_BZ_akt'));
	const bzVal = bzState ? Number(bzState.val) : 5;

	const [wwIstS, wwSollS, wwHystS, rLState, rSollState, hzHystState] = await Promise.all([
		adapter.getStateAsync(getDpPath('Wamwassertemperatur_Ist')),
		adapter.getStateAsync(getDpPath('Wamwassertemperatur_Soll')),
		adapter.getStateAsync(getDpPath('hotWaterTemperatureHysteresis')),
		adapter.getStateAsync(getDpPath('temperature_return')),
		adapter.getStateAsync(getDpPath('temperature_target_return')),
		adapter.getStateAsync(getDpPath('returnTemperatureHysteresis')),
	]);

	const useDeaeration =
		bzVal === 5 &&
		Number(wwIstS?.val) > Number(wwSollS?.val) - Number(wwHystS?.val) &&
		Number(rLState?.val) > Number(rSollState?.val) - Number(hzHystState?.val);

	if (adapter.zipTimer) {
		clearTimeout(adapter.zipTimer);
		adapter.zipTimer = undefined;
	}

	if (useDeaeration) {
		await adapter.queueWrite(158, 1);
		await new Promise(r => setTimeout(r, 100));
		await adapter.queueWrite(684, 1);
		await adapter.syncConfigValue('runDeaerate', 1);
		await adapter.syncConfigValue('hotWaterCircPumpDeaerate', 1);
	} else {
		const onTimeMinutes = Math.ceil(durationSeconds / 60);
		// Hinweis: originalZipConfig muss nun public im Adapter sein, oder über eine Setter-Methode gesetzt werden
		if (!adapter.originalZipConfig) {
			const keysToSave = [
				'hotWaterCircPumpTimerTableSelected',
				'WW_MoSo_Start1',
				'WW_MoSo_End1',
				'WW_MoSo_Start2',
				'WW_MoSo_End2',
				'WW_MoSo_Start3',
				'WW_MoSo_End3',
				'WW_MoSo_Start4',
				'WW_MoSo_End4',
				'WW_MoSo_Start5',
				'WW_MoSo_End5',
				'hotWaterCircPumpOnTime',
				'hotWaterCircPumpOffTime',
			] as const;
			adapter.originalZipConfig = {};
			for (const k of keysToSave) {
				const s = await adapter.getStateAsync(getDpPath(k));
				adapter.originalZipConfig[k] = s ? s.val : null;
			}
		}

		const updates = [
			{ key: 'hotWaterCircPumpTimerTableSelected', raw: 0 },
			{ key: 'WW_MoSo_Start1', raw: 0 },
			{ key: 'WW_MoSo_End1', raw: 86340 },
			{ key: 'WW_MoSo_Start2', raw: 0 },
			{ key: 'WW_MoSo_End2', raw: 0 },
			{ key: 'hotWaterCircPumpOnTime', raw: onTimeMinutes },
			{ key: 'hotWaterCircPumpOffTime', raw: 60 },
		];

		for (const u of updates) {
			await adapter.queueWrite(parseInt(STATE_MAPPING[u.key].luxWriteId as string, 10), u.raw);
			await new Promise(r => setTimeout(r, 100));
		}
	}

	adapter.zipTimer = setTimeout(async () => {
		await adapter.stopZipAndDeaeration();
	}, durationSeconds * 1000);
}
