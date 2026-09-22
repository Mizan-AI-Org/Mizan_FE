import { Navigate } from "react-router-dom";

/** Floor editor is not in this release. Table management is the live surface. */
export default function FloorManagement() {
  return <Navigate to="/dashboard/table-management" replace />;
}
