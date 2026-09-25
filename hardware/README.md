# Physical knobs — USB bring-up

First milestone: one EC11-style rotary encoder changes Animal in the workshop operator screen. Then enable the other two. USB transport and firmware are prepared; the exact encoder terminals and board revision still need visual confirmation. Nothing has been flashed or physically tested yet.

## Before wiring

Send a clear photo of one encoder's underside and the ESP32 pin labels. The shaft's tactile stops are called detents; a rotary encoder can continue past them. Confirm that it can make multiple complete revolutions without a hard end stop.

Disconnect USB before changing wires. For the first test, remove the existing sensor wiring with power disconnected and use only the encoder. Identify its A, B and common terminals from the actual component; do not assume their positions from the shaft orientation. The separate push-switch terminals are unused in this version.

Provisional firmware configuration for a **classic ESP32-WROOM** board (GPIO numbers, not connector positions):

| Knob | A | B | Common | Initially enabled |
| --- | --- | --- | --- | --- |
| Animal | GPIO32 | GPIO33 | GND | Yes |
| Colour | GPIO25 | GPIO26 | GND | No |
| Accessory | GPIO18 | GPIO19 | GND | No |

This is a proposed mapping, not a verified wiring diagram for the photographed parts. The bare encoder contacts use `INPUT_PULLUP`, switching inputs to GND. They do not need a 5 V supply. This mapping does not apply to an unidentified powered encoder module. Confirm any mapping changes in `signal-lock/signal-lock.ino` before upload.

Official references: [ESP32 GPIO](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/gpio.html), [ESP32-WROOM-32 pin definitions](https://documentation.espressif.com/esp32-wroom-32_datasheet_en.html), [Arduino ESP32 setup](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html).

## Upload and check one knob

1. Arduino IDE is installed on the development laptop. Install **esp32 by Espressif Systems** through Boards Manager following the official setup above; select the board matching the confirmed hardware and its USB port.
2. Open `hardware/signal-lock/signal-lock.ino`. Leave `ACTIVE_KNOBS = 1`. Upload after wiring has been confirmed. No additional Arduino libraries are required.
3. Close Arduino Serial Monitor so the USB bridge can open the same port.
4. In the project folder, run `pnpm knobs --list`. Pick the ESP32's actual port, usually a `/dev/cu.usb…` or `/dev/cu.SLAB…` device on macOS. Do not select Bluetooth ports.
5. Run `pnpm knobs --port /dev/cu.YOUR_DEVICE --monitor`, replacing the example path. This mode does not connect to the game. It should print one `Animal +1` or `Animal −1` per click.
6. Turn slowly ten clicks each way. If every two clicks gives one event, set that knob's `TRANSITIONS_PER_CLICK` to `2`. If one click gives two events with `2`, use `4`. If clockwise goes backwards, set its `DIRECTION` to `-1`. Re-upload and repeat. Contact quality and fast-turn behavior still need physical testing.
7. Stop the monitor with Ctrl+C before starting the game bridge.

The board only emits turn events after receiving an `ARM` command. For manual diagnosis in Arduino Serial Monitor, choose 115200 baud and newline endings, then send `ARM monitor`. Close the monitor before returning to the bridge.

## Use the game

Terminal one:

```sh
pnpm dev
```

Terminal two (use the real port):

```sh
pnpm knobs --port /dev/cu.YOUR_DEVICE
```

Open the host screen, add an operator/caller pair, open the operator screen and start the pair. Each physical click uses the same authoritative turn command as the on-screen knobs. Hardware controls work during open voting, the selected-five phase and frozen matching; they disable during pause, results and between pairs. This bridge controls the workshop, not `/solo`. On-screen controls remain available too.

The bridge reads credentials locally, then connects with the operator role. It does not send host credentials to the ESP32. `--server http://127.0.0.1:PORT` supports a different local server port. Remote server addresses are not supported by this initial USB version.

If USB is unplugged, reconnect it and rerun the bridge (the port may change). A game-server restart is retried automatically. Input is not queued for replay. Each uninterrupted round gets a fresh arming token, so buffered inputs from a prior round or pause cannot alter the next one. The game server remains responsible for the final deadline and score.

After the first knob passes, confirm and wire the other two, change `ACTIVE_KNOBS` to `3`, and calibrate each independently. Push buttons have no assigned gameplay action yet.

## Developer checks

`pnpm test` includes message framing, invalid input, repeated messages, round/pair changes, pause, lost state and scoring deadline checks. `pnpm build` checks the bridge's TypeScript too. The decoder can also be checked without a board:

```sh
c++ -std=c++11 hardware/decoder-test.cpp -o /tmp/signal-lock-decoder-test
/tmp/signal-lock-decoder-test
```

These checks do not replace an ESP32 firmware compilation, upload or physical encoder test.
