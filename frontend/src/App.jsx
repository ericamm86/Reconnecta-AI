import { useEffect, useMemo, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { ContactModal } from "./components/ContactModal";
import { ContactsWorkspace } from "./components/ContactsWorkspace";
import { CopilotChat } from "./components/CopilotChat";
import { Dashboard } from "./components/Dashboard";
import { GovernancePanel } from "./components/GovernancePanel";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { ProductArchitecturePanel } from "./components/ProductArchitecturePanel";
import { Shell } from "./components/Shell";
import { Timeline } from "./components/Timeline";
import { fallbackContacts, fallbackDashboard } from "./data/demo";
import { useAuth } from "./hooks/useAuth";
import { useSupabaseProfile } from "./hooks/useSupabaseProfile";
import { api } from "./lib/api";
import { drainOfflineQueue } from "./lib/syncQueue";

const emptyContact = {
  name: "",
  email: "",
  company: "",
  role: "",
  area: "",
  proximity: 55,
  tags: [],
  tagsText: ""
};

const emptyInteraction = {
  type: "note",
  sentiment: "neutral",
  summary: "",
  notesMarkdown: ""
};

function getAuthErrorMessage(error) {
  const message = error?.message || "Nao foi possivel autenticar.";
  const waitMatch = message.match(/after\s+(\d+)\s+seconds/i);

  if (/security purposes/i.test(message) && waitMatch) {
    return `Aguarde ${waitMatch[1]} segundos antes de tentar novamente.`;
  }

  if (/security purposes/i.test(message)) {
    return "Aguarde alguns segundos antes de tentar novamente.";
  }

  if (/email rate limit exceeded/i.test(message)) {
    return "Limite de envio de email atingido. Aguarde alguns minutos antes de tentar novamente.";
  }

  return message;
}

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [query, setQuery] = useState("");
  const [dashboard, setDashboard] = useState(fallbackDashboard);
  const [contacts, setContacts] = useState(fallbackContacts);
  const [selected, setSelected] = useState(fallbackContacts[0]);
  const [interactions, setInteractions] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [interactionForm, setInteractionForm] = useState(emptyInteraction);
  const [toast, setToast] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [theme, setTheme] = useState(() => window.localStorage.getItem("reconnect-theme") || "dark");
  const auth = useAuth(setToast);
  const userProfile = useSupabaseProfile(auth.session, setToast);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.classList.toggle("theme-light", theme === "light");
    window.localStorage.setItem("reconnect-theme", theme);
  }, [theme]);

  useEffect(() => {
    async function sync() {
      try {
        const count = await drainOfflineQueue();
        if (count) {
          setToast(`${count} alteracao${count === 1 ? "" : "es"} offline sincronizada${count === 1 ? "" : "s"}.`);
          refreshData();
        }
      } catch {
        // The queue remains persisted in IndexedDB for the next online event.
      }
    }

    window.addEventListener("online", sync);
    navigator.serviceWorker?.addEventListener("message", (event) => {
      if (event.data?.type === "SYNC_OFFLINE_QUEUE") sync();
    });

    return () => window.removeEventListener("online", sync);
  }, []);

  useEffect(() => {
    if (!auth.session) return;
    refreshData();
  }, [auth.session]);

  useEffect(() => {
    if (!selected) return;
    api
      .contact(selected.id)
      .then(({ data }) => setInteractions(data.timeline || []))
      .catch(() => setInteractions(fallbackDashboard.latestInteractions.filter((item) => item.contactId === selected.id)));
  }, [selected]);

  const dashboardSnapshot = useMemo(
    () => ({
      ...dashboard,
      totalConnections: contacts.length,
      activeConnections: contacts.filter((contact) => contact.proximity >= 70).length,
      averageScore: contacts.length ? Math.round(contacts.reduce((sum, contact) => sum + contact.proximity, 0) / contacts.length) : 0
    }),
    [contacts, dashboard]
  );

  const filteredContacts = useMemo(() => {
    const value = query.toLowerCase();
    if (!value) return contacts;
    return contacts.filter((contact) => {
      const haystack = `${contact.name} ${contact.email} ${contact.company} ${contact.role} ${contact.area} ${contact.tags?.join(" ")}`.toLowerCase();
      return haystack.includes(value);
    });
  }, [contacts, query]);

  function selectContact(contact) {
    setSelected(contact);
    setIntelligence(null);
  }

  async function refreshData(preferredContactId) {
    try {
      const [dash, contactPayload] = await Promise.all([api.dashboard(), api.contacts()]);
      setDashboard(dash.data);
      setContacts(contactPayload.data);
      setIntelligence(null);
      setSelected((current) => {
        const preferred = contactPayload.data.find((contact) => contact.id === preferredContactId);
        return preferred || contactPayload.data.find((contact) => contact.id === current?.id) || contactPayload.data[0];
      });
    } catch {
      setDashboard(fallbackDashboard);
      setContacts(fallbackContacts);
      setIntelligence(null);
      setSelected(fallbackContacts[0]);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    if (authSubmitting) return;
    setAuthSubmitting(true);

    try {
      if (authMode === "register") {
        await auth.signUpWithPassword(authForm);
        setAuthMode("login");
        setAuthForm((current) => ({ ...current, password: "" }));
        return;
      }

      await auth.signInWithPassword(authForm);
    } catch (error) {
      setToast(getAuthErrorMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleMagicLink(email) {
    if (authSubmitting) return;
    setAuthSubmitting(true);
    try {
      await auth.signInWithMagicLink(email);
    } catch (error) {
      setToast(getAuthErrorMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleOAuth(provider) {
    if (authSubmitting) return;
    setAuthSubmitting(true);
    try {
      await auth.signInWithOAuth(provider);
    } catch (error) {
      setToast(getAuthErrorMessage(error));
      setAuthSubmitting(false);
    }
  }

  function logout() {
    auth.signOut();
  }

  async function createContact(event) {
    event.preventDefault();
    try {
      const { data } = await api.createContact(contactForm);
      setContacts((current) => [data, ...current]);
      selectContact(data);
      setContactForm({ ...emptyContact, tags: [], tagsText: "" });
      setContactModalOpen(false);
      setToast("Contato criado.");
      refreshData(data.id);
    } catch (error) {
      setToast(error.message);
    }
  }

  async function addInteraction(event) {
    event.preventDefault();
    if (!selected) return setToast("Selecione um contato primeiro.");
    try {
      const { data } = await api.createInteraction({ ...interactionForm, contactId: selected.id });
      setInteractions((current) => [data, ...current]);
      setInteractionForm(emptyInteraction);
      setToast("Interacao registrada.");
      refreshData();
    } catch (error) {
      setToast(error.message);
    }
  }

  async function generateIntelligence(id) {
    setToast("Connection Intelligence processando...");
    try {
      const { data } = await api.intelligence(id);
      setIntelligence(data);
      setToast(data.provider === "openai" ? "Insights gerados pela OpenAI." : "Insights demo gerados.");
    } catch (error) {
      setToast(error.message);
    }
  }

  if (auth.loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink px-5 text-white">
        <div className="w-full max-w-md rounded-xl border border-line bg-white/[0.04] p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
          <div className="mt-5 h-12 animate-pulse rounded-lg bg-white/10" />
          <div className="mt-3 h-12 animate-pulse rounded-lg bg-white/10" />
          <div className="mt-6 h-12 animate-pulse rounded-lg bg-mint/20" />
        </div>
      </main>
    );
  }

  if (!auth.session) {
    return (
      <>
        <AuthPanel
          mode={authMode}
          setMode={setAuthMode}
          form={authForm}
          setForm={setAuthForm}
          onSubmit={handleAuth}
          onMagicLink={handleMagicLink}
          onOAuth={handleOAuth}
          onAppleSoon={() => setToast("Apple login esta reservado para a proxima etapa de integracao.")}
          submitting={authSubmitting}
        />
        {toast && <Toast text={toast} onClose={() => setToast("")} />}
      </>
    );
  }

  return (
    <Shell query={query} setQuery={setQuery} session={auth.session} onLogout={logout} onCreateContact={() => setContactModalOpen(true)} theme={theme} onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}>
      <OnboardingFlow profile={userProfile.profile} onUpdateProfile={userProfile.updateProfile} contacts={contacts} onImport={() => window.location.assign("#product-architecture")} />
      <Dashboard
        dashboard={dashboardSnapshot}
        contacts={filteredContacts}
        selected={selected}
        setSelected={selectContact}
        intelligence={intelligence}
        onGenerate={generateIntelligence}
        onCreateContact={() => setContactModalOpen(true)}
      />
      <ContactsWorkspace contacts={contacts} selected={selected} onSelect={selectContact} onCreateContact={() => setContactModalOpen(true)} />
      <Timeline
        selected={selected}
        interactions={interactions}
        interactionForm={interactionForm}
        setInteractionForm={setInteractionForm}
        onAddInteraction={addInteraction}
      />
      <GovernancePanel onToast={setToast} />
      <CopilotChat contacts={contacts} selected={selected} onSelectContact={selectContact} onToast={setToast} />
      <ProductArchitecturePanel onToast={setToast} session={auth.session} onRefresh={refreshData} />
      <ContactModal
        open={contactModalOpen}
        form={contactForm}
        setForm={setContactForm}
        onClose={() => setContactModalOpen(false)}
        onSubmit={createContact}
      />
      {toast && <Toast text={toast} onClose={() => setToast("")} />}
    </Shell>
  );
}

function Toast({ text, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3600);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg border border-mint/30 bg-panel px-4 py-3 text-sm font-semibold text-white shadow-glow">
      {text}
    </div>
  );
}

export default App;
