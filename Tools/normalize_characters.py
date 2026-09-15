import json
import os
import sys

import bpy
from mathutils import Vector


TARGET_HEIGHT_METERS = 1.8


def world_bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector(min(point[index] for point in points) for index in range(3))
    maximum = Vector(max(point[index] for point in points) for index in range(3))
    return minimum, maximum


def normalize(source, destination):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    minimum, maximum = world_bounds(meshes)
    source_height = maximum.z - minimum.z
    scale = TARGET_HEIGHT_METERS / source_height

    roots = [obj for obj in bpy.context.scene.objects if obj.parent is None]
    character_root = bpy.data.objects.new("CharacterRoot", None)
    bpy.context.scene.collection.objects.link(character_root)
    for root in roots:
        root.parent = character_root

    character_root.scale = (scale, scale, scale)
    character_root.location = (0.0, 0.0, -minimum.z * scale)

    os.makedirs(os.path.dirname(destination), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = character_root
    bpy.ops.export_scene.fbx(
        filepath=destination,
        use_selection=True,
        apply_unit_scale=True,
        apply_scale_options="FBX_SCALE_UNITS",
        axis_forward="-Z",
        axis_up="Y",
        add_leaf_bones=False,
        bake_anim=True,
        path_mode="COPY",
        embed_textures=True,
    )

    return {
        "source": source,
        "output": destination,
        "sourceBoundsMin": list(minimum),
        "sourceBoundsMax": list(maximum),
        "sourceHeight": source_height,
        "normalizationScale": scale,
        "targetHeight": TARGET_HEIGHT_METERS,
        "armatures": [obj.name for obj in bpy.context.scene.objects if obj.type == "ARMATURE"],
    }


if __name__ == "__main__":
    arguments = sys.argv[sys.argv.index("--") + 1 :]
    if len(arguments) % 2 != 0:
        raise SystemExit("Expected source/destination pairs")
    results = [normalize(arguments[index], arguments[index + 1]) for index in range(0, len(arguments), 2)]
    print("WHX_NORMALIZATION=" + json.dumps(results))
