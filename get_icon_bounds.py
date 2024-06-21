from svgpathtools import svg2paths, wsvg
import os
from pathlib import Path
import json


def get_bbox(svg_file):
    old_paths, _ = svg2paths(os.path.join('icons_old', svg_file))

    colors = ['none']*len(old_paths)
    attributes = [{'fill': 'pink'}]*len(old_paths)
    wsvg(old_paths, colors=colors, filename=os.path.join('icons', svg_file), attributes=attributes)


    paths, _ = svg2paths(os.path.join('icons', svg_file))
    for i, path in enumerate(paths):
        if i == 0:
            xmin, xmax, ymin, ymax = path.bbox()
        else:
            p_xmin, p_xmax, p_ymin, p_ymax = path.bbox()
            xmin = min(p_xmin, xmin)
            xmax = max(p_xmax, xmax)
            ymin = min(p_ymin, ymin)
            ymax = max(p_ymax, ymax)
    
    print((xmax-xmin), (ymax-ymin))
    xmin /= 20.5
    xmax /= 20.5
    ymin /= 20.5
    ymax /= 20.5


    # print(xmin, xmax, ymin, ymax)
    # print((ymax-ymin) / (xmax-xmin))
    print((xmax-xmin), (ymax-ymin))

    return (-(xmax-xmin)*0.5, -(ymax-ymin)*0.5)


svg_offsets = {}

for filename in os.listdir('icons_old'):
    code = Path(os.path.join("icons", filename)).stem
    # if not code == "su":
    #       continue
    print(code)
    x_offset, y_offset = get_bbox(filename)
    x_scale, y_scale = (0.06, -0.06)
    if code in ['dd', 'su', 'cs', 'yu']:
        print("#######################")
        x_offset *= 10
        y_offset *= 10

    if code == "at":
        x_offset *= 5
        y_offset *= 5
        y_scale *= -1

    svg_offsets[code] = {'ox': x_offset, 'oy': y_offset, 'sx': x_scale, 'sy': y_scale}

with open(os.path.join("data", "icon_offsets.json"), "w") as output_file:
    json.dump(svg_offsets, output_file)