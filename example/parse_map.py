from PIL import Image
import json


def rgb_of_pixel(img, x, y):
    r, g, b = img.getpixel((x, y))
    return (r, g, b)


width = 64
height = 20

objects = []

img = Image.open("sources/map.png").convert('RGB')

for x in range(width):
    for y in range(height):
        r, g, b = rgb_of_pixel(img, x, y)

        y = height - y - 1

        if (r == 0 and g == 255 and b == 0):  # green == tile
            objects.append({"type": "tile-1", "x": x, "y":  y})

        elif (r == 0 and g == 0 and b == 255):  # blue == coin
            objects.append({"type": "coin", "x": x, "y": y})

        elif (r == 255 and g == 0 and b == 0):  # red == light source
            objects.append({"type": "light", "x": x, "y": y})

with open("assets/objects.json", 'w') as f:
    dump = json.dumps(objects, indent=4)
    print(dump, file=f)
