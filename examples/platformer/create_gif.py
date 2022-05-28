import base64
import time
import io
import json
import base64
from PIL import Image
from numpy import append

file = open("img.json", 'r')

data = json.load(file)


i = 0

frames = []

for key in data:

    if (key == "deaths" or key == "level"):
        continue

    frame = int(key)
    value = data[key].replace("data:image/png;base64,", "")
    img = Image.open(io.BytesIO(base64.decodebytes(bytes(value, "utf-8"))))
    img = img.resize((img.width * 2, img.height*2), Image.NEAREST)

    frames.append(img)

    # img.save(f"frames/{key}.png")


frames[0].save(f'media/gif_{int(time.time())}.gif',  format='GIF', append_images=frames[1:],
               save_all=True, duration=1000.0 / 25.0, loop=0)
