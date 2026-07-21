<img src="admin/luxtronik2-controller.png" alt="Projekt Logo" width="20%">

# ioBroker.luxtronik2-controller

[![NPM version](https://img.shields.io/npm/v/iobroker.luxtronik2-controller.svg)](https://www.npmjs.com/package/iobroker.luxtronik2-controller)
[![Downloads](https://img.shields.io/npm/dm/iobroker.luxtronik2-controller.svg)](https://www.npmjs.com/package/iobroker.luxtronik2-controller)

[![NPM](https://nodei.co/npm/iobroker.luxtronik2-controller.png?downloads=true)](https://nodei.co/npm/iobroker.luxtronik2-controller/)

**Tests:** ![Test and Release](https://github.com/TbsJah/ioBroker.luxtronik2-controller/workflows/Test%20and%20Release/badge.svg)

## luxtronik2-controller adapter for ioBroker

This ioBroker adapter enables the local control and monitoring of heat pumps with [Luxtronik 2.x controllers](https://www.alpha-innotec.com/en/products/accessories/control/luxtronik) (e.g., Alpha Innotec, Novelan). The adapter is written entirely in TypeScript.

## Acknowledgements & History

This project builds upon the preliminary work of existing open-source projects. Special thanks go to:

[Bouni](https://github.com/bouni/luxtronik-2) Whose pioneering work and code developments form the essential foundation for communication with Luxtronik controllers.

[Coolchip:](https://github.com/coolchip/luxtronik2) For the fundamental reverse engineering of the Luxtronik network protocol.

[UncleSamSwiss:](https://github.com/UncleSamSwiss/ioBroker.luxtronik2) For the original ioBroker adapter.

Innovations in this version: The luxtronik2-controller natively integrates TCP communication (Port 8888 / 8889) and does not rely on external libraries. Additionally, controlling macros, a logic for compressor protection, and automated datapoint management were implemented.

## Features

- Native TCP communication: Direct connection to the heat pump without additional overhead.

- Compressor protection (Cycle optimization): Combining heating and domestic hot water cycles to reduce compressor starts.

- Integrated actions (Macros): Predefined control logics for forced heating, hot water requests, and the circulation pump (ZIP) incl. automatic fallback to default values.

- Custom datapoints: Measured values (Index 3004) and parameters (Index 3003) can be added via the adapter configuration. Unix timestamps are formatted automatically.

- Automatic object management: Deselected or deleted datapoints and empty folder structures are automatically removed from ioBroker upon an adapter restart.

- Notification system: Heat pump error codes can be sent directly to Telegram or the ioBroker notification system.

- Motion detector coupling: Option for demand-driven activation of the circulation pump via existing ioBroker motion sensors.

## ⚠️ Warning

Some settings provided by this integration can affect the performance of your heat pump. Misconfigurations can cause the controller to enter a fault state, which requires a manual on-site reset.

This project aims to protect your heat pump by restricting the configuration options to safe values. However, no guarantees can be made. Please be careful, consult your Luxtronik manual, and do not change any settings that you do not fully understand.

## 🔧 Compatibility

The integration allows you to monitor and control heat pumps with a Luxtronik2 controller. It works locally without internet access.
It was and is being tested with an LWD50A (LD5) from Alpha Innotec.

## ⚠️ Disclaimer / Haftungsausschluss ⚠️

Dieses Projekt steht in keinerlei Verbindung zu Alpha Innotec, Novelan, ait-deutschland GmbH oder anderen Herstellern. Es handelt sich um ein privates Open-Source-Projekt, das in der Freizeit entwickelt und gepflegt wird. Die Nutzung des Adapters geschieht auf eigene Gefahr.

_This project is not affiliated with Alpha Innotec, Novelan, ait-deutschland GmbH, or any other company. It is a personal project that is maintained in spare time. Use at your own risk._

## Reporting Bugs & Contributing

Bug reports, compatibility notes for specific firmware versions, or feature requests can be submitted via the issue tracker in the [GitHub-Repository](https://github.com/TbsJah/ioBroker.luxtronik2-controller/issues).

## Information

[Info Deutsch](documentation/readme_de.md)

[Info English](documentation/readme_en.md)

<img src="documentation/Bilder/Haupteinstellung.png" alt="Haupteinstellung" width="100%">
<img src="documentation/Bilder/Objekte.png" alt="Objekte" width="100%">
<img src="documentation/Bilder/Datenpunkte.png" alt="Datenpunkte" width="100%">
<img src="documentation/Bilder/Benachrichtigung.png" alt="Benachrichtigung" width="100%">
<img src="documentation/Bilder/EigeneWerte.png" alt="EigeneWerte" width="100%">
<img src="documentation/Bilder/Fehlermeldung.png" alt="Fehlermeldung" width="100%">
<img src="documentation/Bilder/Bewegungssensoren.png" alt="Bewegungssensoren" width="100%">

## Changelog

// ### **WORK IN PROGRESS**

### **WORK IN PROGRESS**

**Features & Enhancements**

- **Global EEPROM Flash Protection (Read-Before-Write):** Implemented a global interceptor for all hardware write commands (`writePumpSafe`). The adapter now caches the current heat pump parameters in real-time and strictly blocks any duplicate or redundant write requests before they are sent over the network. This drastically reduces unnecessary network traffic and protects the Luxtronik flash memory from premature wear.
- **Write Cycle Monitoring:** Introduced two new virtual data points under System Info (`write_cycles_today` and `write_cycles_total`) to transparently track the exact number of physical write operations sent to the heat pump. The daily counter automatically resets every night at midnight.
- **Cooling Extension & Intelligent Status:** Comprehensive integration of new cooling data points (e.g., `cooling_status`, `cooling_configured`, `opStateCooling`). Added the dynamically calculated `opStateCoolingString`, which accurately evaluates and displays the current cooling state (e.g., "Cooling limit", "Waiting for timer release", or "Cooling since HH:MM:SS").
- **Admin UI - Flash Wear Warning & Tip:** Updated the configuration UI for the circulation pump (ZIP) optimization. Added an explicit tip advising users to set base ZIP times to `00:00 - 00:00` in the tables to prevent background hardware writes.
- **Hardened ZIP Macro Execution:** Reaffirmed and secured the ZIP demand-driven macro to exclusively use the deaeration program (Entlüftungsprogramm). This bypasses the need to constantly overwrite persistent timer tables, providing a much safer, non-persistent way to trigger the circulation pump on demand.
- **New Flow Rate Datapoints:** Added flow rate tracking for the heat source (`flow_rate_heat_source`, ID 173) and cooling (`flow_rate_cooling`, ID 254) to the state mapping.
- **Extended Admin UI:** All newly added cooling data points and the heat source flow rate can now be individually enabled or disabled via new checkboxes in the adapter configuration (`jsonConfig.json`).
- **New Hardware Supported:** Officially added the MSW2-9S heat pump to the model recognition (`HP_TYPES`).

**Bugfixes**

- **TypeScript/Linter Strictness:** Fixed strictly typed linter errors (e.g., `@typescript-eslint/no-floating-promises`) by correctly handling asynchronous database calls. Used the `void` operator for safe, fire-and-forget `setState` operations without blocking the event loop.
- **Missing Imports:** Resolved compilation errors regarding missing helper functions (e.g., `getDpPath`) during module refactoring.
- **Cooling Operating Hours:** Fixed the `hours_cooling` datapoint. The value is now correctly read from real-time telemetry data (`raw_value`) and displayed as a regular number of hours, resolving an issue where the timestamp "Jan 1, 1970" was incorrectly shown.
- **Config Cleanup:** Fixed an incorrect identifier in the admin UI (changed `sync_Gerätezeit` to `sync_deviceTime`) and removed unused/dead checkboxes.

**Technical Changes (Under the Hood)**

- **Separation of Concerns (zipManager):** Completely refactored the motion sensor and circulation pump logic. Extracted the motion sensor subscription and event handling (`checkAndHandleMotionSensor`, `subscribeMotionSensors`) out of the `main.ts` file and centralized it entirely into `zipManager.ts`. This makes the main controller significantly leaner and improves code maintainability.
- **Centralized Network Operations:** Moved the core write logic out of the main controller and relocated it to `rawFunctions.ts` to keep the raw TCP/WebSocket communication strictly separated from the adapter's state management.
- **Global Time Refactoring (DRY):** Centralized the duration and time calculation for status texts in the `updateStatusStrings` function. The hours/minutes/seconds logic (including the FW 3.x fallback) is now efficiently calculated only once and globally shared across heating, hot water, and cooling states.
- **i18n Support for State Names:** Updated the internal state definition (`name: string | { en: string; de?: string }`) to fully support translation objects, allowing natively translated datapoint names in the ioBroker object tree.

### 0.6.1 (2026-07-17)

- Implemented fallback mechanism: Index 80 lc is used if 117-120 are empty.

### 0.6.0 (2026-07-16)

- Added option to select the display language for state values (English/German)

### 0.5.3 (2026-07-16)

- Resolve issues which are reported by repository checker
- Updates Timers Format
- Time_WPein_akt 00:00:01 --> 00:00:00 if VD1 is false
- Fallback if Firmware > 3 for extStateStr & StateStr

### 0.5.2 (2026-07-15)

- Resolve issues which are reported by repository checker

## License

MIT License

Copyright (c) 2026 TbsJah <github.tbsjah@googlemail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[Older changelogs can be found there](CHANGELOG_OLD.md)
