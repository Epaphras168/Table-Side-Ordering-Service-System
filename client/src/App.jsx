import { NavLink, Route, Routes } from 'react-router-dom';
import KitchenView from './views/KitchenView';
import ManagerView from './views/ManagerView';
import WaiterView from './views/WaiterView';

function App() {
  return (
    <>
      <nav className="views">
        <NavLink to="/waiter" className={({ isActive }) => (isActive ? 'active' : '')}>
          Waiter
        </NavLink>
        <NavLink to="/kitchen" className={({ isActive }) => (isActive ? 'active' : '')}>
          Kitchen Display
        </NavLink>
        <NavLink to="/manager" className={({ isActive }) => (isActive ? 'active' : '')}>
          Manager
        </NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<ManagerView />} />
        <Route path="/waiter" element={<WaiterView />} />
        <Route path="/kitchen" element={<KitchenView />} />
        <Route path="/manager" element={<ManagerView />} />
      </Routes>
    </>
  );
}

export default App;
