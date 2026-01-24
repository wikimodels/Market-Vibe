import { ISeriesApi } from 'lightweight-charts';

export interface ChartLineObject {
  id: string;
  price: number;
  series: ISeriesApi<'Line'>;
  color: string;
  createdAt: string;
}
