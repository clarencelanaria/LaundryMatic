### Hardware and Serial Configuration

The system uses an **Arduino UNO** microcontroller with the following hardware connections:

- **HX711:** DOUT → Pin 4, SCK → Pin 5
- **Reset Button:** Pin 2
- **Power LED:** Pin 13
- **LCD:** I2C address `0x27`
- **Serial Baud Rate:** `9600`

The Arduino communicates with **`laundrymatic-bridge/bridge.js`** through a **USB serial connection**, allowing the bridge to receive and process the weight data before sending it to the LaundryMatic system.
