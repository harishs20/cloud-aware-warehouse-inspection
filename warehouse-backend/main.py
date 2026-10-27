from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime, timezone
from ultralytics import YOLO

import cv2
import numpy as np
import requests
import json
import re
import os
import uuid
import boto3
from decimal import Decimal
from pathlib import Path


sns_client = boto3.client(
    "sns",
    region_name="ap-southeast-2"
)

SNS_TOPIC_ARN = (
    "arn:aws:sns:ap-southeast-2:927161114126:"
    "WarehouseInspectionAlerts"
)
# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Warehouse Inspector API",
    description="ESP32-CAM + YOLO based warehouse inspection system",
    version="1.0"
)

# Add CORS middleware to allow the frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DIRECTORIES
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = BASE_DIR / "models"
UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = BASE_DIR / "results"

UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)


# ============================================================
# OPTIONAL AWS S3 STORAGE
# ============================================================
# Set S3_BUCKET_NAME in the environment to enable cloud uploads.
# AWS credentials are loaded from the AWS CLI profile/credentials file;
# do not hardcode access keys in this source file.
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
DYNAMODB_TABLE_NAME = os.getenv("DYNAMODB_TABLE_NAME", "WarehouseInspections")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")
s3_client = boto3.client("s3", region_name=AWS_REGION) if S3_BUCKET_NAME else None
dynamodb_table = boto3.resource("dynamodb", region_name=AWS_REGION).Table(DYNAMODB_TABLE_NAME)


