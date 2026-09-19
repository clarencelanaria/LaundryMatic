#include <HX711_ADC.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Pins
const int HX711_dout = 4; 
const int HX711_sck = 5;
const int resetPin = 2;
const int powerLed = 13;

float calibrationValue = 225.0; 

HX711_ADC LoadCell(HX711_dout, HX711_sck);
LiquidCrystal_I2C lcd(0x27, 16, 2); 

void setup() {
  // --- CRITICAL CHANGE: Start Serial here, not in loop ---
  Serial.begin(9600); 
  
  pinMode(powerLed, OUTPUT);
  pinMode(resetPin, INPUT_PULLUP);
  digitalWrite(powerLed, HIGH); 

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Initializing...");

  LoadCell.begin();
  unsigned long stabilizingTime = 2000; 
  boolean _tare = true; 
  LoadCell.start(stabilizingTime, _tare);
  
  if (LoadCell.getTareTimeoutFlag()) {
    lcd.clear();
    lcd.print("Check Wiring!");
    // Send error in JSON format even during setup
    Serial.println("{\"error\": \"HX711 Wiring Error\"}");
    while (1);
  }
  
  LoadCell.setCalFactor(calibrationValue); 
  lcd.clear();
  lcd.print("Scale Ready");
  delay(1000);
}

void loop() {
  static boolean newDataReady = 0;

  if (LoadCell.update()) newDataReady = true;

  if (newDataReady) {
    float i = LoadCell.getData();
    float weightKg = i / 1000.0;
    if (weightKg < 0) weightKg = 0.00; 

    // 1. Keep LCD display as is (User Friendly)
    lcd.setCursor(0, 0);
    lcd.print("Weight (KG):");
    lcd.setCursor(0, 1);
    lcd.print(weightKg, 3); 
    lcd.print(" kg      "); 

    // 2. Format output for bridge.js (Machine Friendly JSON)
    // This creates: {"weight": X.XX}
    Serial.print("{\"weight\": ");
    Serial.print(weightKg, 3); 
    Serial.println("}"); 
    
    newDataReady = false;
  }

  if (digitalRead(resetPin) == LOW) {
    lcd.setCursor(0, 1);
    lcd.print("Taring...       ");
    LoadCell.tareNoDelay();
  }
}