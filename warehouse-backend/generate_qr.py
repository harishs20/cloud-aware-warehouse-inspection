import json
import argparse
from pathlib import Path
import qrcode
from PIL import Image

# Class definitions
CLASS_MAP = {
    0: "cap",
    1: "charger_brick",
    2: "earbud_container"
}

NAME_TO_ID = {
    "cap": 0,
    "charger_brick": 1,
    "charger": 1,
    "earbud_container": 2,
    "earbud": 2,
    "earbuds": 2
}

def create_rack_inventory(
    rack1_items: dict = None,
    rack2_items: dict = None,
    rack3_items: dict = None
) -> dict:
    """
    Construct standardized rack inventory dictionary.
    Keys are string class IDs ("0", "1", "2") and values are integer quantities.
    """
    inventory = {
        "RACK_1": {str(k): int(v) for k, v in (rack1_items or {}).items()},
        "RACK_2": {str(k): int(v) for k, v in (rack2_items or {}).items()},
        "RACK_3": {str(k): int(v) for k, v in (rack3_items or {}).items()}
    }
    return inventory

def generate_qr_image(inventory_data: dict, output_path: str = "rack_qr.png") -> Path:
    """
    Encode inventory JSON into a QR code PNG image.
    """
    # Generate compact JSON
    json_str = json.dumps(inventory_data, separators=(',', ':'))
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(json_str)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    out_file = Path(output_path).resolve()
    img.save(str(out_file))
    
    print("=" * 50)
    print("QR Code Generated Successfully!")
    print(f"Saved to: {out_file}")
    print("Embedded JSON Content:")
    print(json.dumps(inventory_data, indent=2))
    print("=" * 50)
    return out_file

def interactive_mode():
    print("\n--- Warehouse Rack QR Code Generator ---")
    print("Classes: [0: cap, 1: charger_brick, 2: earbud_container]\n")
    
    def prompt_rack(rack_name):
        print(f"Enter item quantities for {rack_name}:")
        items = {}
        for class_id, name in CLASS_MAP.items():
            val = input(f"  Count for {name} (Class {class_id}) [0]: ").strip()
            count = int(val) if val.isdigit() else 0
            if count > 0:
                items[str(class_id)] = count
        return items

    rack1 = prompt_rack("RACK_1 (Top Shelf)")
    rack2 = prompt_rack("RACK_2 (Middle Shelf)")
    rack3 = prompt_rack("RACK_3 (Bottom Shelf)")
    
    inv = create_rack_inventory(rack1, rack2, rack3)
    filename = input("\nEnter output filename (default: rack_qr.png): ").strip() or "rack_qr.png"
    generate_qr_image(inv, filename)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Warehouse Rack Inventory QR Code")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive prompt to build inventory")
    parser.add_argument("--output", "-o", default="rack_qr.png", help="Output image filename (default: rack_qr.png)")
    parser.add_argument("--r1-cap", type=int, default=0, help="Rack 1 cap count")
    parser.add_argument("--r1-charger", type=int, default=0, help="Rack 1 charger count")
    parser.add_argument("--r1-earbud", type=int, default=0, help="Rack 1 earbud count")
    parser.add_argument("--r2-cap", type=int, default=0, help="Rack 2 cap count")
    parser.add_argument("--r2-charger", type=int, default=0, help="Rack 2 charger count")
    parser.add_argument("--r2-earbud", type=int, default=0, help="Rack 2 earbud count")
    parser.add_argument("--r3-cap", type=int, default=0, help="Rack 3 cap count")
    parser.add_argument("--r3-charger", type=int, default=0, help="Rack 3 charger count")
    parser.add_argument("--r3-earbud", type=int, default=0, help="Rack 3 earbud count")
    parser.add_argument("--sample", "-s", action="store_true", help="Generate standard sample inventory QR")

    args = parser.parse_args()

    if args.interactive:
        interactive_mode()
    elif args.sample or not any([
        args.r1_cap, args.r1_charger, args.r1_earbud,
        args.r2_cap, args.r2_charger, args.r2_earbud,
        args.r3_cap, args.r3_charger, args.r3_earbud
    ]):
        # Default sample inventory:
        # Rack 1 (Top): 2 earbud containers (class 2)
        # Rack 2 (Mid): 2 caps (class 0)
        # Rack 3 (Bot): 3 charger bricks (class 1)
        sample_inv = {
            "RACK_1": {"2": 2},
            "RACK_2": {"0": 2},
            "RACK_3": {"1": 3}
        }
        print("Using default standard rack layout (use -i for interactive or --help for custom args)")
        generate_qr_image(sample_inv, args.output)
    else:
        inv = {
            "RACK_1": {},
            "RACK_2": {},
            "RACK_3": {}
        }
        if args.r1_cap: inv["RACK_1"]["0"] = args.r1_cap
        if args.r1_charger: inv["RACK_1"]["1"] = args.r1_charger
        if args.r1_earbud: inv["RACK_1"]["2"] = args.r1_earbud

        if args.r2_cap: inv["RACK_2"]["0"] = args.r2_cap
        if args.r2_charger: inv["RACK_2"]["1"] = args.r2_charger
        if args.r2_earbud: inv["RACK_2"]["2"] = args.r2_earbud

        if args.r3_cap: inv["RACK_3"]["0"] = args.r3_cap
        if args.r3_charger: inv["RACK_3"]["1"] = args.r3_charger
        if args.r3_earbud: inv["RACK_3"]["2"] = args.r3_earbud

        generate_qr_image(inv, args.output)
