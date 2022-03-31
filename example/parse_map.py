from PIL import Image
import json


WIDTH = 76
HEIGHT = 20


def rgb_of_pixel(img, x, y):
    r, g, b = img.getpixel((x, y))
    return (r, g, b)


def parse_level(level):

    objects = []

    img = Image.open(f"sources/level-{level}.png").convert('RGB')

    for x in range(WIDTH):
        for y in range(HEIGHT):
            r, g, b = rgb_of_pixel(img, x, y)

            y = HEIGHT - y - 1

            if (r == 0 and g == 255 and b == 0):  # green == tile
                objects.append({"type": "tile-1", "x": x, "y":  y})

            elif (r == 0 and g == 0 and b == 255):  # blue == coin
                objects.append({"type": "coin", "x": x, "y": y})

            elif (r == 255 and g == 0 and b == 0):  # red == light source
                objects.append({"type": "light", "x": x, "y": y})

            elif (r == 255 and g == 255 and b == 0):  # red == light source
                objects.append({"type": "enemy-1", "x": x, "y": y})

            elif (r == 255 and g == 0 and b == 255): # pink ==  extra health
                objects.append({"type": "heart", "x": x, "y": y})

            elif (r == 0 and g == 255 and b == 255): # turqoise == player spawn point
                objects.append({"type": "player", "x": x, "y": y})

            elif (r == 0 and g == 0 and b == 0): # black ==  next level
                objects.append({"type": "exit", "x": x, "y": y})

            elif (r == 255 and g == 150 and b == 0): # black ==  next level
                objects.append({"type": "spikes", "x": x, "y": y})



    with open(f"assets/level-{level}.json", 'w') as f:
        dump = json.dumps(objects, indent=4)
        print(dump, file=f)


parse_level(1)
parse_level(2)
parse_level(3)