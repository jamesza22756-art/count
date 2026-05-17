from PIL import Image
import os

INPUT_FOLDER = "images/monster1"
OUTPUT_FOLDER = "images/monster1_fixed"

CANVAS_WIDTH = 127  
CANVAS_HEIGHT = 95

folders = ["idle", "move"]

# เลขนี้คือเส้นพื้น/ตำแหน่งเท้า
# ยิ่งเลขมาก ตัวจะอยู่ต่ำลง
FOOT_Y = 75

for folder in folders:
    input_path = os.path.join(INPUT_FOLDER, folder)
    output_path = os.path.join(OUTPUT_FOLDER, folder)
    os.makedirs(output_path, exist_ok=True)

    for filename in os.listdir(input_path):
        if not filename.lower().endswith(".png"):
            continue

        img = Image.open(os.path.join(input_path, filename)).convert("RGBA")

        canvas = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0, 0))

        x = (CANVAS_WIDTH - img.width) // 2

        # ให้ขอบล่างของรูปตรงกับเส้นเท้า
        y = FOOT_Y - img.height

        canvas.paste(img, (x, y), img)

        canvas.save(os.path.join(output_path, filename))

print("Done! Foot pivot aligned.")