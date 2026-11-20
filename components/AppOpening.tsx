import Image from "next/image";

export default function AppOpening() {
  return (
    <main className="app-opening" aria-label="Abrindo Conectar Passagens">
      <div className="app-opening-content">
        <div className="app-opening-logo">
          <Image src="/icons/app-192.png" alt="" width={112} height={112} preload />
        </div>
        <p className="app-opening-eyebrow">Sua central comercial</p>
        <h1>Conectar<span>Passagens</span></h1>
        <p className="app-opening-description">Conectando pessoas a novas oportunidades.</p>
        <div className="app-opening-status" role="status">
          <span className="app-opening-dots" aria-hidden="true"><i /><i /><i /></span>
          <span>Abrindo seu acesso...</span>
        </div>
      </div>
    </main>
  );
}
