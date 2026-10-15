
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import hero from "@/assets/hero.jpg";
import {
  CLUES,
  HINTS,
  KILLER_OPTIONS,
  LIE_OPTIONS,
  LOCATIONS,
  METHOD_OPTIONS,
  SUSPECTS,
  type Clue,
} from "@/game/data";
import { CIPHERTEXT, HASHES } from "@/game/sealed";
import { checkAnswer, unsealEnding, type Ending } from "@/game/crypto";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Lantern Protocol: A Team Mystery" },
      {
        name: "description",
        content:
          "An expert-level psychological thriller mystery you solve as a team. Fair clues, hard puzzles, and an ending that stays sealed until you crack it.",
      },
      {
        property: "og:title",
        content: "The Lantern Protocol: A Team Mystery",
      },
      {
        property: "og:description",
        content: "A doctor dies in a sleep clinic at night. Solve it together.",
      },
    ],
  }),
  component: Game,
});

type PuzzleKey = "cipher" | "time" | "keypad" | "final";

interface State {
  players: string[];
  started: boolean;
  turn: number;
  found: string[];
  extra: Clue[];
  solved: Partial<Record<PuzzleKey, boolean>>;
  flags: string[];
  interviewed: Record<string, number>;
  hints: Partial<Record<PuzzleKey, number>>;
  attempts: number;
  notes: string;
  ending?: string;
}

const INIT: State = {
  players: [],
  started: false,
  turn: 0,
  found: [],
  extra: [],
  solved: {},
  flags: [],
  interviewed: {},
  hints: {},
  attempts: 0,
  notes: "",
};

const KEY = "lantern-protocol-save";
const MAX_ATTEMPTS = 3;

function Game() {
  const [s, setS] = useState<State>(INIT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);

      if (saved) {
        setS({ ...INIT, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error("Could not load saved investigation:", error);
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch (error) {
        console.error("Could not save investigation:", error);
      }
    }
  }, [s, loaded]);

  const up = (f: (p: State) => State) => setS((p) => f(p));

  const reset = () => {
    if (confirm("Start a brand-new investigation? All progress will be lost.")) {
      setS(INIT);
    }
  };

  if (!s.started) {
    return (
      <Intro
        onStart={(players) =>
          up((p) => ({ ...p, players, started: true }))
        }
      />
    );
  }

  if (s.ending) {
    return <EndingView s={s} onReset={reset} />;
  }

  if (s.attempts >= MAX_ATTEMPTS) {
    return <Failed onReset={reset} />;
  }

  return <Board s={s} up={up} onReset={reset} />;
}

