const {setGlobalOptions} = require("firebase-functions");
const {onValueCreated} = require("firebase-functions/v2/database");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp({
  databaseURL: "https://laundrymatic-51608-default-rtdb.asia-southeast1.firebasedatabase.app",
});

setGlobalOptions({ maxInstances: 10 });

// Fires every time a NEW notification is written to
// notifications/{userId}/{notifId} — the exact same path your
// existing in-app listener (utils/notifications.js) already reads,
// and the exact same path sendNotificationToUser() in your web
// app.js already writes to. Nothing about that existing flow
// changes; this just reacts to it and additionally sends a push.
exports.sendPushOnNewNotification = onValueCreated(
  {
    ref: "/notifications/{userId}/{notifId}",
    instance: "laundrymatic-51608-default-rtdb",
    region: "asia-southeast1",
  },
  async (event) => {
    const userId = event.params.userId;
    const notification = event.data.val();

    if (!notification) {
      logger.info("Empty notification payload, skipping.", { userId });
      return;
    }

    // Look up this customer's saved Expo push token
    const tokenSnap = await admin
        .database()
        .ref(`users/${userId}/pushToken`)
        .once("value");
    const pushToken = tokenSnap.val();

    if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
      logger.info("No valid push token for this user, skipping push.", { userId });
      return;
    }

    const message = {
      to: pushToken,
      sound: "default",
      title: notification.title || "LaundryMatic",
      body: notification.body || "",
      data: notification.data || {},
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      logger.info("Push send result", { userId, result });
    } catch (err) {
      logger.error("Error sending push notification", { userId, error: err.message });
    }
  }
);