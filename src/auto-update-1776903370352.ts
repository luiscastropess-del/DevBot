// app/page.tsx
import { Layout } from '../components/Layout';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function Home() {
  return (
    <Layout>
      <Header />
      <main>
        <h1>Bem-vindo à Aplicação</h1>
      </main>
      <Footer />
    </Layout>
  );
}