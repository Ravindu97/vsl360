import { env } from '../config/env';
import logger from '../utils/logger';

type InrRates = {
  usdToInr: number;
  eurToInr: number;
  source: 'live' | 'cache' | 'fallback';
  asOf: string;
};

type FrankfurterLatestResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

const toFiniteNumber = (value: unknown, fallback: number): number => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export class FxRateService {
  private cache: InrRates | null = null;
  private cacheExpiresAtMs = 0;
  private inFlightRequest: Promise<InrRates> | null = null;

  private getFallbackRates(): InrRates {
    return {
      usdToInr: env.REPORT_USD_TO_INR,
      eurToInr: env.REPORT_EUR_TO_INR,
      source: 'fallback',
      asOf: new Date().toISOString(),
    };
  }

  private getCacheTtlMs(): number {
    const minutes = toFiniteNumber(env.FX_CACHE_TTL_MINUTES, 360);
    return Math.max(1, minutes) * 60 * 1000;
  }

  private async fetchUsdToInr(): Promise<{ rate: number; asOf: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `${env.FX_API_BASE_URL}/latest?from=USD&to=INR`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`FX API request failed with status ${response.status}`);
      const data = (await response.json()) as FrankfurterLatestResponse;
      const rate = toFiniteNumber(data.rates?.INR, NaN);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('Invalid USD->INR rate from FX API');
      }
      return { rate, asOf: data.date || new Date().toISOString() };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchEurToInr(): Promise<{ rate: number; asOf: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `${env.FX_API_BASE_URL}/latest?from=EUR&to=INR`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`FX API request failed with status ${response.status}`);
      const data = (await response.json()) as FrankfurterLatestResponse;
      const rate = toFiniteNumber(data.rates?.INR, NaN);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('Invalid EUR->INR rate from FX API');
      }
      return { rate, asOf: data.date || new Date().toISOString() };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchLiveRates(): Promise<InrRates> {
    const [usdToInr, eurToInr] = await Promise.all([this.fetchUsdToInr(), this.fetchEurToInr()]);
    const asOf = usdToInr.asOf >= eurToInr.asOf ? usdToInr.asOf : eurToInr.asOf;
    return {
      usdToInr: usdToInr.rate,
      eurToInr: eurToInr.rate,
      source: 'live',
      asOf,
    };
  }

  async getInrRates(): Promise<InrRates> {
    const now = Date.now();
    if (this.cache && now < this.cacheExpiresAtMs) {
      return { ...this.cache, source: 'cache' };
    }

    if (this.inFlightRequest) return this.inFlightRequest;

    this.inFlightRequest = (async () => {
      try {
        const liveRates = await this.fetchLiveRates();
        this.cache = liveRates;
        this.cacheExpiresAtMs = Date.now() + this.getCacheTtlMs();
        return liveRates;
      } catch (error) {
        logger.warn('Using fallback FX rates for INR conversion', {
          error: error instanceof Error ? error.message : String(error),
        });

        if (this.cache) {
          return { ...this.cache, source: 'cache' };
        }
        return this.getFallbackRates();
      } finally {
        this.inFlightRequest = null;
      }
    })();

    return this.inFlightRequest;
  }
}

export const fxRateService = new FxRateService();
