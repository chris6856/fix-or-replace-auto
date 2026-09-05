import { Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/** Opens a Google Maps search for the shop name, surfacing its rating and
 *  reviews without this app needing its own Places/Yelp API integration. */
export function openRepairFacilitySearch(shopName: string): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopName)}`;
  Linking.openURL(url);
}

/** Shop name from the vehicle's most recent repair estimate, if one was
 *  entered -- lets "Research Repair Facility" jump straight to the search
 *  instead of asking the user to type the name in again. */
export async function fetchLatestShopName(vehicleId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('repair_events')
    .select('shop_name')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.shop_name ?? null;
}

export function useLatestShopName(vehicleId: string) {
  return useQuery({
    queryKey: ['latestShopName', vehicleId],
    queryFn: () => fetchLatestShopName(vehicleId),
    enabled: Boolean(vehicleId),
  });
}
