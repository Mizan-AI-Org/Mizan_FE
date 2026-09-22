import { Navigate } from "react-router-dom";

/** Recipe builder is not in this release. Catalog is the live product surface. */
export default function MenuManagement() {
  return <Navigate to="/dashboard/products/catalog" replace />;
}
