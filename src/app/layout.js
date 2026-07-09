import "./globals.css";

export const metadata = {
  title: "Central de Novos Negócios",
  description: "Portal Engenharia de Novos Negócios",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
