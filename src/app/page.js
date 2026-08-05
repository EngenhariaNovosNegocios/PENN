import ProductManager from "@/components/ProductManager";
import AppShell from "@/components/AppShell";
import LoginGate from "@/components/LoginGate";

export default function Home() {
  return (
    <LoginGate>
      <AppShell>
        <ProductManager />
      </AppShell>
    </LoginGate>
  );
}
