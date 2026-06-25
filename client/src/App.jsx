import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import AdminDashboard from "./pages/AdminDashboard";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MyOrders from "./pages/MyOrders";
import NotFound from "./pages/NotFound";
import OrderDetails from "./pages/OrderDetails";
import ProductDetails from "./pages/ProductDetails";
import ProductFormPage from "./pages/ProductFormPage";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import SellerDashboard from "./pages/SellerDashboard";
import SellerOrders from "./pages/SellerOrders";
import Shop from "./pages/Shop";
import Wishlist from "./pages/Wishlist";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "shop", element: <Shop /> },
      { path: "products/:productId", element: <ProductDetails /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <Checkout /> },
      { path: "wishlist", element: <Wishlist /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile", element: <Profile /> },
          { path: "orders", element: <MyOrders /> },
          { path: "orders/:id", element: <OrderDetails /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["seller"]} />,
        children: [
          { path: "seller", element: <Navigate to="/seller/dashboard" replace /> },
          { path: "seller/dashboard", element: <SellerDashboard /> },
          { path: "seller/orders", element: <SellerOrders /> },
          { path: "seller/products/new", element: <ProductFormPage /> },
          { path: "seller/products/:productId/edit", element: <ProductFormPage /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["admin"]} />,
        children: [{ path: "admin", element: <AdminDashboard /> }],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
