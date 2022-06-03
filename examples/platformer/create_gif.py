import base64
import time
import io
import json
import base64
from PIL import Image

file = open("media/img.json", 'r')

data = json.load(file)

# https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#gif

i = 0

frames = []

for key in data:

    frame = 0
    try:
        frame = int(key)
    except:
        continue

    value = data[key].replace("data:image/png;base64,", "")
    img = Image.open(io.BytesIO(base64.decodebytes(bytes(value, "utf-8"))))
    img = img.resize((img.width * 2, img.height*2), Image.NEAREST)

    frames.append(img)

    img.save(f"media/frames/{key}.png")


fps = 20.0
timestamp = int(time.time())
frames[0].save(f'media/video_{timestamp}.gif',  format='GIF', append_images=frames[1:],
               save_all=True, duration=int(1000.0 / fps), loop=0)

frames[0].save(f'media/video_{timestamp}.webp',  format='WEBP', append_images=frames[1:], quality=100,
               save_all=True, duration=int(1000.0 / fps), loop=0)
