from PIL import Image
import json


WIDTH = 40
HEIGHT = 23


def rgb_of_pixel(img, x, y):
    r, g, b = img.getpixel((x, y))
    return (r, g, b)


def parse_level(level):

    objects = []

    img = Image.open(f"assets/level-{level}.png").convert('RGB')

    for x in range(WIDTH):
        for y in range(HEIGHT):
            r, g, b = rgb_of_pixel(img, x, y)

            y = HEIGHT - y - 1
            coords = {"x": x, "y":  y}

            if (r == 0 and g == 255 and b == 0):  # green == tile
                objects.append({"type": "tile", **coords})

            elif (r == 255 and g == 0 and b == 0):  # green == tile
                objects.append({"type": "player", **coords})

            elif (r == 0 and g == 0 and b == 255):  # green == tile
                objects.append({"type": "spike", **coords})

            elif (r == 0 and g == 255 and b == 255):  # green == tile
                objects.append({"type": "bounce", **coords})

            elif (r == 255 and g == 0 and b == 255):  # green == tile
                objects.append({"type": "dash", **coords})




    with open(f"assets/level-{level}.json", 'w') as f:
        dump = json.dumps(objects, indent=4)
        print(dump, file=f)


parse_level(1)
