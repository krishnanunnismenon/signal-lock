# Physical knobs — USB bring-up

Three EC11-style rotary encoders control Animal, Colour and Accessory through an ESP32 and USB. On 2026-10-03 the user confirmed all three working after moving the former Accessory yellow wire from G2 to G15. G2 stayed LOW even with yellow disconnected; its underlying cause remains unconfirmed. Arduino ESP32 3.3.12 is installed, and the CP2102 port is `/dev/cu.usbserial-0001`.

The laptop bridge now swaps Animal and Accessory to match their physical positions and reverses all three turn directions. **Keep the working wiring and firmware. Restart the bridge to apply these changes; no new upload is needed.**

## Before wiring

The shaft's tactile stops are called detents; a rotary encoder can continue past them. The two button terminals are unused. Each encoder's middle rotation terminal is connected to GND, and its outer terminals have separate signal wires. The soldered headers must preserve those connections.

Disconnect USB before changing wires. Keep any old sensor connections off these signal pins. All three encoders may share GND, but no two encoders share a signal pin.

Connections and current game assignments for the pictured **classic ESP32-WROOM** board (GPIO numbers, not connector positions). The latest diagnostic prompted a one-wire change from G2 to G15 for the knob now assigned to Animal. G15 is unused by the other knobs. GPIO16 is available on WROOM modules; this mapping is not suitable for WROVER modules with PSRAM on that pin. See the [board pin reference](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html).

| Knob | A | B | Common | Initially enabled |
| --- | --- | --- | --- | --- |
| Accessory | GPIO22 (yellow) | GPIO19 (orange) | GND (red) | Yes |
| Colour | GPIO16 (yellow) | GPIO5 (orange) | GND (red) | Yes |
| Animal | GPIO15 (yellow) | GPIO21 (orange) | GND (red) | Yes |

Firmware channel IDs retain their installed order: 0 = G22/G19, 1 = G16/G5, 2 = G15/G21. `server/knob-protocol.ts` maps those channels to Accessory, Colour, Animal and negates the raw direction once. Both game modes and the monitor use this mapping. This records the user's reported wiring, not a continuity measurement. The bare encoder contacts use `INPUT_PULLUP`, switching inputs to GND. Do not connect them to 3V3 or 5V. This mapping does not apply to a powered encoder module.

