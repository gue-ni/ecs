import base64
import io
import json
import base64
from PIL import Image
import cv2
import numpy as np
from datetime import datetime


# https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#gif

i = 0

frames = []

fps = 20.0
now = datetime.now().strftime("%Y-%m-%d_%H%M")
writer = cv2.VideoWriter_fourcc(*'avc1')
video = cv2.VideoWriter(
    f"media/mp4/video_{now}.mp4", writer, fps, (320 * 4, 180 * 4))


file = open("media/img.json", 'r')
data = json.load(file)

for key in data:

    frame = 0
    try:
        frame = int(key)
    except:
        continue

    value = data[key].replace("data:image/png;base64,", "")
    img = Image.open(io.BytesIO(base64.decodebytes(bytes(value, "utf-8"))))
    img = img.resize((img.width * 4, img.height * 4), Image.NEAREST)

    video.write(cv2.cvtColor(np.array(img.copy()), cv2.COLOR_RGB2BGR))

    frames.append(img)

    # img.save(f"media/frames/{key}.png")


frames[0].save(f'media/gif/video_{now}.gif',  format='GIF', append_images=frames[1:],
               save_all=True, duration=int(1000.0 / fps), loop=0)

frames[0].save(f'media/webp/video_{now}.webp',  format='WEBP', append_images=frames[1:], quality=100,
               save_all=True, duration=int(1000.0 / fps), loop=0)
