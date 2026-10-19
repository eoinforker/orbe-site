# Orbe desk: model the static desk scene, bake an irradiance lightmap, export glTF.
# Blender 4.2, run headless:  blender -b -P desk.py -- OUTDIR SAMPLES RES
import bpy, bmesh, math, sys, os, json
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "/tmp/desk-out"
SAMPLES = int(argv[1]) if len(argv) > 1 else 64
RES = int(argv[2]) if len(argv) > 2 else 1024
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hexcol(h):
    h = h.lstrip("#")
    return tuple(srgb_to_lin(int(h[i:i + 2], 16)) for i in (0, 2, 4)) + (1.0,)

PAL = {
    "desk": hexcol("F2879E"),      # peony
    "deskedge": hexcol("E2768F"),
    "beige": hexcol("E7E2D7"),     # linen plastic
    "beige2": hexcol("D9D2C3"),
    "key": hexcol("F3F0E8"),       # paper keycaps
    "keymod": hexcol("D9D2C3"),
    "ink": hexcol("141311"),
    "bezel": hexcol("2A2824"),
    "ember": hexcol("FF5A1F"),
    "wood": hexcol("EED5A8"),
    "cobalt": hexcol("1F4BFF"),
    "sky": hexcol("9EE9FB"),
}

parts = []

def finish(obj, col, bevel=0.0, segs=3):
    if bevel > 0:
        m = obj.modifiers.new("bev", "BEVEL")
        m.width = bevel
        m.segments = segs
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(40)
        m.harden_normals = False
    obj["albedo"] = col
    parts.append(obj)
    return obj

def box(name, size, loc, col, bevel=0.0, segs=3, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, col, bevel, segs)

