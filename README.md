## 📚 Documentation for Making Scribit Work Locally

**🔍 New to this firmware?** Start here:
- **[FIRMWARE_ANALYSIS.md](FIRMWARE_ANALYSIS.md)** - Complete analysis of what's included, what works, and what's missing
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Multi-phase plan to enable local g-code operation without cloud services

**Summary**: The firmware is complete and functional. It was designed for cloud operation but can be modified to work locally. See the analysis document for full details.

---

## Original firmware behavior

If you are starting fresh in 2025, especially after shutdown of the product - here are some good to know things.

- The left part of the strip LED light is a button. It can be used to reset the device
- The default wifi password for original firmware is `ScribItAP314`
- After connection to AP, `http://192.168.240.1:8888/` should be available.

- LED light status: [docs/support-scribit-design/led-status.md](docs/support-scribit-design/led-status.md)
- More support doc archive in [docs/support-scribit-design](docs/support-scribit-design/)


## HowTo

### Prepare

Prepare configuration files (one-time setup):

```bash
# Copy example configuration files
cp ExtraFile/SIConfig.hpp.example Firmware/ScribitESP/SIConfig.hpp
cp ExtraFile/Mk4duoVersion.h.example Firmware/MK4duo/Mk4duoVersion.h  
cp ExtraFile/ScribitVersion.hpp.example Firmware/ScribitESP/ScribitVersion.hpp

# Copy required libraries
cp -r ExtraFile/arduino-mqtt Firmware/ScribitESP/
cp -r ExtraFile/StepperDriver Firmware/ScribitESP/
```

### Compile the Firmware

#### Using Docker (recommended)

Refer to [docker/README.md](docker/README.md) for more details.

<!-- #### Using Arduino IDE

- Copy the file `ExtraFile/SIConfig.hpp.example` to `Firmware/ScribitESP/SIConfig.hpp`
- Copy the file `ExtraFile/Mk4duoVersion.h.example` to `Firmware/MK4Duo/Mk4duoVersion.h`
- Copy the file `ExtraFile/ScribitVersion.hpp.example` to `Firmware/ScribitESP/ScribitVersion.hpp`
- Make the necessary configurations and compile -->

**SDK Installation**

- Install the Arduino Legacy IDE (1.8.19).
    - Add board URLs to Arduino IDE in `File > Preferences > Additional Boards Manager URLs`:
        ```
        https://www.briki.org/download/resources/package_briki_index.json
        https://dl.espressif.com/dl/package_esp32_dev_index.json
        ```
    - Go to `Tools > Board > Board Manager` and install the `Briki MBC-WB` board definition.
    - Use the **v2.0.0** version of the `Briki MBC-WB` board (v2.1.7 doesn't compile SAMD board)

- Add additional hardware overrides:
    - Copy the files `8MB_ffat.csv` and `8MB_spiffs.csv` from `ExtraFile/` to `~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/partitions`, overwriting the existing files.
    - Copy `ExtraFile/SERCOM.cpp` to `~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/cores/samd21`, overwriting the existing file.

- Copy libraries:
    - Copy `ExtraFile/arduino-mqtt` folder to `Firmware/ScribitESP`
    - Copy `ExtraFile/StepperDriver` folder to `Firmware/ScribitESP`

You may also refer to the [MBC-WB User Manual](docs/MBC-WB-UserManual_v-2-1-min-1.pdf) for more details.


### New Wi-Fi Configuration

- Connect to the `ScribIt-AP` AP.
- Send a POST request to `http://192.168.240.1:8888`. The body must contain a JSON formatted as follows: `{ "ssid": "<your_wifi_name>", "password": "<your_wifi_password>" }`.
- The device blinks faster and responds:
  - **200**: The request is correct. The body contains a JSON formatted as follows: `{"ID":"id_device"}`.
  - **400**: Error in the request. The body contains details about the error in the format: `{"error":"error", "ID":"id_device"}`.
- If the connection is successful, the device turns the LEDs green and reboots; otherwise, it turns them red for 2 seconds and waits for a new configuration packet.

### Delete Saved Wi-Fi

To reset the Wi-Fi configuration, press the button for at least 2 seconds. The device will reboot.

### OTA Firmware

#### Local Mode Firmware (No MQTT)
After flashing local mode firmware (SI_MQTT_HOST empty):
- After reset: LED double white flash → solid white
- MBC-WB network disappears quickly
- ScribIt-... network appears when LED solid
- Connect to ScribIt-... network
- Flash directly using espota.py (no WiFi config needed) (see next section)

#### Original/Cloud Firmware
- Compile the firmware.
- When LED is flashing white fast, There's a new wifi called MCB-WB-.... , connect to it
- Use OTA tool from Arduino IDE (Connect to `192.168.240.1` on port `3232` without a password.)
- or these python commands:
  - `python ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/espota.py -i 192.168.240.1 -p 3232 -f docker/builds/ScribitESP.ino.bin`
  - `python ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/espota.py -i 192.168.240.1 -p 3232 -c -f docker/builds/MK4duo.ino.bin`
  - `python ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/espota.py -i 192.168.240.1 -p 3232 -s -f docker/builds/ScribitESP.ino.partitions.bin`
  - **NOTE: For OTA, use MK4duo.ino.bin (not the with_bootloader version). The bootloader version is only for initial USB flashing.**
- Follow the document [MBC-W](docs/MBC-WB-UserManual_v-2-1-min-1.pdf)

## Known Bugs

- If you perform an update from a link on SAMD with the serial monitor open, the port may become inaccessible until the first reboot.

## Troubleshooting

- The device reports insufficient space even if the GCODE is much smaller than 5MB:
  - Follow **SDK Installation** and try flashing again.
  - Follow the procedure for flashing the partition table, ensuring that this firmware for the ESP does not coexist with the one for the SAMD partition table.
- After downloading, the robot does not move, and the debug shows many serial errors:
  - Follow **SDK Installation** and verify that the `SERCOM.cpp` file has been correctly overwritten.

## Acknowledgments

- [@kris-sum](https://github.com/kris-sum)
- [scribit-open/open-firmware](https://github.com/scribit-open/open-firmware)
