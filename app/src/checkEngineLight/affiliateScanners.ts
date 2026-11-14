/**
 * OBD2 scanner recommendations shown to anyone without a scanner yet --
 * shown both here and (duplicated, same reasoning as the Edge Function
 * app/web split) in website/check-engine-light/app.js.
 *
 * `affiliateUrl: null` is the "not live yet" state: the UI shows a
 * disabled "Link coming soon" button instead of a dead "#" link, used
 * for any entry still waiting on its real Amazon affiliate link.
 */
export interface AffiliateScanner {
  tier: string;
  name: string;
  price: string;
  description: string;
  affiliateUrl: string | null;
  image: number;
}

export const AFFILIATE_SCANNERS: AffiliateScanner[] = [
  {
    tier: 'Budget-friendly',
    name: 'ANCEL BD200 OBD2 Scanner',
    price: '$45.00',
    description:
      'Bluetooth code reader & check engine diagnostic scan tool with car battery test, exclusive app on iOS & Android. Wireless OBDII adapter works for 1996 & newer vehicles.',
    affiliateUrl: 'https://link.amazon/B09kfO0Mo',
    image: require('../../assets/scanner1.png'),
  },
  {
    tier: 'Everyday driver',
    name: 'AUTOPHIX 3210 OBD2 Scanner for DIYers',
    price: '$49.99',
    description:
      'Fix check engine light, pass a smog test at home, performance test, check battery, and view live data -- no subscription. Works with 1996+ cars, for iPhone & Android.',
    affiliateUrl: 'https://link.amazon/B06BZAxyl',
    image: require('../../assets/scanner2.png'),
  },
  {
    tier: 'More capable handheld',
    name: 'Innova 5210 OBD2 Scanner & Engine Code Reader',
    price: '$79.95',
    description:
      'Battery tester, live data, and oil reset on a dedicated diagnostic tool for most vehicles. Bluetooth-compatible with a leading car repair app.',
    affiliateUrl: 'https://link.amazon/A0b1ZdE4d',
    image: require('../../assets/scanner3.png'),
  },
];

export const AFFILIATE_DISCLOSURE = 'As an Amazon Associate, we may earn from qualifying purchases.';
