import struct, zlib, os

def make_png(w, h, pixels_rgba):
    def chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)
    raw = b''
    for row in pixels_rgba:
        raw += b'\x00'
        for r,g,b,a in row:
            raw += bytes([r,g,b,a])
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw))
    png += chunk(b'IEND', b'')
    return png

def draw_chat(r, g, b):
    W, H = 81, 81
    cx, cy, rx, ry = 40, 36, 32, 26
    pixels = []
    for y in range(H):
        row = []
        for x in range(W):
            dx = (x - cx) / rx
            dy = (y - cy) / ry
            in_bubble = dx*dx + dy*dy <= 1.0
            in_tail = (x >= 46 and x <= 58 and y >= 58 and y <= 70
                       and (x - 46) <= (70 - y) * 0.9)
            if in_bubble or in_tail:
                row.append((r, g, b, 255))
            else:
                row.append((0, 0, 0, 0))
        pixels.append(row)
    return make_png(W, H, pixels)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images', 'icons')
os.makedirs(out, exist_ok=True)

with open(os.path.join(out, 'chat.png'), 'wb') as f:
    f.write(draw_chat(162, 168, 176))
with open(os.path.join(out, 'chat-active.png'), 'wb') as f:
    f.write(draw_chat(15, 98, 254))
print('icons written to', out)
