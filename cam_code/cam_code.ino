#include "esp_camera.h"
#include <HTTPClient.h>
#include <WebServer.h>
#include <WiFi.h>

// ===============================
// WiFi
// ===============================

const char *ssid = "#Vignesh";
const char *password = "24682468";

// ===============================
// FastAPI Backend
// ===============================

// Replace with your PC's IP address
// Example: http://192.168.1.100:8000/api/upload
const char *BACKEND_URL = "http://10.107.200.133:8000/api/upload";

// ===============================
// AI Thinker ESP32-CAM pins
// ===============================

#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27

#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5

#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

WebServer server(80);

// ===============================
// Capture Photo + Upload
// ===============================

// ===============================
// Global buffer for last captured JPEG
// ===============================
uint8_t *last_jpg_buf = NULL;
size_t last_jpg_len = 0;
String last_backend_status = "Not triggered yet";
int last_backend_code = 0;

// ===============================
// Serve Raw Last JPEG Photo
// ===============================
void handlePhotoJpg() {
  if (last_jpg_buf != NULL && last_jpg_len > 0) {
    server.send_P(200, "image/jpeg", (const char *)last_jpg_buf, last_jpg_len);
  } else {
    // If no photo taken yet, capture one on the fly
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      server.send(500, "text/plain", "Camera capture failed");
      return;
    }
    uint8_t *jpg_buf = NULL;
    size_t jpg_len = 0;
    bool converted = frame2jpg(fb, 90, &jpg_buf, &jpg_len);
    esp_camera_fb_return(fb);

    if (converted && jpg_buf != NULL) {
      server.send_P(200, "image/jpeg", (const char *)jpg_buf, jpg_len);
      free(jpg_buf);
    } else {
      server.send(500, "text/plain", "JPEG conversion failed");
    }
  }
}

// ===============================
// Capture Photo + Upload + Web View
// ===============================

void capturePhoto() {

  Serial.println();
  Serial.println("============================");
  Serial.println("Taking photo...");
  Serial.println("============================");

  camera_fb_t *fb = esp_camera_fb_get();

  if (!fb) {
    Serial.println("Camera capture failed!");
    last_backend_status = "Camera capture failed!";
    last_backend_code = 500;
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }

  Serial.print("RGB565 image size: ");
  Serial.print(fb->len);
  Serial.println(" bytes");

  // Free previously saved web preview buffer if exists
  if (last_jpg_buf != NULL) {
    free(last_jpg_buf);
    last_jpg_buf = NULL;
    last_jpg_len = 0;
  }

  // Convert RGB565 -> JPEG
  bool converted = frame2jpg(fb, 90, &last_jpg_buf, &last_jpg_len);
  esp_camera_fb_return(fb);

  if (!converted || last_jpg_buf == NULL) {
    Serial.println("RGB565 -> JPEG conversion failed!");
    last_backend_status = "JPEG conversion failed!";
    last_backend_code = 500;
    server.send(500, "text/plain", "JPEG conversion failed");
    return;
  }

  Serial.print("JPEG size: ");
  Serial.print(last_jpg_len);
  Serial.println(" bytes");

  // Upload JPEG to FastAPI
  Serial.println("Uploading image to backend...");

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "image/jpeg");

  int httpResponseCode = http.POST(last_jpg_buf, last_jpg_len);

  last_backend_code = httpResponseCode;
  Serial.print("Backend response code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {
    last_backend_status = http.getString();
    Serial.println("Backend response:");
    Serial.println(last_backend_status);
  } else {
    last_backend_status = "Upload failed: " + http.errorToString(httpResponseCode);
    Serial.println(last_backend_status);
  }

  http.end();

  Serial.println("Image upload complete!");
  Serial.println("============================");

  // Serve HTML view showing the captured photo
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP32-CAM Inspection View</title>";
  html += "<style>";
  html += "body{font-family:-apple-system,sans-serif;text-align:center;background:#0f172a;color:#f8fafc;padding:16px;margin:0;}";
  html += ".card{background:#1e293b;max-width:640px;margin:10px auto;padding:20px;border-radius:12px;border:1px solid #334155;box-shadow:0 4px 6px -1px rgba(0,0,0,0.3);}";
  html += "img{max-width:100%;height:auto;border-radius:8px;border:2px solid #475569;margin:12px 0;}";
  html += ".btn{background:#2563eb;color:white;padding:12px 24px;font-weight:bold;border-radius:8px;text-decoration:none;display:inline-block;margin:8px 4px;}";
  html += ".badge{padding:6px 12px;border-radius:6px;font-size:13px;font-weight:600;display:inline-block;}";
  html += ".ok{background:#065f46;color:#6ee7b7;}";
  html += ".err{background:#881337;color:#fecdd3;}";
  html += "pre{background:#0f172a;padding:10px;border-radius:6px;font-size:11px;text-align:left;overflow-x:auto;color:#38bdf8;}";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<h2>ESP32-CAM Captured Frame</h2>";
  if (httpResponseCode == 200) {
    html += "<span class='badge ok'>✓ Backend HTTP 200 (Success)</span>";
  } else {
    html += "<span class='badge err'>✕ Backend HTTP " + String(httpResponseCode) + "</span>";
  }
  html += "<br/><img src='/photo.jpg?t=" + String(millis()) + "' alt='Captured Photo' />";
  html += "<div><a href='/capture' class='btn'>📷 Capture Again</a></div>";
  html += "<p style='font-size:12px;color:#94a3b8;margin-top:12px;'>Backend Response:</p>";
  html += "<pre>" + last_backend_status + "</pre>";
  html += "</div></body></html>";

  server.send(200, "text/html", html);
}

