# LaundryMatic — IoT Smart Weighing System

LaundryMatic is a laundry management system for small laundry shops. It combines a load-cell weighing scale, a web admin dashboard, and a customer mobile app, so laundry can be weighed, priced, and tracked from drop-off to pick-up.

## Features

**Web admin dashboard**
- Admin registration and login with email verification
- Live laundry weight from the weighing scale
- QR scanning to identify customers, with automatic job order creation
- Job order and status management (including date and time)
- Billing, receipts, records, and reports
- Customer management and notifications
- Mobile App page with a QR code so customers can download the app

**Customer mobile app (Android)**
- Customer registration and login with email verification
- Personal QR code for quick identification at the shop
- Laundry order tracking and status updates
- Notifications

**Super Admin**
- One manually created account that reviews administrator accounts
- Can approve or reject any admin at any time

## How it works

```
Load Cell → HX711 → Arduino UNO → USB Serial → Node.js bridge → Firebase Realtime Database → Web Dashboard
```

The Arduino does not talk to Firebase directly. It sends the weight over USB serial, and a small Node.js script (the bridge) uploads it to Firebase.

## Project structure

| Folder | What it contains |
|---|---|
| `laundrymatic/` | Web admin dashboard (hosted on Firebase Hosting) and database rules |
| `LaundryMatic_Mobile/` | Customer mobile app (React Native / Expo) |
| `laundrymatic-bridge/` | Node.js script that sends the scale's weight to Firebase |
| `Arduino/DIGI_LWS/` | Arduino sketch for the load cell and LCD |

## Tech stack

- **Web:** HTML, CSS, JavaScript, Firebase Hosting
- **Mobile:** React Native, Expo, Expo Router
- **Backend:** Firebase Authentication and Firebase Realtime Database
- **Hardware:** Arduino UNO, HX711, load cell, 16x2 I2C LCD
- **Bridge:** Node.js, `serialport`, `firebase-admin`

## Download the mobile app

Android only. Open the download page on your phone and tap **Download APK**:

**https://laundrymatic-51608.web.app/download.html**

The APK is also available under [Releases](https://github.com/clarencelanaria/LaundryMatic/releases). Because the app is installed directly and not from the Play Store, Android may ask you to allow installation from this source.

## Setup

### 1. Web dashboard

```bash
cd laundrymatic
firebase login
firebase deploy --only hosting
```

### 2. Database rules

Paste the contents of `laundrymatic/database.rules.json` into **Firebase Console → Realtime Database → Rules** and publish.

### 3. Mobile app

```bash
cd LaundryMatic_Mobile
npm install
npx expo start
```

To build an installable APK:

```bash
eas build --platform android --profile preview
```

### 4. Hardware and bridge

**Wiring** (as used in `Arduino/DIGI_LWS/DIGI_LWS.ino`):

| Part | Arduino pin |
|---|---|
| HX711 DOUT | 4 |
| HX711 SCK | 5 |
| Tare / reset button | 2 |
| Power LED | 13 |
| LCD (I2C, address `0x27`) | SDA / SCL |

1. Upload `Arduino/DIGI_LWS/DIGI_LWS.ino` to the Arduino UNO (baud rate 9600).
2. Get a Firebase Admin SDK key from **Firebase Console → Project Settings → Service Accounts → Generate new private key**. Save it as `laundrymatic-bridge/serviceAccountKey.json`.
3. In `laundrymatic-bridge/bridge.js`, set `SERIAL_PORT` to your Arduino's port (for example `COM3`).
4. Start the bridge:

```bash
cd laundrymatic-bridge
npm install
npm start
```

## Accounts and roles

| Role | Access |
|---|---|
| Customer | Mobile app only |
| Admin | Web dashboard for their shop (admins with the same shop name share that shop's data) |
| Super Admin | Admin approval page only. Created manually in the Firebase Console, never through registration |

## Security notes

- Never commit `serviceAccountKey.json`. It is listed in `.gitignore` and gives full access to the database.
- Access is controlled by the Firebase security rules in `laundrymatic/database.rules.json`.
- The Firebase web config in the web and mobile code is meant to be public. The security rules are what protect the data.

## Authors

Clarence Lanaria

## License

Add your license here, or remove this section.
