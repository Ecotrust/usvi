import os
from django.contrib.gis.utils import LayerMapping
from models import Area


area_mapping = {
    'id': 'ID',
    'geom': 'POLYGON',
}


shps = ['/vagrant/data/4326_Final_grid_2.5_noland.shp',
        '/vagrant/data/4326_Grid_STCroix_2.5x2.5_noland_final.shp', '/vagrant/data/4326_Grid_STTHomas_landout.shp']


def run(verbose=True):
    for shp in shps:
        lm = LayerMapping(Area, shp, area_mapping,
                      transform=True, encoding='iso-8859-1')
        lm.save(strict=True, verbose=verbose)
