import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './store/Store';
import { Shell } from './ui/Shell';
import { SignIn } from './pages/SignIn';
import { Today } from './pages/Today';
import { Forecast } from './pages/Forecast';
import { Models } from './pages/Models';
import { Stock } from './pages/Stock';
import { Buy } from './pages/Buy';
import { Sales } from './pages/Sales';
import { Network } from './pages/Network';
import { Catalog } from './pages/Catalog';

function Gate({ children }: { children: ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/in" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useStore();
  return (
    <Routes>
      <Route path="/in" element={user ? <Navigate to="/" replace /> : <SignIn />} />
      <Route
        element={
          <Gate>
            <Shell />
          </Gate>
        }
      >
        <Route path="/" element={<Today />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/demand" element={<Forecast />} />
        <Route path="/models" element={<Models />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/buy" element={<Buy />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/network" element={<Network />} />
        <Route path="/catalog" element={<Catalog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
