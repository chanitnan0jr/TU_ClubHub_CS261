import { AuthProvider } from "./features/auth/AuthContext";
import Login from "./features/auth/Login";

function App() {
  return (
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
}

export default App;