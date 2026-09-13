import { useNavigate } from 'react-router-dom';
import { USERS } from '../data/catalog';
import { useStore } from '../store/Store';

export function SignIn() {
  const { signIn } = useStore();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[360px]">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-7 h-7 rounded-md bg-forest text-paper grid place-items-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2.5" width="12" height="1.5" rx="0.6" fill="currentColor" />
              <rect x="1" y="6.2" width="12" height="1.5" rx="0.6" fill="currentColor" />
              <rect x="1" y="9.9" width="8" height="1.5" rx="0.6" fill="currentColor" />
              <circle cx="11.4" cy="10.65" r="1.35" fill="#E2B15A" />
            </svg>
          </span>
          <span className="font-display text-lg">SHELFSIGNAL</span>
        </div>
        <p className="text-[13px] text-mute mb-6 leading-relaxed">
          Demand forecasting for Sattva Mart. ARIMA, SARIMA and LSTM on every SKU-store — so a store in Warangal does not buy on
          gut feel.
        </p>
        <div className="space-y-2">
          {USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                signIn(u.id);
                nav('/');
              }}
              className="w-full text-left sheet rounded-xl px-4 py-3 hover:border-forest/40"
            >
              <div className="font-medium">{u.name}</div>
              <div className="text-[12px] text-mute">{u.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