# ---------------------------------------------------------------- desk (top surface at z = 0)
DESK_W, DESK_D, DESK_T = 1.24, 0.64, 0.05
box("desk", (DESK_W, DESK_D, DESK_T), (0, 0, -DESK_T / 2), PAL["desk"], bevel=0.012, segs=5)
# a slim ink strip under the top so the slab reads as a desk, not a tile
box("deskband", (DESK_W - 0.05, DESK_D - 0.05, 0.022), (0, 0, -DESK_T - 0.011), PAL["ink"], bevel=0.004, segs=2)
# ---------------------------------------------------------------- monitor (front faces -Y)
MX, MY = 0.0, 0.10
foot = box("mfoot", (0.26, 0.24, 0.022), (MX, MY + 0.02, 0.011), PAL["beige2"], bevel=0.008, segs=3)
neck = box("mneck", (0.12, 0.10, 0.03), (MX, MY + 0.03, 0.035), PAL["beige2"], bevel=0.006, segs=2)
BODY_W, BODY_H, BODY_D = 0.42, 0.37, 0.30
BZ = 0.05 + BODY_H / 2
body = box("mbody", (BODY_W, BODY_D, BODY_H), (MX, MY, BZ), PAL["beige"], bevel=0.022, segs=5)
# the CRT back, tapered
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.215, radius2=0.12, depth=0.17, location=(MX, MY + BODY_D / 2 + 0.07, BZ + 0.005), rotation=(math.radians(-90), 0, math.radians(45)))
back = bpy.context.active_object
back.name = "mback"
back.scale = (1.0, 0.86, 1.0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
finish(back, PAL["beige2"], bevel=0.012, segs=3)
# screen recess: cut into the front face with a boolean
SCR_W, SCR_H = 0.315, 0.236
SZ = BZ + 0.03
front_y = MY - BODY_D / 2
bpy.ops.mesh.primitive_cube_add(size=1, location=(MX, front_y, SZ))
cut = bpy.context.active_object
cut.scale = (SCR_W + 0.028, 0.05, SCR_H + 0.028)
bpy.ops.object.transform_apply(scale=True)
bm = body.modifiers.new("cut", "BOOLEAN")
bm.object = cut
bm.operation = "DIFFERENCE"
bm.solver = "EXACT"
# move bevel after boolean
body.modifiers.move(1, 0)
cut.hide_render = True
cut.hide_viewport = True
# the dark bezel inside the recess
box("mbezel", (SCR_W + 0.03, 0.02, SCR_H + 0.03), (MX, front_y + 0.024, SZ), PAL["bezel"], bevel=0.01, segs=4)
# floppy slot and a small ember key under the screen
box("mslot", (0.10, 0.006, 0.007), (MX + 0.085, front_y - 0.0005, BZ - BODY_H / 2 + 0.05), PAL["bezel"], bevel=0.002, segs=1)
box("mlogo", (0.018, 0.004, 0.018), (MX - 0.15, front_y - 0.001, BZ - BODY_H / 2 + 0.05), PAL["ember"], bevel=0.003, segs=2)
# vents on the right side
for i in range(7):
    box("mvent", (0.004, 0.14, 0.006), (MX + BODY_W / 2 + 0.0005, MY + 0.03, BZ + 0.10 - i * 0.022), PAL["beige2"], bevel=0.0015, segs=1)

# ---------------------------------------------------------------- the screen, its own object with a 0..1 UV
bpy.ops.mesh.primitive_grid_add(x_subdivisions=16, y_subdivisions=12, size=1, location=(0, 0, 0))
scr = bpy.context.active_object
scr.name = "screen"
for v in scr.data.vertices:
    x, y = v.co.x, v.co.y
    v.co = Vector((x * SCR_W, -(0.0 + 0.010 * (1 - (2 * x) ** 2) * (1 - (2 * y) ** 2)), y * SCR_H))
scr.location = (MX, front_y + 0.0135, SZ)
# UV: grid_add gives a 0..1 UV already

# ---------------------------------------------------------------- keyboard
KX, KY = -0.02, -0.17
kb = box("kbody", (0.42, 0.145, 0.018), (KX, KY, 0.009), PAL["beige"], bevel=0.006, segs=3)
U = 0.0245
rows = [
    [1] * 13 + [1.5],
    [1.5] + [1] * 12 + [1],
    [1.75] + [1] * 11 + [1.75],
    [2.25] + [1] * 10 + [2.25],
    [1.25, 1.25, 1.25, 6.0, 1.25, 1.25, 1.25],
]
kz = 0.018 + 0.005
for r, row in enumerate(rows):
    total = sum(row) * U
    x = KX - total / 2
    y = KY + 0.052 - r * U
    for i, w in enumerate(row):
        cx = x + w * U / 2
        mod = (w != 1) or r == 4
        box("key", (w * U - 0.0045, U - 0.0045, 0.009), (cx, y, kz), PAL["keymod"] if mod else PAL["key"], bevel=0.0022, segs=2)
        x += w * U

# ---------------------------------------------------------------- pencil, lying beside the keyboard
PL = 0.17
px, py, pa = 0.238, -0.205, math.radians(74)
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0042, depth=PL, location=(0, 0, 0), rotation=(0, math.radians(90), 0))
pen = bpy.context.active_object
pen.name = "pencil"
bpy.ops.object.transform_apply(rotation=True)
pen.matrix_world = Matrix.Translation((px, py, 0.0042 * 0.87)) @ Matrix.Rotation(pa, 4, "Z")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
finish(pen, PAL["ember"])
bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.0042, radius2=0.0008, depth=0.022, rotation=(0, math.radians(90), 0))
tip = bpy.context.active_object
bpy.ops.object.transform_apply(rotation=True)
d = Vector((math.cos(pa), math.sin(pa), 0))
tip.matrix_world = Matrix.Translation(Vector((px, py, 0.0042 * 0.87)) + d * (PL / 2 + 0.011)) @ Matrix.Rotation(pa, 4, "Z")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
finish(tip, PAL["wood"])
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.0044, depth=0.014, rotation=(0, math.radians(90), 0))
fer = bpy.context.active_object
bpy.ops.object.transform_apply(rotation=True)
fer.matrix_world = Matrix.Translation(Vector((px, py, 0.0042 * 0.87)) - d * (PL / 2 + 0.007)) @ Matrix.Rotation(pa, 4, "Z")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
finish(fer, PAL["ink"])

# ---------------------------------------------------------------- the rack for the five creators' orbs (back right)
RX0, RX1, RY = -0.585, -0.285, 0.185
box("rack", (RX1 - RX0, 0.056, 0.014), ((RX0 + RX1) / 2, RY, 0.007), PAL["ink"], bevel=0.004, segs=2)
for i in range(5):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.013, depth=0.004, location=(RX0 + 0.03 + i * 0.06, RY, 0.0152))
    finish(bpy.context.active_object, PAL["bezel"])

# ---------------------------------------------------------------- proxies for the moving things, so the bake sees their shade
# They are excluded from the export: three.js draws them live with real time shadows.
proxies = []

