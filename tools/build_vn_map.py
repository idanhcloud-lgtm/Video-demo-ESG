"""Build src/data/vnMap.json for the warehouse-network video from Natural Earth 10m data.

Usage: python3 -I tools/build_vn_map.py <ne_10m_admin_0_countries_vnm.geojson> <ne_10m_rivers_lake_centerlines.geojson>
The Vietnam point-of-view country file is used so that the Hoang Sa and Truong Sa archipelagos belong to Vietnam.
Coordinates stay in lon/lat (3 decimals); the video projects them.
"""
import json
import sys

from shapely.geometry import box, shape, mapping

countries_path, rivers_path = sys.argv[1], sys.argv[2]
OUT = 'src/data/vnMap.json'
VIEW = box(96.5, 4.5, 121.0, 26.5)


def rings(geom, tol):
    g = geom.simplify(tol, preserve_topology=True) if tol else geom
    polys = [g] if g.geom_type == 'Polygon' else list(getattr(g, 'geoms', []))
    out = []
    for p in polys:
        if p.is_empty or p.geom_type != 'Polygon':
            continue
        out.append([[round(x, 3), round(y, 3)] for x, y in p.exterior.coords])
    return out


countries = json.load(open(countries_path, encoding='utf-8'))
vn, neighbours, hoang_sa, truong_sa = [], [], [], []
for f in countries['features']:
    a3 = f['properties'].get('ADM0_A3')
    geom = shape(f['geometry'])
    if a3 == 'VNM':
        for p in getattr(geom, 'geoms', [geom]):
            c = p.centroid
            if 110.5 < c.x < 113.5 and 15 < c.y < 17.5:
                hoang_sa.append([round(c.x, 3), round(c.y, 3)])
            elif 113.5 < c.x < 117.5 and 6 < c.y < 12.5:
                truong_sa.append([round(c.x, 3), round(c.y, 3)])
            else:
                vn += rings(p, 0.002 if p.area > 1 else 0)
    elif geom.intersects(VIEW) and a3 in ('CHN', 'LAO', 'KHM', 'THA', 'MYS', 'PHL', 'MMR', 'IDN', 'BRN', 'TWN'):
        neighbours += rings(geom.intersection(VIEW), 0.02)

rivers_in = json.load(open(rivers_path, encoding='utf-8'))
VN_BOX = box(102, 8.3, 109.6, 23.5)
rivers = []
for f in rivers_in['features']:
    if f['properties'].get('featurecla') != 'River':
        continue
    g = shape(f['geometry'])
    if not g.intersects(VN_BOX):
        continue
    g = g.intersection(VN_BOX).simplify(0.004)
    for line in getattr(g, 'geoms', [g]):
        if line.geom_type == 'LineString' and len(line.coords) > 1:
            rivers.append([[round(x, 3), round(y, 3)] for x, y in line.coords])

json.dump({'vn': vn, 'neighbours': neighbours, 'rivers': rivers, 'hoangSa': hoang_sa, 'truongSa': truong_sa},
          open(OUT, 'w', encoding='utf-8'), separators=(',', ':'))
print('vn rings', len(vn), 'neighbour rings', len(neighbours), 'rivers', len(rivers), 'hoang sa', len(hoang_sa), 'truong sa', len(truong_sa))
