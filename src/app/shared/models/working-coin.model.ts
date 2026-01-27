export interface WorkingCoin {
  symbol: string;
  exchanges: string[];
  category: number;
  categoryStr?: string;
  logoUrl?: string;

  // Signal Extensions
  btc_corr_1d_w30?: number;
  exhaustionScore?: number;
  exhaustionReasons?: string[];
}