# ---------------------------------------------------------------- apply modifiers, set vertex colour albedo, join
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
bpy.ops.object.convert(target="MESH")
for o in parts:
    me = o.data
    if "albedo" not in me.color_attributes:
        me.color_attributes.new(name="albedo", type="FLOAT_COLOR", domain="CORNER")
    ca = me.color_attributes["albedo"]
    c = o["albedo"]
    for d_ in ca.data:
        d_.color = c
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
statics = bpy.context.active_object
statics.name = "desk"
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))

# lightmap UVs
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, area_weight=0.0, scale_to_bounds=False)
bpy.ops.uv.pack_islands(margin=0.003, rotate=True)
bpy.ops.object.mode_set(mode="OBJECT")

# ---------------------------------------------------------------- ground, shadow catcher
FLOOR_Z = -0.20
bpy.ops.mesh.primitive_plane_add(size=2.6, location=(0, 0, FLOOR_Z))
ground = bpy.context.active_object
ground.name = "ground"

# ---------------------------------------------------------------- materials for the bake
def mat_vcol(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.7
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = "albedo"
    nt.links.new(a.outputs["Color"], bsdf.inputs["Base Color"])
    return m

def mat_flat(name, col, rough=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = rough
    return m

statics.data.materials.append(mat_vcol("statics"))
ground.data.materials.append(mat_flat("ground", PAL["sky"]))
scr.data.materials.append(mat_flat("screen", hexcol("F3F0E8")))
for p in proxies:
    p.data.materials.append(mat_flat("proxy", PAL["cobalt"], 0.3))

# ---------------------------------------------------------------- light
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = hexcol("BFEFFC")
bg.inputs["Strength"].default_value = 0.55

sun_d = Vector((-0.55, -0.62, 1.0)).normalized()   # from the front left, high
bpy.ops.object.light_add(type="SUN", location=(0, 0, 3))
sun = bpy.context.active_object
sun.data.energy = 2.6
sun.data.angle = math.radians(9)
sun.data.color = hexcol("FFF4E4")[:3]
sun.rotation_euler = sun_d.to_track_quat("Z", "Y").to_euler()

bpy.ops.object.light_add(type="AREA", location=(1.2, -1.0, 1.1))
fill = bpy.context.active_object
fill.data.energy = 60
fill.data.size = 1.6
fill.data.color = hexcol("FFE8EC")[:3]
fill.rotation_euler = (Vector((0, 0, 0)) - fill.location).to_track_quat("-Z", "Y").to_euler()

json.dump({"sun_dir_blender": list(sun_d), "floor_z": FLOOR_Z, "screen": {"w": SCR_W, "h": SCR_H, "x": MX, "y": front_y + 0.0135, "z": SZ},
           "desk": {"w": DESK_W, "d": DESK_D}, "monitor": {"x": MX, "y": MY, "w": BODY_W, "d": BODY_D + 0.17, "h": BODY_H},
           "keyboard": {"x": KX, "y": KY, "w": 0.42, "d": 0.145}, "pencil": {"x": px, "y": py, "a": pa, "l": PL}},
          open(os.path.join(OUT, "layout.json"), "w"), indent=1)

# ---------------------------------------------------------------- bake
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 4
scene.render.bake.margin = 6
scene.render.threads_mode = "FIXED"
scene.render.threads = 4

def bake(obj, name, res):
    img = bpy.data.images.new(name, res, res, float_buffer=True)
    img.colorspace_settings.name = "Linear Rec.709"
    mat = obj.data.materials[0]
    n = mat.node_tree.nodes.new("ShaderNodeTexImage")
    n.image = img
    mat.node_tree.nodes.active = n
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=6, use_clear=True)
    return img

import numpy as np
def dump(img, path):
    a = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
    np.save(path, a[..., :3])
dump(bake(ground, "groundL", 512), os.path.join(OUT, "ground-light.npy"))
dump(bake(statics, "deskL", RES), os.path.join(OUT, "desk-light.npy"))
dnorm = gnorm = None

# ---------------------------------------------------------------- export
for p in proxies:
    bpy.data.objects.remove(p, do_unlink=True)
bpy.data.objects.remove(cut, do_unlink=True)
for o in list(bpy.data.objects):
    if o.type == "LIGHT":
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action="DESELECT")
for o in (statics, ground, scr):
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "desk.glb"), use_selection=True, export_format="GLB",
    export_materials="NONE", export_vertex_color="ACTIVE", export_all_vertex_colors=False, export_normals=True,
    export_texcoords=True, export_apply=True, export_yup=True)
print("BAKED", dnorm, gnorm)