function Intro({ onStart }: { onStart: (p: string[]) => void }) {
  const [names, setNames] = useState(["", ""]);
  const clean = names.map((n) => n.trim()).filter(Boolean);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <img
        src={hero}
        alt="A dark clinic corridor lit by a single lantern"
        width={1600}
        height={912}
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />

      <div
        className="absolute inset-0"
        style={{ background: "var(--vignette)" }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary flicker">
          Halloway Sleep Institute · 14 March · 03:12
        </p>

        <h1 className="mt-4 text-6xl font-bold leading-none md:text-8xl">
          The Lantern Protocol
        </h1>

        <p className="mt-6 max-w-xl text-lg text-secondary-foreground">
          Dr. Adrian Wren is dead in Observation Room 4, the room where he
          studied other people&apos;s sleep. A patient was found beside him
          holding the syringe. The clock on the wall stopped at the moment of
          death. Or it seems to have.
        </p>

        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Expert difficulty · Team play · Three puzzles · Three wrong
          accusations and the case goes cold. The ending is encrypted and only
          your correct solution can open it.
        </p>

        <div className="dossier mt-10 p-6">
          <h2 className="text-2xl">Your investigative team</h2>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {names.map((n, i) => (
              <input
                key={i}
                value={n}
                onChange={(e) =>
                  setNames((current) =>
                    current.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
                placeholder={`Investigator ${i + 1}`}
                className="rounded border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-ring"
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {names.length < 6 && (
              <button
                onClick={() => setNames((current) => [...current, ""])}
                className="rounded border border-border px-4 py-2 text-sm hover:bg-secondary"
              >
                + Add investigator
              </button>
            )}

            <button
              disabled={!clean.length}
              onClick={() => onStart(clean)}
              className="rounded bg-primary px-6 py-2 font-semibold text-primary-foreground shadow-glow disabled:opacity-40"
            >
              Enter the Institute
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Board({
  s,
  up,
  onReset,
}: {
  s: State;
  up: (f: (p: State) => State) => void;
  onReset: () => void;
}) {
  const [loc, setLoc] = useState("lobby");
  const [tab, setTab] = useState<"scene" | "people" | "board" | "accuse">(
    "scene",
  );

  const lead =
    s.players.length > 0
      ? s.players[s.turn % s.players.length]
      : "Investigation team";

  const allClues = useMemo(
    () => [
      ...s.found
        .map((id) => CLUES[id])
        .filter((clue): clue is Clue => clue !== undefined),
      ...s.extra,
    ],
    [s.found, s.extra],
  );

  const act = (f: (p: State) => State) =>
    up((p) => ({ ...f(p), turn: p.turn + 1 }));

  const location = LOCATIONS.find((l) => l.id === loc) ?? LOCATIONS[0];

  if (!location) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-6">
        <h1 className="text-3xl font-bold">Investigation unavailable</h1>
        <p className="mt-3 text-muted-foreground">
          The current location could not be found. Restart the investigation
          and try again.
        </p>
        <button
          onClick={onReset}
          className="mt-4 rounded border border-border px-4 py-2"
        >
          Restart
        </button>
      </main>
    );
  }

  const locked = location.locked === "keypad" && !s.solved.keypad;
  const canAccuse = s.solved.cipher && s.solved.time && s.solved.keypad;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-4xl font-bold">The Lantern Protocol</h1>
          <p className="font-mono text-xs text-muted-foreground">
            Lead investigator this turn:{" "}
            <span className="text-primary">{lead}</span> · Team:{" "}
            {s.players.join(", ")}
          </p>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <span>Clues {allClues.length}</span>
          <span>
            Puzzles{" "}
            {[s.solved.cipher, s.solved.time, s.solved.keypad].filter(Boolean)
              .length}
            /3
          </span>
          <span>Accusations left {MAX_ATTEMPTS - s.attempts}</span>
          <button onClick={onReset} className="underline hover:text-foreground">
            Restart
          </button>
        </div>
      </header>

      <nav className="mt-4 flex flex-wrap gap-2">
        {(["scene", "people", "board", "accuse"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-4 py-2 font-mono text-xs uppercase tracking-widest ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-secondary"
            }`}
          >
            {{
              scene: "Locations",
              people: "Interviews",
              board: "Case board",
              accuse: "Accuse",
            }[t]}
          </button>
        ))}
      </nav>

      {tab === "scene" && (
        <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="flex flex-col gap-2">
            {LOCATIONS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLoc(l.id)}
                className={`dossier px-3 py-3 text-left text-sm ${
                  loc === l.id
                    ? "border-primary text-primary"
                    : "hover:bg-secondary"
                }`}
              >
                {l.name}
                {l.locked && !s.solved.keypad ? " 🔒" : ""}
              </button>
            ))}
          </aside>

          <section className="fade-up" key={loc}>
            <h2 className="text-3xl">{location.name}</h2>
            <p className="text-muted-foreground">{location.blurb}</p>

            {locked ? (
              <Puzzle
                k="keypad"
                s={s}
                up={up}
                prompt="The keypad wants a four-digit override code."
                placeholder="____"
              />
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {location.clues.map((id) => {
                    const clue = CLUES[id];

                    if (!clue) return null;

                    const has = s.found.includes(id);

                    return has ? (
                      <ClueCard key={id} c={clue} />
                    ) : (
                      <button
                        key={id}
                        onClick={() =>
                          act((p) => ({
                            ...p,
                            found: [...p.found, id],
                          }))
                        }
                        className="dossier p-4 text-left text-sm text-muted-foreground hover:border-primary hover:text-foreground"
                      >
                        Search here…
                        <span className="block font-mono text-xs">
                          {clue.kind}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {location.puzzle === "cipher" &&
                  s.found.includes("journal") && (
                    <Puzzle
                      k="cipher"
                      s={s}
                      up={up}
                      prompt={`Decipher Wren's last line: ${CIPHERTEXT}`}
                      placeholder="Enter the full plaintext"
                    />
                  )}

                {location.puzzle === "time" &&
                  s.found.includes("monitor") &&
                  s.found.includes("wallClock") && (
                    <Puzzle
                      k="time"
                      s={s}
                      up={up}
                      prompt="What was the true time of death? (24h, HHMM)"
                      placeholder="HHMM"
                    />
                  )}
              </>
            )}
          </section>
        </div>
      )}

      {tab === "people" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {SUSPECTS.map((p) => {
            const chosen = s.interviewed[p.id];
            const selectedOption =
              chosen === undefined ? undefined : p.options[chosen];

            return (
              <article key={p.id} className="dossier p-5">
                <h3 className="text-2xl">{p.name}</h3>
                <p className="font-mono text-xs text-accent">{p.role}</p>
                <p className="mt-3 text-sm">{p.opening}</p>

                {selectedOption === undefined ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      You get one question. Choose carefully as a team.
                    </p>

                    {p.options.map((o, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          act((st) => ({
                            ...st,
                            interviewed: {
                              ...st.interviewed,
                              [p.id]: i,
                            },
                            flags: o.flag
                              ? [...st.flags, o.flag]
                              : st.flags,
                            extra: o.clue
                              ? [...st.extra, o.clue]
                              : st.extra,
                          }))
                        }
                        className="rounded border border-border px-3 py-2 text-left text-sm hover:border-primary"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 border-l-2 border-primary pl-3 text-sm italic text-secondary-foreground">
                    {selectedOption.reply}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {tab === "board" && (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="grid gap-3 sm:grid-cols-2">
            {allClues.length ? (
              allClues.map((c, i) => <ClueCard key={`${c.id}-${i}`} c={c} />)
            ) : (
              <p className="text-muted-foreground">
                No evidence yet. Go and search the Institute.
              </p>
            )}
          </div>

          <div className="dossier p-4">
            <h3 className="text-xl">Shared team notes</h3>
            <textarea
              value={s.notes}
              onChange={(e) =>
                up((p) => ({ ...p, notes: e.target.value }))
              }
              rows={16}
              className="mt-2 w-full rounded border border-input bg-background p-2 font-mono text-xs outline-none focus:border-ring"
              placeholder="Timelines, theories, arguments…"
            />
          </div>
        </div>
      )}

      {tab === "accuse" &&
        (canAccuse ? (
          <Accuse s={s} up={up} />
        ) : (
          <p className="mt-8 text-muted-foreground">
            The team isn&apos;t ready to name anyone yet. Solve all three
            puzzles first: the journal, the true time of death, and the Room 7
            door.
          </p>
        ))}
    </main>
  );
}

function ClueCard({ c }: { c: Clue }) {
  return (
    <div className="dossier fade-up p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        {c.kind}
      </p>
      <h4 className="text-xl">{c.title}</h4>
      <p className="mt-1 whitespace-pre-line font-mono text-xs leading-relaxed text-secondary-foreground">
        {c.body}
      </p>
    </div>
  );
}

function HintBox({
  k,
  s,
  up,
}: {
  k: PuzzleKey;
  s: State;
  up: (f: (p: State) => State) => void;
}) {
  const n = s.hints[k] ?? 0;
  const hints = HINTS[k] ?? [];

  return (
    <div className="mt-3 text-xs">
      {hints.slice(0, n).map((h, i) => (
        <p key={i} className="text-muted-foreground">
          Hint {i + 1}: {h}
        </p>
      ))}

      {n < hints.length && (
        <button
          onClick={() =>
            up((p) => ({
              ...p,
              hints: { ...p.hints, [k]: n + 1 },
            }))
          }
          className="mt-1 font-mono text-accent underline"
        >
          Reveal a hint
        </button>
      )}
    </div>
  );
}

function Puzzle({
  k,
  s,
  up,
  prompt,
  placeholder,
}: {
  k: "cipher" | "time" | "keypad";
  s: State;
  up: (f: (p: State) => State) => void;
  prompt: string;
  placeholder: string;
}) {
  const [v, setV] = useState("");
  const [msg, setMsg] = useState("");

  if (s.solved[k]) {
    return (
      <p className="mt-6 font-mono text-sm text-primary">✓ Solved.</p>
    );
  }

  const submit = async () => {
    if (await checkAnswer(v, HASHES[k])) {
      up((p) => ({
        ...p,
        solved: { ...p.solved, [k]: true },
      }));
      setMsg("");
    } else {
      setMsg("That doesn't fit. Talk it through as a team.");
    }
  };

  return (
    <div className="dossier mt-6 border-primary/50 p-5 shadow-glow">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">
        Puzzle
      </p>
      <p className="mt-2 font-mono text-sm">{prompt}</p>

      <div className="mt-3 flex gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder={placeholder}
          className="flex-1 rounded border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-ring"
        />

        <button
          onClick={() => void submit()}
          className="rounded bg-primary px-4 font-semibold text-primary-foreground"
        >
          Try
        </button>
      </div>

      {msg && <p className="mt-2 text-xs text-destructive">{msg}</p>}

      <HintBox k={k} s={s} up={up} />
    </div>
  );
}

function Accuse({
  s,
  up,
}: {
  s: State;
  up: (f: (p: State) => State) => void;
}) {
  const [who, setWho] = useState("");
  const [how, setHow] = useState("");
  const [lie, setLie] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (!who || !how || !lie) return;

    const sol = `${who}|${how}|${lie}`;

    if (await checkAnswer(sol, HASHES.final)) {
      up((p) => ({ ...p, ending: sol }));
      setMsg("");
    } else {
      up((p) => ({ ...p, attempts: p.attempts + 1 }));
      setMsg(
        "Your theory falls apart under questioning. Someone in the room relaxes.",
      );
    }
  };

  const Group = ({
    title,
    opts,
    val,
    set,
  }: {
    title: string;
    opts: { id: string; label: string }[];
    val: string;
    set: (x: string) => void;
  }) => (
    <div>
      <h3 className="text-xl">{title}</h3>
      <div className="mt-2 flex flex-col gap-2">
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => set(o.id)}
            className={`rounded border px-3 py-2 text-left text-sm ${
              val === o.id
                ? "border-primary bg-secondary text-primary"
                : "border-border hover:bg-secondary"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mt-6 fade-up">
      <p className="text-muted-foreground">
        Agree as a team. You have {MAX_ATTEMPTS - s.attempts} accusation
        {MAX_ATTEMPTS - s.attempts === 1 ? "" : "s"} left.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <Group
          title="Who killed Adrian Wren?"
          opts={KILLER_OPTIONS}
          val={who}
          set={setWho}
        />
        <Group
          title="How?"
          opts={METHOD_OPTIONS}
          val={how}
          set={setHow}
        />
        <Group
          title="Which evidence was staged to lie?"
          opts={LIE_OPTIONS}
          val={lie}
          set={setLie}
        />
      </div>

      <button
        disabled={!who || !how || !lie}
        onClick={() => void submit()}
        className="mt-6 rounded bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-glow disabled:opacity-40"
      >
        Make the accusation
      </button>

      {msg && <p className="mt-3 text-sm text-destructive">{msg}</p>}

      <HintBox k="final" s={s} up={up} />
    </div>
  );
}

function EndingView({
  s,
  onReset,
}: {
  s: State;
  onReset: () => void;
}) {
  const [e, setE] = useState<Ending | null>(null);

  useEffect(() => {
    if (!s.ending) {
      setE(null);
      return;
    }

    unsealEnding(s.ending)
      .then(setE)
      .catch(() => setE(null));
  }, [s.ending]);

  if (!e) {
    return (
      <main className="flex min-h-screen items-center justify-center font-mono text-muted-foreground">
        Unsealing the file…
      </main>
    );
  }

  const hintsUsed = Object.values(s.hints).reduce(
    (a, b) => a + (b ?? 0),
    0,
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 fade-up">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
        Case closed · {s.players.join(", ")}
      </p>

      <h1 className="mt-3 text-5xl font-bold">The lantern goes out</h1>

      <div className="mt-8 space-y-4 text-lg leading-relaxed">
        {e.reveal.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="mt-8 space-y-3 border-l-2 border-accent pl-4 text-secondary-foreground">
        {["theoGentle", "theoPressed", "noraPressed", "noraGentle"]
          .filter((f) => s.flags.includes(f))
          .map((f) => (
            <p key={f}>{e.choices[f]}</p>
          ))}
      </div>

      <h2 className="mt-12 text-3xl italic text-primary">Morning</h2>

      <p className="mt-3 text-lg leading-relaxed">{e.romance}</p>

      {s.flags.includes("samTrust") && (
        <p className="mt-3 italic text-muted-foreground">
          You think about &quot;Mostly.&quot; You decide you&apos;d like to be
          the exception.
        </p>
      )}

      <p className="mt-10 font-mono text-xs text-muted-foreground">
        Accusations used: {s.attempts + 1} · Hints used: {hintsUsed} · Actions:{" "}
        {s.turn}
      </p>

      <button
        onClick={onReset}
        className="mt-6 rounded border border-border px-4 py-2 text-sm hover:bg-secondary"
      >
        Investigate again
      </button>
    </main>
  );
}

function Failed({ onReset }: { onReset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 fade-up">
      <h1 className="text-5xl font-bold">The case goes cold</h1>

      <p className="mt-4 text-lg text-secondary-foreground">
        Three theories, three failures. Theo Lark is charged. In the basement,
        Sam Okoro boxes up the Lantern files and labels them in a careful hand:{" "}
        <em>Unresolved.</em>
      </p>

      <button
        onClick={onReset}
        className="mt-8 self-start rounded bg-primary px-6 py-2 font-semibold text-primary-foreground"
      >
        Reopen the case
      </button>
    </main>
  );
}
