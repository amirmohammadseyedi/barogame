def total_capacity_from_crawl_data(data):
    if not isinstance(data, dict):
        return 0

    items = data.get('items', [])
    if not isinstance(items, list):
        return 0

    total = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        capacity = item.get('capacity', 0)
        if capacity is None:
            continue
        try:
            total += int(capacity)
        except (TypeError, ValueError):
            continue
    return total
