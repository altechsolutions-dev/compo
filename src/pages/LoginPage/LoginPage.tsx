import {
  AuthView,
  type AuthViewProps,
} from "../../components/AuthView/AuthView";
import "./LoginPage.css";

export function LoginPage(props: AuthViewProps) {
  return (
    <div className="login-page">
      <AuthView {...props} />
    </div>
  );
}
