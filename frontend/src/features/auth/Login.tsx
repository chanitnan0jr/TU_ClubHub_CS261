import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { inputClass } from "../../components/ui/classes";
import { Field } from "../../components/ui/Field";
import { CircleAlertIcon } from "../../components/ui/icons";
import { useAuth } from "./AuthContext";

export default function Login() {
  const { login, notice } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอกรหัสนักศึกษาและรหัสผ่าน");
      return;
    }

    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md py-4 sm:py-10">
      <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-slate-600">
            เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัยธรรมศาสตร์
          </p>
        </div>

        {(error || notice) && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <CircleAlertIcon className="mt-0.5 size-4" />
            <span>{error || notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field id="username" label="รหัสนักศึกษา / TU Great ID">
            {(control) => (
              <input
                {...control}
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น 6809617001"
                className={inputClass()}
              />
            )}
          </Field>

          <Field id="password" label="รหัสผ่าน">
            {(control) => (
              <input
                {...control}
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่านเดียวกับ TU Great App"
                className={inputClass()}
              />
            )}
          </Field>

          <Button type="submit" variant="primary" loading={isLoading} className="mt-2 w-full">
            {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-600">
          ระบบจะยืนยันตัวตนผ่าน TU Authentication API
        </p>
      </div>
    </div>
  );
}
