import {
  ArrowRight,
  CheckCircle2,
  Headset,
  LogIn,
  MessageSquare,
  ShieldCheck,
  Zap,
} from "lucide-react";

/**
 * Homepage pubblica di NEXORA Support.
 * Il pulsante "Accedi" in alto a destra è riservato allo staff:
 * i clienti accedono alla chat direttamente dai pulsanti della pagina.
 */
function HomePage({ onStaffLogin, onClientChat }) {
  const features = [
    {
      icon: MessageSquare,
      title: "Chat in tempo reale",
      text: "Parla con il nostro staff in una chat veloce e intuitiva, direttamente dal browser.",
    },
    {
      icon: Headset,
      title: "Operatori dedicati",
      text: "Un team di operatori qualificato ti risponde e segue il tuo problema fino alla soluzione.",
    },
    {
      icon: Zap,
      title: "Risposte immediate",
      text: "Le tue richieste entrano subito in coda e vengono gestite in ordine di priorità.",
    },
    {
      icon: ShieldCheck,
      title: "Supporto professionale",
      text: "Assistenza strutturata, conversazioni tracciate e soluzioni documentate.",
    },
  ];

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <div className="home-logo">N</div>

          <div className="home-brand-text">
            <strong>NEXORA</strong>
            <span>SUPPORT</span>
          </div>
        </div>

        <button className="home-login" onClick={onStaffLogin}>
          <LogIn size={16} />
          Accedi
        </button>
      </header>

      <section className="home-hero">
        <span className="home-eyebrow">Assistenza clienti professionale</span>

        <h1>
          Supporto <span>veloce</span>. Soluzioni <span>vere</span>.
        </h1>

        <p>
          NEXORA Support è il punto di contatto diretto con il nostro staff:
          apri una chat, descrivi il tuo problema e un operatore ti risponde in
          tempo reale.
        </p>

        <div className="home-actions">
          <button className="home-cta" onClick={onClientChat}>
            <Headset size={18} />
            Apri una chat con lo staff
          </button>

          <button className="home-cta-secondary" onClick={onStaffLogin}>
            Area staff
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="home-points">
          <span>
            <CheckCircle2 size={14} />
            Nessuna registrazione
          </span>

          <span>
            <CheckCircle2 size={14} />
            Risposta in tempo reale
          </span>

          <span>
            <CheckCircle2 size={14} />
            Cronologia delle chat
          </span>
        </div>
      </section>

      <section className="home-features">
        <h2>Tutto quello che ti serve, in un unico posto</h2>

        <div className="home-features-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className="home-feature" key={feature.title}>
                <div className="home-feature-icon">
                  <Icon size={22} />
                </div>

                <h3>{feature.title}</h3>

                <p>{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-band">
        <div>
          <strong>Hai bisogno di aiuto adesso?</strong>

          <p>Il nostro staff è pronto a risponderti.</p>
        </div>

        <button className="home-cta" onClick={onClientChat}>
          <Headset size={18} />
          Avvia la chat
        </button>
      </section>

      <footer className="home-footer">
        <span>NEXORA Support</span>
        <span>Sistema di assistenza clienti</span>
      </footer>
    </div>
  );
}

export default HomePage;
