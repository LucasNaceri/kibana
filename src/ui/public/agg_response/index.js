import { BuildHierarchicalDataProvider } from './hierarchical/build_hierarchical_data';
import { AggResponsePointSeriesProvider } from './point_series/point_series';
import { tabifyAggResponse } from './tabify/tabify';
import { AggResponseGeoJsonProvider } from './geo_json/geo_json';

export function AggResponseIndexProvider(Private) {
  return {
    hierarchical: Private(BuildHierarchicalDataProvider),
    pointSeries: Private(AggResponsePointSeriesProvider),
    tabify: tabifyAggResponse,
    geoJson: Private(AggResponseGeoJsonProvider)
  };
}
