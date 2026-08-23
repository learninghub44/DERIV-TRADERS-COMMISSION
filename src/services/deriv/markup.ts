import { getMarkupStatistics, type DerivMarkupStatistics } from './auth';

export interface MarkupData {
  totalMarkup: number;
  contractCount: number;
  totalVolume: number;
  dailyBreakdown: {
    date: string;
    markup: number;
    contracts: number;
    volume: number;
  }[];
}

export async function fetchMarkupData(
  accessToken: string,
  appId: string,
  dateFrom: string,
  dateTo: string
): Promise<MarkupData> {
  try {
    const stats = await getMarkupStatistics(accessToken, appId, dateFrom, dateTo);

    return {
      totalMarkup: parseFloat(stats.total_markup || '0'),
      contractCount: parseInt(stats.contract_count || '0', 10),
      totalVolume: 0, // Volume not directly provided by markup stats endpoint
      dailyBreakdown: (stats.total_markup_per_app || []).map(item => ({
        date: item.app_id, // This would be date in real API
        markup: parseFloat(item.markup || '0'),
        contracts: parseInt(item.contract_count || '0', 10),
        volume: 0,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch markup data:', error);
    throw error;
  }
}

export function calculateMarkupTrend(dailyData: MarkupData['dailyBreakdown']): { date: string; amount: number }[] {
  return dailyData.map(day => ({
    date: day.date,
    amount: day.markup,
  }));
}

export function calculateTotalMarkup(data: MarkupData[]): number {
  return data.reduce((sum, d) => sum + d.totalMarkup, 0);
}
