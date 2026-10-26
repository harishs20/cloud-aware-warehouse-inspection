
import os
import shutil
from pathlib import Path

from ultralytics import YOLO

# SageMaker downloads the S3 training channel here.
data_dir = Path(os.environ["SM_CHANNEL_TRAINING"])
output_dir = Path(os.environ["SM_MODEL_DIR"])
data_yaml = data_dir / "data.yaml"

# Create an absolute-path YAML for the training container.
# This avoids dependence on the container's working directory.
import yaml

with open(data_yaml, "r") as f:
    config = yaml.safe_load(f)

config["path"] = str(data_dir)

runtime_yaml = Path("/tmp/warehouse_data.yaml")
with open(runtime_yaml, "w") as f:
    yaml.safe_dump(config, f)

checkpoint_dir = Path(os.environ["SM_CHANNEL_CHECKPOINT"])
model = YOLO(str(checkpoint_dir / "yolo26n.pt"))

results = model.train(
    data=str(runtime_yaml),
    epochs=100,
    imgsz=640,
    batch=8,
    device=0,
    patience=20,
    project="/tmp/yolo_runs",
    name="warehouse_sagemaker",
    exist_ok=True
)

run_dir = Path("/tmp/yolo_runs/warehouse_sagemaker")
output_dir.mkdir(parents=True, exist_ok=True)

# SageMaker packages SM_MODEL_DIR into model.tar.gz.
shutil.copy2(run_dir / "weights" / "best.pt",
             output_dir / "best.pt")

shutil.copy2(run_dir / "weights" / "last.pt",
             output_dir / "last.pt")

shutil.copy2(run_dir / "results.csv",
             output_dir / "results.csv")

print("Training completed. Model artifacts saved.")
