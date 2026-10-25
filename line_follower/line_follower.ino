// ============================================================
// WAREHOUSE INSPECTOR — LINE FOLLOWER WITH ESP32 TRIGGER
// ============================================================

#define LEFT_IR  2
#define RIGHT_IR 3

#define ENA 5
#define IN1 8
#define IN2 7

#define ENB 6
#define IN3 9
#define IN4 10

// Trigger pin connected to ESP32-CAM (GPIO 13)
#define ESP_TRIGGER_PIN 12

// ============================================================
// Extra Voltage Source & Ground Pins
// ============================================================
// You can use Pin 4 as a +5V power source (up to ~30mA)
#define POWER_5V_PIN 4
// You can use Pin 11 as an extra GND ground pin (0V)
#define POWER_GND_PIN 11

int speedL = 200;
int speedR = 200;

// Flag to track inspection stop state
bool inspectedCurrentStop = false;

void setup() {
  Serial.begin(115200);

  // 1. Activate extra +5V voltage source pin
  pinMode(POWER_5V_PIN, OUTPUT);
  digitalWrite(POWER_5V_PIN, HIGH); // Outputs steady +5V

  // 2. Activate extra GND pin
  pinMode(POWER_GND_PIN, OUTPUT);
  digitalWrite(POWER_GND_PIN, LOW);  // Outputs steady 0V (GND)

  pinMode(LEFT_IR, INPUT);
  pinMode(RIGHT_IR, INPUT);

  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);

  pinMode(ENB, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  pinMode(ESP_TRIGGER_PIN, OUTPUT);
  digitalWrite(ESP_TRIGGER_PIN, LOW);

  Serial.println("Line Follower Initialized. Ready for rack inspection stops.");
}

void leftMotor(int speed) {
  if (speed >= 0) {
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
  } else {
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    speed = -speed;
  }
  analogWrite(ENA, constrain(speed, 0, 255));
}

void rightMotor(int speed) {
  if (speed >= 0) {
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
  } else {
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, HIGH);
    speed = -speed;
  }
  analogWrite(ENB, constrain(speed, 0, 255));
}

void forward() {
  leftMotor(speedL);
  rightMotor(speedR);
}

void turnLeft() {
  leftMotor(100);
  rightMotor(200);
}

void turnRight() {
  leftMotor(200);
  rightMotor(100);
}

void stopMotors() {
  leftMotor(0);
  rightMotor(0);
}

void triggerInspection() {
  Serial.println("====================================");
  Serial.println("STOP DETECTED: Triggering ESP32-CAM");
  Serial.println("====================================");

  // 1. Full stop & stabilize (eliminates camera shake)
  stopMotors();
  delay(600);

  // 2. Send Hardware Pulse to ESP32-CAM GPIO 13
  digitalWrite(ESP_TRIGGER_PIN, HIGH);
  delay(250);
  digitalWrite(ESP_TRIGGER_PIN, LOW);

  // 3. Also send UART command over Serial
  Serial.println("CAPTURE");

  // 4. Wait for photo capture + WiFi backend upload to complete
  delay(4000);

  Serial.println("Inspection completed. Resuming line following...");

  // 5. Nudge forward to clear the black stop line marker
  forward();
  delay(500);
}

void loop() {
  int left = digitalRead(LEFT_IR);
  int right = digitalRead(RIGHT_IR);

  // BLACK = 1 (Stop or line detected)
  // WHITE = 0

  if (left == 0 && right == 0) {
    // Both white → normal forward
    forward();
  }
  else if (left == 1 && right == 0) {
    // Left sensor on black → correct left
    turnLeft();
  }
  else if (left == 0 && right == 1) {
    // Right sensor on black → correct right
    turnRight();
  }
  else {
    // Both black (1, 1) → Inspection Station Stop Marker!
    triggerInspection();
  }
}