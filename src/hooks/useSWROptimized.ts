// NOTE: This hook requires 'swr' package to be installed
// Commented out because it's not currently used and swr is not a dependency
/*
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';

// Default fetcher
const defaultFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    (error as any).info = await res.json();
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

export function useSWROptimized<Data = any, Error = any>(
  key: string | null,
  options?: SWRConfiguration
): SWRResponse<Data, Error> {
  return useSWR<Data, Error>(key, defaultFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    ...options,
  });
}
*/

// Placeholder export to avoid empty module errors
export const placeholder = true;