// ===============================
// Home Page
// ===============================

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP32-CAM</title>";
  html += "<style>";
  html += "body{font-family:-apple-system,sans-serif;text-align:center;background:#0f172a;color:#f8fafc;padding:20px;}";
  html += ".card{background:#1e293b;max-width:500px;margin:20px auto;padding:24px;border-radius:12px;border:1px solid #334155;}";
  html += ".btn{background:#2563eb;color:white;padding:12px 24px;font-weight:bold;border-radius:8px;text-decoration:none;display:inline-block;margin:12px 0;}";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<h1>ESP32-CAM Inspector</h1>";
  html += "<p style='color:#94a3b8;'>Camera is ready and connected to Wi-Fi.</p>";
  html += "<a href='/capture' class='btn'>📷 Take Photo & Inspect</a>";
  html += "<br/><a href='/photo.jpg' style='color:#38bdf8;font-size:13px;'>View raw photo stream</a>";
  html += "</div></body></html>";

  server.send(200, "text/html", html);
}

// ===============================
// Setup
// ===============================

// ===============================
// Hardware Trigger Pin from Line Follower
// ===============================
#define TRIGGER_PIN 13 // Connect to Arduino Pin 12 (ensure common GND)

void setup() {

  Serial.begin(115200);
  delay(1000);

  // Configure hardware trigger pin from line follower
  pinMode(TRIGGER_PIN, INPUT_PULLDOWN);

  Serial.println();
  Serial.println("============================");
  Serial.println("ESP32-CAM Starting");
  Serial.println("============================");

  // ===============================
  // Camera configuration
  // ===============================

  camera_config_t config;

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;

  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;

  // KEEPING YOUR ORIGINAL IMAGE FORMAT
  config.pixel_format = PIXFORMAT_RGB565;

  // KEEPING YOUR ORIGINAL FRAME SIZE
  config.frame_size = FRAMESIZE_SVGA;

  config.jpeg_quality = 10;

  config.fb_count = 1;

  // ===============================
  // Initialize camera
  // ===============================

  Serial.println("Initializing camera...");

  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK) {

    Serial.print("Camera initialization failed! Error: 0x");
    Serial.println(err, HEX);

    return;
  }

  Serial.println("Camera initialized successfully!");

  sensor_t *s = esp_camera_sensor_get();

  Serial.print("Sensor PID: 0x");
  Serial.println(s->id.PID, HEX);

  Serial.print("Sensor VER: 0x");
  Serial.println(s->id.VER, HEX);

  Serial.print("Sensor MIDH: 0x");
  Serial.println(s->id.MIDH, HEX);

  Serial.print("Sensor MIDL: 0x");
  Serial.println(s->id.MIDL, HEX);

  // ===============================
  // WiFi
  // ===============================

  Serial.println("Connecting to WiFi...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");

  Serial.print("ESP32-CAM IP: ");
  Serial.println(WiFi.localIP());

  // ===============================
  // Web server
  // ===============================

  server.on("/", handleRoot);

  server.on("/capture", capturePhoto);

  server.on("/photo.jpg", handlePhotoJpg);

  server.begin();

  Serial.println("Web server started!");

  Serial.println("============================");
  Serial.println("ESP32-CAM READY FOR TRIGGER");
  Serial.println("============================");
}

// ===============================
// Main loop
// ===============================

void loop() {
  server.handleClient();

  // 1. Hardware GPIO Trigger from Line Follower
  if (digitalRead(TRIGGER_PIN) == HIGH) {
    Serial.println();
    Serial.println(">>> HARDWARE TRIGGER RECEIVED FROM LINE FOLLOWER <<<");
    delay(50); // Debounce
    capturePhoto();

    // Wait until trigger pin goes LOW to avoid double captures
    while (digitalRead(TRIGGER_PIN) == HIGH) {
      delay(50);
    }
  }

  // 2. Serial UART Trigger (Optional)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "CAPTURE" || cmd == "C") {
      Serial.println();
      Serial.println(">>> SERIAL UART TRIGGER RECEIVED <<<");
      capturePhoto();
    }
  }
}