import json
import os
import sys

import bpy
from mathutils import Vector


def inspect(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)

    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    points = []
    for obj in mesh_objects:
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)

    minimum = [min(point[index] for point in points) for index in range(3)] if points else [0, 0, 0]
    maximum = [max(point[index] for point in points) for index in range(3)] if points else [0, 0, 0]
    return {
        "file": os.path.basename(path),
        "boundsMin": minimum,
        "boundsMax": maximum,
        "dimensions": [maximum[index] - minimum[index] for index in range(3)],
        "meshCount": len(mesh_objects),
        "armatures": [
            {
                "name": armature.name,
                "boneCount": len(armature.data.bones),
                "bones": [bone.name for bone in armature.data.bones],
            }
            for armature in armatures
        ],
        "animations": [animation.name for animation in bpy.data.actions],
    }


if __name__ == "__main__":
    print(json.dumps([inspect(path) for path in sys.argv[sys.argv.index("--") + 1 :]], indent=2))
