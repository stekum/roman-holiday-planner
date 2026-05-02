import type { User } from 'firebase/auth';
import { Compass, Route, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserMenu } from './auth/UserMenu';
import { TripSwitcher } from './trip/TripSwitcher';
import { DualTimeBadge } from './DualTimeBadge';

export type Tab = 'discover' | 'trip' | 'settings';

interface Props {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  user: User;
  /**
   * Optional city prefix from the active TripConfig (#209). Renders as
   * "<City> Holiday Planner". Empty/undefined = plain "Holiday Planner"
   * (no leading space, no fallback name) — used during connecting/error
   * states and for trips that haven't set a city.
   */
  cityName?: string;
  /** #33: IANA-Zeitzone des Trips fuer Dual-Time-Anzeige. */
  tripTimezone?: string;
  /** #33: IANA-Heimat-Zeitzone (resolved, nicht raw aus Settings). */
  homeTimezone?: string;
}

export function Header({ tab, onTabChange, user, cityName, tripTimezone, homeTimezone }: Props) {
  const { t } = useTranslation();
  const tabs: { id: Tab; label: string; Icon: typeof Compass; activeClass: string }[] = [
    { id: 'discover', label: t('header.tabs.discover'), Icon: Compass, activeClass: 'bg-terracotta text-white' },
    { id: 'trip', label: t('header.tabs.trip'), Icon: Route, activeClass: 'bg-olive text-white' },
    { id: 'settings', label: t('header.tabs.settings'), Icon: SettingsIcon, activeClass: 'bg-ink text-cream' },
  ];
  const title = cityName ? t('header.titleWithCity', { city: cityName }) : t('header.title');
  return (
    <header className="sticky top-0 z-30 border-b border-cream-dark bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <h1
            className="truncate text-2xl leading-none text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h1>
          <TripSwitcher />
          {homeTimezone && (
            <DualTimeBadge tripTimezone={tripTimezone} homeTimezone={homeTimezone} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex flex-shrink-0 gap-1 rounded-full bg-white p-1 shadow-sm shadow-ink/5">
            {tabs.map(({ id, label, Icon, activeClass }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  tab === id ? activeClass : 'text-ink/60 hover:text-ink'
                }`}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
