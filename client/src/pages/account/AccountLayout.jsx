import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../lib/usePageTitle';

const LINKS = [['Profile', '/account', true], ['Orders', '/account/orders'], ['Returns', '/account/returns'], ['Wishlist', '/account/wishlist'], ['Addresses', '/account/addresses']];

export default function AccountLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  usePageTitle('My account');
  const signOut = () => {
    logout();
    navigate('/');
  };
  return (
    <div className="container-x py-10 sm:py-14">
      <p className="text-sm text-stone">My account</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">Hello, {user.name.split(' ')[0]}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 overflow-x-auto text-sm lg:flex-col lg:gap-1" aria-label="Account">
          {LINKS.map(([label, to, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap px-3 py-2 ${isActive ? 'bg-ink text-paper' : 'hover:bg-mist'}`}>{label}</NavLink>
          ))}
          <button onClick={signOut} className="whitespace-nowrap px-3 py-2 text-left text-stone hover:bg-mist hover:text-ink">Sign out</button>
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
