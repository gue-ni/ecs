from PIL import Image
import json


def rgb_of_pixel(img_path, x, y):
    im = Image.open(img_path).convert('RGB')
    r, g, b = im.getpixel((x, y))
    return (r, g, b)


width = 64
height = 20

objects = []

for x in range(width):
    for y in range(height):
        r, g, b = rgb_of_pixel("sources/map.png", x, y)

        y = height - y - 1

        if (r == 0 and g == 255 and b == 0):
            objects.append({"type": "tile-1", "x": x, "y":  y})

        elif (r == 0 and g == 0 and b == 255):
            objects.append({"type": "coin", "x": x, "y": y})

        elif (r == 255 and g == 0 and b == 0):
            objects.append({"type": "light", "x": x, "y": y})

with open("assets/objects.json", 'w') as f:
    dump = json.dumps(objects, indent=4)
    print(dump, file=f)
