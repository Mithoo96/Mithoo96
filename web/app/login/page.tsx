import { LoginForm } from "./login-form";
import { safeReturnPath } from "@/lib/supabase/navigation";
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <LoginForm next={safeReturnPath((await searchParams).next)} />;
}
