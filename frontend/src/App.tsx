import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { ChallanDetailPage } from './pages/ChallanDetailPage';
import { ChallanCreatePage, ChallanEditPage } from './pages/ChallanFormPages';
import { ChallansPage } from './pages/ChallansPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomerCreatePage, CustomerEditPage } from './pages/CustomerFormPages';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductCreatePage, ProductEditPage } from './pages/ProductFormPages';
import { ProductsPage } from './pages/ProductsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StockMovementsPage } from './pages/StockMovementsPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<CustomerCreatePage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers/:id/edit" element={<CustomerEditPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductCreatePage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/edit" element={<ProductEditPage />} />
          <Route path="/stock-movements" element={<StockMovementsPage />} />
          <Route path="/challans" element={<ChallansPage />} />
          <Route path="/challans/new" element={<ChallanCreatePage />} />
          <Route path="/challans/:id" element={<ChallanDetailPage />} />
          <Route path="/challans/:id/edit" element={<ChallanEditPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