def make_dynamodb_safe(value):
    """Convert floats recursively to Decimal for DynamoDB compatibility."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {str(k): make_dynamodb_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [make_dynamodb_safe(v) for v in value]
    if isinstance(value, tuple):
        return [make_dynamodb_safe(v) for v in value]
    return value

def upload_to_s3(local_path: Path, object_key: str) -> bool:
    """Upload a local file to the configured private S3 bucket.

    Cloud upload failures are logged but do not break local inspection.
    """
    if s3_client is None or not S3_BUCKET_NAME:
        return False

    try:
        s3_client.upload_file(
            str(local_path),
            S3_BUCKET_NAME,
            object_key,
            ExtraArgs={"ServerSideEncryption": "AES256"},
        )
        print(f"Uploaded to S3: s3://{S3_BUCKET_NAME}/{object_key}")
        return True
    except Exception as exc:
        print(f"WARNING: S3 upload failed for {object_key}: {exc}")
        return False


# ============================================================
# MODEL
# ============================================================

# FINAL MODEL
MODEL_PATH = MODEL_DIR / "yolo26n.pt"

print("======================================")
print("Loading YOLO model...")
print("======================================")

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"YOLO model not found at: {MODEL_PATH}"
    )

model = YOLO(str(MODEL_PATH))

print("YOLO model loaded successfully!")
print("Model classes:", model.names)

print("======================================")


# ============================================================
# CLASS MAPPING
# ============================================================

# YOLO class IDs from your trained model
CLASS_NAMES = {
    0: "cap",
    1: "charger_brick",
    2: "earbud_container"
}


# ============================================================
# RACK CONFIGURATION
# ============================================================

# Normalized Y-coordinate thresholds.
#
# RACK_1 -> upper section
# RACK_2 -> middle section
# RACK_3 -> lower section
#
# These are based on your current rack/camera setup.
# They can be tuned later after actual ESP32-CAM testing.

def get_rack_from_y(y_center):
    """
    Determine which rack/section a detected object belongs to
    based on its normalized bounding-box Y center.
    """

    if y_center < 0.45:
        return "RACK_1"

    elif y_center < 0.77:
        return "RACK_2"

    else:
        return "RACK_3"


# ============================================================
# IMAGE CROPPING (ESP32-CAM)
# ============================================================

# Crop coordinates matching dataset.ipynb ESP_CROP = (180, 0, 620, 600)
ESP_CROP_LEFT = 180
ESP_CROP_TOP = 0
ESP_CROP_RIGHT = 620
ESP_CROP_BOTTOM = 600

def crop_esp_image(image):
    """
    Crop an 800x600 ESP32-CAM frame to the 440x600 rack region
    matching the exact dataset preprocessing from dataset.ipynb.
    If the image is already cropped or of a different resolution, it keeps it as-is.
    """
    if image is None:
        return image

    h, w = image.shape[:2]

    # Exact 800x600 SVGA ESP32-CAM resolution
    if w == 800 and h == 600:
        return image[ESP_CROP_TOP:ESP_CROP_BOTTOM, ESP_CROP_LEFT:ESP_CROP_RIGHT]

    # If width is larger than 620 and height is at least 600
    if w > 620 and h >= 600:
        return image[ESP_CROP_TOP:ESP_CROP_BOTTOM, ESP_CROP_LEFT:ESP_CROP_RIGHT]

    return image


# ============================================================
# QR CODE DETECTION & DIRECT JSON PARSING
# ============================================================

def detect_qr(image):
    """
    Robustly detect a QR code in the image using multi-pass preprocessing.
    Checks raw frame, grayscale, CLAHE contrast enhancement, Otsu, adaptive threshold,
    and multiple rotation angles.

    Returns:
        QR decoded data as a string
        or None if no QR code is detected.
    """
    if image is None:
        return None

    detector = cv2.QRCodeDetector()

    def _try_decode(img_variant, label):
        try:
            data, points, _ = detector.detectAndDecode(img_variant)
            if data and data.strip():
                print(f"QR detected ({label}):", data.strip())
                return data.strip()
        except Exception:
            pass
        return None

    # Pass 1: Raw image
    res = _try_decode(image, "Pass 1 - Raw")
    if res:
        return res

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

    # Pass 2: Grayscale
    res = _try_decode(gray, "Pass 2 - Grayscale")
    if res:
        return res

    # Pass 3: CLAHE (Contrast Limited Adaptive Histogram Equalization)
    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray_clahe = clahe.apply(gray)
        res = _try_decode(gray_clahe, "Pass 3 - CLAHE")
        if res:
            return res
    except Exception:
        pass

    # Pass 4: Otsu Binarization
    try:
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        res = _try_decode(thresh, "Pass 4 - Otsu")
        if res:
            return res
    except Exception:
        pass

    # Pass 5: Adaptive Gaussian Thresholding
    try:
        adapt = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 51, 10
        )
        res = _try_decode(adapt, "Pass 5 - Adaptive")
        if res:
            return res
    except Exception:
        pass

    # Pass 6: Check orientations (90, 180, 270 deg)
    for angle, rot_flag in [
        (90, cv2.ROTATE_90_CLOCKWISE),
        (180, cv2.ROTATE_180),
        (270, cv2.ROTATE_90_COUNTERCLOCKWISE),
    ]:
        try:
            rot_img = cv2.rotate(gray, rot_flag)
            res = _try_decode(rot_img, f"Pass 6 - Rotate {angle}°")
            if res:
                return res
        except Exception:
            pass

    print("No QR code detected.")
    return None


def parse_inventory_from_qr(qr_data: str) -> dict:
    """
    Directly parse inventory JSON from QR code string.

    Expected structure:
    {
        "RACK_1": {
            "2": 2
        },
        "RACK_2": {
            "0": 2
        },
        "RACK_3": {
            "1": 3
        }
    }
    """
    if not qr_data:
        raise ValueError("Empty QR code data.")

    # 1. Attempt direct JSON parsing
    try:
        data = json.loads(qr_data)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    # 2. Attempt extracting JSON object substring
    match = re.search(r'\{[\s\S]*\}', qr_data)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    # 3. Direct JSON endpoint fallback (if URL is provided)
    if qr_data.startswith("http://") or qr_data.startswith("https://"):
        try:
            resp = requests.get(qr_data, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict):
                return data
        except Exception as e:
            raise ValueError(f"Could not fetch JSON from URL: {str(e)}")

    raise ValueError("QR code does not contain valid rack inventory JSON.")


# ============================================================
# NORMALIZE INVENTORY
# ============================================================

def normalize_inventory(inventory):
    """
    Convert inventory into a predictable structure.

    Input:

    {
        "RACK_1": {
            "2": 2
        },
        "RACK_2": {
            "0": 2
        },
        "RACK_3": {
            "1": 3
        }
    }

    Output:

    {
        "RACK_1": {
            2: 2
        },
        "RACK_2": {
            0: 2
        },
        "RACK_3": {
            1: 3
        }
    }
    """

    normalized = {}

    for rack, items in inventory.items():

        if not rack.startswith("RACK_"):
            continue

        normalized[rack] = {}

        if not isinstance(items, dict):
            continue

        for class_id, quantity in items.items():

            try:
                class_id = int(class_id)
                quantity = int(quantity)

                normalized[rack][class_id] = quantity

            except (ValueError, TypeError):
                continue


    return normalized


# ============================================================
# YOLO DETECTION
# ============================================================

def run_yolo(image_path):
    """
    Run the final YOLO26n model on the uploaded image.

    Uses the same inference configuration used in your
    notebook:

        confidence = 0.5
        image size = 640
    """

    print("Running YOLO inference...")

    results = model(
        str(image_path),
        conf=0.5,
        imgsz=640,
        verbose=False
    )

    result = results[0]

    detections = []


    # --------------------------------------------------------
    # Extract bounding boxes
    # --------------------------------------------------------

    if result.boxes is not None:

        image_height, image_width = result.orig_shape

        for box in result.boxes:

            # Class ID
            class_id = int(
                box.cls[0].item()
            )

            # Confidence
            confidence = float(
                box.conf[0].item()
            )

            # Bounding box
            x1, y1, x2, y2 = (
                box.xyxy[0].tolist()
            )

            # Center of bounding box
            x_center = (
                (x1 + x2) / 2
            )

            y_center = (
                (y1 + y2) / 2
            )

            # Normalize coordinates
            normalized_x = (
                x_center / image_width
            )

            normalized_y = (
                y_center / image_height
            )

            # Determine rack
            rack = get_rack_from_y(
                normalized_y
            )

            # Class name
            class_name = CLASS_NAMES.get(
                class_id,
                f"class_{class_id}"
            )

            detections.append({

                "class_id": class_id,

                "class_name": class_name,

                "confidence": round(
                    confidence,
                    4
                ),

                "rack": rack,

                "center": {
                    "x": round(
                        normalized_x,
                        4
                    ),
                    "y": round(
                        normalized_y,
                        4
                    )
                },

                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2)
                }

            })


    # --------------------------------------------------------
    # YOLO native annotated image
    # --------------------------------------------------------

    annotated_image = result.plot()

    result_path = (
        RESULT_DIR /
        "inspection_result.jpg"
    )

    cv2.imwrite(
        str(result_path),
        annotated_image
    )

    print(
        f"Annotated result saved to: {result_path}"
    )

    print(
        f"Total detections: {len(detections)}"
    )

    return detections


# ============================================================
# COUNT DETECTED INVENTORY
# ============================================================

def count_detections(detections):
    """
    Convert individual YOLO detections into counts.

    Example:

    {
        "RACK_1": {
            2: 2
        },
        "RACK_2": {
            0: 2
        },
        "RACK_3": {
            1: 3
        }
    }
    """

    detected = {

        "RACK_1": {},
        "RACK_2": {},
        "RACK_3": {}

    }


    for detection in detections:

        rack = detection["rack"]

        class_id = detection["class_id"]


        if class_id not in detected[rack]:

            detected[rack][class_id] = 0


        detected[rack][class_id] += 1


    return detected


# ============================================================
# COMPARE EXPECTED VS DETECTED
# ============================================================

def compare_inventory(expected, detected):
    """
    Compare QR expected inventory with YOLO detected inventory.

    Status:

        PASS
        MISSING
        EXTRA
    """

    comparison = {}


    all_racks = {
        "RACK_1",
        "RACK_2",
        "RACK_3"
    }


    for rack in all_racks:

        comparison[rack] = {}


        expected_items = expected.get(
            rack,
            {}
        )

        detected_items = detected.get(
            rack,
            {}
        )


        # Classes appearing in either expected
        # or detected inventory
        all_classes = (
            set(expected_items.keys())
            |
            set(detected_items.keys())
        )


        for class_id in all_classes:

            expected_count = expected_items.get(
                class_id,
                0
            )

            detected_count = detected_items.get(
                class_id,
                0
            )


            # ------------------------------------------------
            # Determine status
            # ------------------------------------------------

            if detected_count == expected_count:

                status = "PASS"

            elif detected_count < expected_count:

                status = "MISSING"

            else:

                status = "EXTRA"


            class_name = CLASS_NAMES.get(
                class_id,
                f"class_{class_id}"
            )


            comparison[rack][class_name] = {

                "class_id": class_id,

                "expected": expected_count,

                "detected": detected_count,

                "difference": (
                    detected_count -
                    expected_count
                ),

                "status": status

            }


    return comparison


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {

        "message": "Warehouse Inspector API",

        "status": "running",

        "model": "yolo26n.pt",

        "endpoints": {

            "health": "/health",

            "upload": "/api/upload",

            "result_image": "/api/result-image"

        }

    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {

        "status": "healthy",

        "model": "yolo26n.pt",

        "model_exists": MODEL_PATH.exists()

    }


# Global in-memory cache of latest inspection
LATEST_INSPECTION = {
    "result": None,
    "timestamp": None
}

# ============================================================
# LATEST INSPECTION ENDPOINT
# ============================================================

@app.get("/api/latest-inspection")
def get_latest_inspection():
    if LATEST_INSPECTION["result"] is None:
        return {
            "has_result": False,
            "timestamp": None,
            "result": None
        }
    return {
        "has_result": True,
        "timestamp": LATEST_INSPECTION["timestamp"],
        "result": LATEST_INSPECTION["result"]
    }


# ============================================================
# RESULT IMAGE ENDPOINT
# ============================================================

@app.get("/api/result-image")
def result_image():

    result_path = (
        RESULT_DIR /
        "inspection_result.jpg"
    )


    if not result_path.exists():

        return JSONResponse(

            status_code=404,

            content={
                "error":
                "No inspection result available."
            }

        )


    return {

        "image_url":
        "/results/inspection_result.jpg"

    }


# ============================================================
# MAIN UPLOAD / INSPECTION ENDPOINT
# ============================================================

@app.post("/api/upload")
async def upload_image(file: Optional[UploadFile] = File(None), request: Request = None):
    """Inspect an image, persist the results, and notify subscribers via SNS."""
    global LATEST_INSPECTION

    inspection_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # Accept either multipart/form-data with a file field or a raw image body.
    if file is not None:
        image_bytes = await file.read()
    elif request is not None:
        image_bytes = await request.body()
    else:
        raise HTTPException(status_code=400, detail="No image provided.")

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image format.")

    original_path = UPLOAD_DIR / f"{inspection_id}_original.jpg"
    if not cv2.imwrite(str(original_path), image):
        raise HTTPException(status_code=500, detail="Could not save uploaded image.")

    original_s3_key = f"inspections/{inspection_id}/original.jpg"
    cropped_s3_key = f"inspections/{inspection_id}/cropped.jpg"
    annotated_s3_key = f"inspections/{inspection_id}/annotated.jpg"

    cloud_storage = {
        "s3_original": "not_configured",
        "s3_cropped": "not_configured",
        "s3_annotated": "not_configured",
    }
    if S3_BUCKET_NAME and s3_client is not None:
        cloud_storage["s3_original"] = (
            "saved" if upload_to_s3(original_path, original_s3_key) else "failed"
        )

    # QR content must contain the expected rack inventory JSON (or a URL to it).
    qr_data = detect_qr(image)
    if not qr_data:
        raise HTTPException(status_code=400, detail="No QR code detected in the image.")
    try:
        expected_inventory = normalize_inventory(parse_inventory_from_qr(qr_data))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse QR inventory data: {exc}")

    cropped_image = crop_esp_image(image)
    cropped_path = UPLOAD_DIR / f"{inspection_id}_cropped.jpg"
    if not cv2.imwrite(str(cropped_path), cropped_image):
        raise HTTPException(status_code=500, detail="Could not save cropped image.")

    if S3_BUCKET_NAME and s3_client is not None:
        cloud_storage["s3_cropped"] = (
            "saved" if upload_to_s3(cropped_path, cropped_s3_key) else "failed"
        )

    # run_yolo writes the annotated image to RESULT_DIR/inspection_result.jpg.
    try:
        detections = run_yolo(str(cropped_path))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Object detection failed: {exc}")

    detected_inventory = count_detections(detections)
    comparison = compare_inventory(expected_inventory, detected_inventory)
    overall_status = (
        "PASS"
        if all(
            item.get("status") == "PASS"
            for rack_items in comparison.values()
            for item in rack_items.values()
        )
        else "FAIL"
    )

    annotated_path = RESULT_DIR / "inspection_result.jpg"
    if not annotated_path.exists():
        raise HTTPException(status_code=500, detail="Annotated result image was not created.")

    # Keep a per-inspection copy as well as the stable image used by the frontend.
    per_inspection_annotated = RESULT_DIR / f"{inspection_id}_annotated.jpg"
    try:
        per_inspection_annotated.write_bytes(annotated_path.read_bytes())
    except OSError as exc:
        print(f"WARNING: Could not copy annotated image: {exc}")
        per_inspection_annotated = annotated_path

    if S3_BUCKET_NAME and s3_client is not None:
        cloud_storage["s3_annotated"] = (
            "saved" if upload_to_s3(per_inspection_annotated, annotated_s3_key) else "failed"
        )

    response = {
        "success": True,
        "inspection_id": inspection_id,
        "timestamp": timestamp,
        "overall_status": overall_status,
        "qr": {"data": qr_data},
        "expected_inventory": expected_inventory,
        "detected_inventory": detected_inventory,
        "detections": detections,
        "comparison": comparison,
        "result_image": f"/results/inspection_result.jpg",
        "cloud_storage": cloud_storage,
    }

    # DynamoDB does not accept Python float values; convert recursively to Decimal.
    inspection_record = make_dynamodb_safe({
        "inspection_id": inspection_id,
        "timestamp": timestamp,
        "overall_status": overall_status,
        "qr_data": qr_data,
        "expected_inventory": expected_inventory,
        "detected_inventory": detected_inventory,
        "detections": detections,
        "comparison": comparison,
        "original_image": original_s3_key,
        "cropped_image": cropped_s3_key,
        "annotated_image": annotated_s3_key,
    })

    try:
        dynamodb_table.put_item(Item=inspection_record)
        response["cloud_storage"]["dynamodb"] = "saved"
    except Exception as exc:
        response["cloud_storage"]["dynamodb"] = "failed"
        print(f"WARNING: DynamoDB save failed for {inspection_id}: {exc}")

    # Send an email for every completed inspection, whether PASS or FAIL.
    try:
        message = (
            f"Warehouse Inspection Result: {overall_status}\n\n"
            f"Inspection ID: {inspection_id}\n"
            f"Timestamp: {timestamp}\n\n"
            f"Expected Inventory:\n{json.dumps(expected_inventory, indent=2)}\n\n"
            f"Detected Inventory:\n{json.dumps(detected_inventory, indent=2)}\n\n"
            f"Comparison:\n{json.dumps(comparison, indent=2)}\n\n"
            f"Original image S3 key: {original_s3_key}\n"
            f"Cropped image S3 key: {cropped_s3_key}\n"
            f"Annotated image S3 key: {annotated_s3_key}\n"
        )
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=f"Warehouse Inspection: {overall_status}",
            Message=message,
        )
        response["cloud_storage"]["sns"] = "sent"
        print(f"SNS notification sent for {inspection_id} ({overall_status})")
    except Exception as exc:
        response["cloud_storage"]["sns"] = "failed"
        print(f"WARNING: SNS notification failed for {inspection_id}: {exc}")

    LATEST_INSPECTION = {"result": response, "timestamp": timestamp}
    print(f"Inspection {inspection_id} completed: {overall_status}")
    return response


# ============================================================
# STATIC FILES (RESULTS & UPLOADS)
# ============================================================

app.mount(
    "/results",
    StaticFiles(directory=str(RESULT_DIR)),
    name="results"
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)