def get_coordinates(point_id, points_map):
    point_key = f"punto{point_id}"
    return points_map.get(point_key, None)

def get_next_patrol_point(current_index, total_points):
    return (current_index + 1) % total_points

def parse_decision(llm_output):
    try:
        parte = llm_output.upper().split("DECISIÓN:")[-1]
        if "[NAV_1]" in parte: return "[NAV_1]"
        if "[NAV_2]" in parte: return "[NAV_2]"
        return "[NONE]"
    except:
        return "[NONE]"