Official references: [ESP32 GPIO](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/gpio.html), [ESP32-WROOM-32 pin definitions](https://documentation.espressif.com/esp32-wroom-32_datasheet_en.html), [Arduino ESP32 setup](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html).

## Work entirely in VS Code (recommended)

Open the **signalLock project folder** in VS Code, not just the sketch file. Press **Cmd+Shift+P**, choose **Tasks: Run Task**, then select one of the `Signal Lock:` tasks. No Arduino editor extension is required. The `.ino` file is displayed as C++.

The tasks use Arduino CLI. On this Mac they can reuse the executable bundled inside the installed Arduino application while its window remains closed. If you later remove that application, install standalone `arduino-cli` on PATH or set `ARDUINO_CLI` to its executable path. The project's `hardware/arduino-cli.yaml` supplies the official board index without changing your IDE preferences. Board support is pinned to **esp32 3.3.12**.

Run these tasks in order:

| Task | What to expect |
| --- | --- |
| **Check ESP32 setup** | Shows the CLI location, free disk space and installed board packages. |
| **Install ESP32 tools (first time)** | Downloads and installs board support. After the earlier disk error, allow at least 8 GiB free before retrying; this is a working-space allowance, not a guarantee of exact installation size. |
| **Find USB port** | Identify the ESP32 CP2102 device; last detected as `/dev/cu.usbserial-0001`. |
| **Build firmware** | Checks and compiles `hardware/signal-lock/signal-lock.ino`. It does not upload anything. |
| **Upload firmware** | Prompts for the port, builds the current source again, then uploads and verifies it. A failed build stops the upload. |
| **Test knobs** | Prints a named step each time you turn a knob. Stop with Ctrl+C before uploading again or starting the game bridge. |
| **Inspect G15 signals (Animal)** | Shows the G15/G21 signals and their change counters independently of decoded clicks. |
| **Run game** | Starts the host at `http://127.0.0.1:5173/`; keep this task running. |
| **Connect knobs to game** | Controls the workshop operator screen. Start a pair on the host to enable play. |
| **Connect knobs to solo sandbox** | Controls `/solo`, including before starting a round. Stop the workshop bridge first. |

Select the ESP32 port when prompted. Only **one** monitor, uploader or bridge can use that port at a time. Starting another serial task does not automatically stop the previous one. `Run game` can stay running alongside the bridge.

Equivalent commands work in VS Code's integrated terminal:

```sh
pnpm firmware:status
pnpm firmware:setup
pnpm firmware:build
pnpm firmware:upload --port /dev/cu.usbserial-0001
pnpm knobs --port /dev/cu.usbserial-0001 --monitor
```

Build artifacts go into the ignored `.hardware-build/` folder. The build/upload helper requires at least 1 GiB free before compilation, and setup requires 8 GiB to reduce the chance of repeating the disk-full installation failure. It never deletes files to make space. A different editor does not remove the compiler's disk requirements.

## Alternative: install and upload using Arduino IDE

1. Check available disk space before installing on a new machine. The board package needs room for both archives and extracted tools. This Mac already has ESP32 3.3.12 installed.
2. Open Arduino IDE → Settings (Preferences). Add `https://espressif.github.io/arduino-esp32/package_esp32_index.json` to **Additional Boards Manager URLs**, preserving any existing entries.
3. Open **Boards Manager**, search **esp32**, and install **esp32 by Espressif Systems**. Wait for successful installation; a partial download is not enough.
4. Open `hardware/signal-lock/signal-lock.ino` using **File → Open**. Keep `Quadrature.h` beside it in the same folder. All three knobs are enabled; no extra Arduino libraries are required.
5. Select **ESP32 Dev Module** (the classic ESP32, not C3/S3), and select the CP2102 board's port, last detected as `/dev/cu.usbserial-0001`. Leave PSRAM disabled. Use an upload speed of **115200** for the first upload.
6. Close any Serial Monitor or `pnpm knobs` process using the port. Click **Verify** (check mark), then **Upload** (right arrow). Wait for upload completion before opening the monitor.

### If the upload cannot connect

Keep the current wiring. First try holding **BOOT** while the uploader shows `Connecting…`; release it once writing begins. To enter download mode manually, hold BOOT, briefly press/release EN, then release BOOT and retry uploading.

The current mapping leaves GPIO2 unused. GPIO15 held LOW at reset silences ROM boot messages; the firmware's own diagnostic output is separate. GPIO5 sets an SDIO-slave timing strap; that feature is not used by this USB controller. If BOOT/EN does not resolve an upload connection failure, report the full error. See [Espressif's boot-mode guide](https://docs.espressif.com/projects/esptool/en/latest/esp32/advanced-topics/boot-mode-selection.html).

## Test the knobs without the game

Run these commands from the Signal Lock project folder after a successful upload:

```sh
pnpm knobs --list
pnpm knobs --port /dev/cu.usbserial-0001 --monitor
```

Use the newly listed ESP32 port if its name has changed. Do not select the Anker hub's `usbmodemSN…` port. Close Arduino Serial Monitor first; only one program should own the ESP32 port.

Turn only Animal slowly: expect `Animal +1` or `Animal −1`. Then test Colour and Accessory separately. Turning one should not print the other knobs' names. Turn each ten clicks clockwise and ten anticlockwise, aiming for ten events in each direction and no events while untouched.

The calibration arrays in the sketch use raw channel order **G22/G19, G16/G5, G15/G21**, now assigned to **Accessory, Colour, Animal**:

- If every two clicks gives one event, change that knob's `TRANSITIONS_PER_CLICK` from `4` to `2`. If one click gives two events with `2`, use `4`.
- The bridge reverses the installed firmware direction. Clockwise should print `+1` in the monitor. Keep `DIRECTION={1,1,1}` for the current wiring; applying a second reversal in firmware would undo the correction.
- Stop the monitor, save the change and upload again before retesting.
- If movement produces another knob's name or no reading, check the mapping and breadboard connections with USB disconnected before changing calibration.

Stop the monitor with **Ctrl+C** before connecting the game bridge.

The board only emits turn events after receiving an `ARM` command. For manual diagnosis in Arduino Serial Monitor, choose 115200 baud and newline endings, then send `ARM monitor`. Close the monitor before returning to the bridge.

### Inspect the G15/G21 knob (now Animal)

The earlier Accessory fault was resolved by moving yellow from G2 to G15. That physical knob now controls Animal following the position swap. To inspect it, stop the game bridge with **Ctrl+C** and run **Signal Lock: Inspect G15 signals (Animal)**. Use `/dev/cu.usbserial-0001`, unless the listed ESP32 port has changed.

Equivalent diagnostic command after uploading:

```sh
pnpm knobs --port /dev/cu.usbserial-0001 --inspect
```

Leave the knob still briefly, then turn the G15/G21 knob slowly for a full revolution. Once per second the task prints readings such as:

```text
Animal: yellow G15=HIGH (changes 12), orange G21=LOW (changes 15)
```

Both change counters should increase during rotation. They count observed electrical transitions, including contact bounce, not clicks; the numbers need not match. A signal can return to the same HIGH/LOW level between printed lines, so compare the counters too.

- **Only one counter increases:** investigate the other signal's wire, breadboard row, solder joint, encoder contact, or ESP32 input.
- **Neither counter increases:** investigate the common ground and connection paths. This alone does not prove the encoder is broken.
- **Both increase, but no `Animal +1` / `Animal −1` appears:** investigate signal sequence, contact noise, and decoder calibration next.
- **Counters increase while untouched:** suspect an unstable connection or electrical noise.

Copy a few lines from before and during rotation for diagnosis. If the task reports no pin diagnostics, confirm the updated firmware uploaded successfully. Diagnostic readings are never sent as game commands. Stop this task with **Ctrl+C** before reconnecting the game bridge.

## Use the game

Terminal one:

```sh
pnpm dev
```

Terminal two (use the real port):

```sh
pnpm knobs --port /dev/cu.usbserial-0001
```

Open the host screen, add an operator/caller pair, open the operator screen and start the pair. Each physical click uses the same authoritative turn command as the on-screen knobs. Hardware controls work during open voting, the selected-five phase and frozen matching; they disable during pause, results and between pairs. The default bridge mode controls only the workshop. On-screen controls remain available too.

### Solo sandbox

Stop the workshop bridge with **Ctrl+C**, then run **Signal Lock: Connect knobs to solo sandbox**, or:

```sh
pnpm knobs --port /dev/cu.usbserial-0001 --solo
```

Open `http://localhost:5173/solo`. The physical knobs control **Your signal**, even before **Start round**. They remain active during open voting, five voters and frozen matching, and disable during pause/results. Reset and new rounds invalidate old queued input. Solo remains separate from the workshop and its leaderboard. To return to workshop play, stop the solo bridge and run **Connect knobs to game**. Only one mode owns the USB port at a time.

The bridge reads credentials locally, then connects with the operator role for workshop mode or the authenticated solo role for `--solo`. It does not send host credentials to the ESP32. `--server http://127.0.0.1:PORT` supports a different local server port. Remote server addresses are not supported by this initial USB version.

If USB is unplugged, reconnect it and rerun the bridge (the port may change). A game-server restart is retried automatically. Input is not queued for replay. Each uninterrupted round gets a fresh arming token, so buffered inputs from a prior round or pause cannot alter the next one. The game server remains responsible for the final deadline and score.

All three knobs are enabled. Their push buttons have no assigned gameplay action yet.

## Developer checks

`pnpm test` includes message framing, invalid input, repeated messages, round/pair changes, pause, lost state and scoring deadline checks. `pnpm build` checks the bridge's TypeScript too. The decoder can also be checked without a board:

```sh
c++ -std=c++11 hardware/decoder-test.cpp -o /tmp/signal-lock-decoder-test
/tmp/signal-lock-decoder-test
```

These checks do not replace an ESP32 firmware compilation, upload or physical encoder test.
