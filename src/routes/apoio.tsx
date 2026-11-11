import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalmNote, PrimaryButton, QuietButton, Screen } from "@/components/screen";
import {
  deleteContact,
  loadContacts,
  saveContact,
  telHref,
  type TrustedContact,
} from "@/lib/storage";

export const Route = createFileRoute("/apoio")({ component: Support });

const ANCHORS = [
  "Olhe para um ponto fixo à sua frente, se isso for confortável.",
  "Sinta onde o corpo se apoia: cadeira, cama ou chão.",
  "Se quiser, nomeie em voz baixa três coisas que escolhe notar.",
  "Você pode pausar. Não precisa resolver tudo agora.",
  "Um gole de água é uma opção, não uma ordem.",
  "Os pés podem estar em algum lugar. Perceba só se fizer sentido.",
  "Esta tela continua aqui. Você escolhe o próximo passo.",
  "Não é preciso ter certeza de tudo neste instante.",
];

const LINES = [
  {
    name: "CVV 188",
    detail: "Conversa, 24 horas, sem custo.",
    href: "tel:188",
  },
  {
    name: "SAMU 192",
    detail: "Se o corpo precisar de atendimento.",
    href: "tel:192",
  },
  {
    name: "190",
    detail: "Se você quiser ajuda de segurança agora.",
    href: "tel:190",
  },
];

function Support() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [anchor, setAnchor] = useState<number | null>(null);

  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  function addContact() {
    const nextName = name.trim();
    const nextPhone = phone.trim();
    if (!nextName || !nextPhone) return;
    setContacts(saveContact(nextName, nextPhone));
    setName("");
    setPhone("");
  }

  return (
    <Screen>
      <h1 className="font-serif text-3xl leading-tight font-medium">Apoio Imediato</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Você escolhe o que usar. O RealMind não liga para ninguém por você e não avisa outras
        pessoas.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Contatos de confiança</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Ficam só neste aparelho. O botão de ligar abre o telefone do seu celular.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {contacts.length === 0 && (
            <p className="text-muted">Se quiser, guarde aqui alguém de confiança.</p>
          )}
          {contacts.map((contact) => (
            <article key={contact.id} className="card flex flex-col gap-3 px-4 py-4">
              <div>
                <p className="text-lg">{contact.name}</p>
                <p className="text-sm text-muted">{contact.phone}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={telHref(contact.phone)}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-lilac px-5 py-3 font-medium text-bg"
                >
                  Ligar
                </a>
                <QuietButton onClick={() => setContacts(deleteContact(contact.id))}>
                  Remover
                </QuietButton>
              </div>
            </article>
          ))}
        </div>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            addContact();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full min-h-12 rounded-2xl border border-line bg-surface px-4"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Telefone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              autoComplete="tel"
              className="w-full min-h-12 rounded-2xl border border-line bg-surface px-4"
            />
          </label>
          <PrimaryButton type="submit" disabled={!name.trim() || !phone.trim()}>
            Guardar contato
          </PrimaryButton>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Mensagens de ancoragem</h2>
        <p className="mt-1 mb-4 text-sm leading-relaxed text-muted">
          Toque em uma para deixá-la grande. Não há ordem certa.
        </p>
        {anchor !== null ? (
          <div className="flex flex-col gap-4">
            <p className="font-serif text-2xl leading-snug">{ANCHORS[anchor]}</p>
            <div className="flex flex-col gap-3">
              <QuietButton
                onClick={() => setAnchor((current) => (current === null ? 0 : (current + 1) % ANCHORS.length))}
              >
                Outra mensagem
              </QuietButton>
              <QuietButton onClick={() => setAnchor(null)}>Ver todas</QuietButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ANCHORS.map((message, index) => (
              <button
                key={message}
                type="button"
                onClick={() => setAnchor(index)}
                className="card min-h-12 px-4 py-3 text-left leading-relaxed"
              >
                {message}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Se quiser uma linha de fora</h2>
        <p className="mt-1 mb-4 text-sm leading-relaxed text-muted">
          Estas linhas existem se você quiser usá-las. Não há obrigação.
        </p>
        <div className="flex flex-col gap-3">
          {LINES.map((line) => (
            <a key={line.href} href={line.href} className="card block px-4 py-4">
              <span className="block text-lg">{line.name}</span>
              <span className="mt-1 block text-sm text-muted">{line.detail}</span>
            </a>
          ))}
        </div>
        <div className="mt-4">
          <CalmNote>
            O RealMind não acompanha ligações. Se você já tem um cuidado profissional, este app
            não o substitui.
          </CalmNote>
        </div>
      </section>
    </Screen>
  );
}
