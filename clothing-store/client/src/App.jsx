import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute, AdminRoute, GuestOnly } from './components/Guards';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Login from './pages/Login';
import Register from './pages/Register';
import Help from './pages/Help';
import NotFound from './pages/NotFound';
import About from './pages/About';
import Contact from './pages/Contact';
import Policy from './pages/Policy';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Invoice from './pages/Invoice';
import MyReturns from './pages/account/Returns';
import Reports from './admin/Reports';
import AdminReturns from './admin/Returns';
import Messages from './admin/Messages';
import AdminReviews from './admin/Reviews';
import SiteSettings from './admin/SiteSettings';
import AccountLayout from './pages/account/AccountLayout';
import Profile from './pages/account/Profile';
import Orders from './pages/account/Orders';
import OrderDetail from './pages/account/OrderDetail';
import Wishlist from './pages/account/Wishlist';
import Addresses from './pages/account/Addresses';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import Dashboard from './admin/Dashboard';
import AdminProducts from './admin/Products';
import ProductForm from './admin/ProductForm';
import Inventory from './admin/Inventory';
import Categories from './admin/Categories';
import AdminOrders from './admin/Orders';
import Customers from './admin/Customers';
import Coupons from './admin/Coupons';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="shop/:gender" element={<Shop />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="help" element={<Help />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="policies/:slug" element={<Policy />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
        <Route element={<GuestOnly />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="checkout" element={<Checkout />} />
          <Route path="order/:id/success" element={<OrderSuccess />} />
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<Profile />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="returns" element={<MyReturns />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="addresses" element={<Addresses />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="invoice/:id" element={<Invoice />} />
      </Route>
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="admin" element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm key="edit" />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="categories" element={<Categories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="returns" element={<AdminReturns />} />
          <Route path="messages" element={<Messages />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="reports" element={<Reports />} />
          <Route path="homepage" element={<SiteSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}
