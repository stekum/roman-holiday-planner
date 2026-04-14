import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../firebase/useAuth';
import { useUserProfile, type UserProfile } from '../../firebase/useUserProfile';
import { LoginScreen } from './LoginScreen';
import { PendingScreen } from './PendingScreen';

interface Props {
  children: (ctx: { user: User; profile: UserProfile }) => ReactNode;
}

/**
 * Orchestrates the full auth flow:
 *   loading → signed-out → signed-in (pending) → signed-in (approved)
 * Only renders children when the user is signed in AND approved.
 */
export function AuthGate({ children }: Props) {
  const auth = useAuth();
  const profile = useUserProfile(auth.user);

  if (auth.status === 'loading') return <Spinner />;
  if (auth.status === 'signed-out' || !auth.user) return <LoginScreen />;

  if (profile.state === 'loading') return <Spinner />;
  if (profile.state === 'error') {
    return (
      <div className="flex min-h-full items-center justify-center p-6 bg-cream">
        <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow-lg shadow-ink/10">
          <p className="text-sm text-terracotta">
            Profil konnte nicht geladen werden.
          </p>
          <p className="mt-2 text-xs text-ink/50">{profile.error}</p>
        </div>
      </div>
    );
  }

  if (!profile.profile || profile.profile.status !== 'approved') {
    return <PendingScreen user={auth.user} />;
  }

  return <>{children({ user: auth.user, profile: profile.profile })}</>;
}

function Spinner() {
  return (
    <div className="flex min-h-full items-center justify-center bg-cream">
      <Loader2 className="h-6 w-6 animate-spin text-ink/40" />
    </div>
  );
}
