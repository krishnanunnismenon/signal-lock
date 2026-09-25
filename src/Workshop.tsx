/* THESIS: A pocket voting instrument extends Character press. OWN-WORLD: cobalt stage,
   yellow round signals, cream touch controls, condensed display and real toy geometry.
   STORY: Scan into a category, replace one vote, see your influence, follow the pair's score.
   FIRST VIEWPORT: phase and timer above a single target; four large vote pads below; fixed navigation.
   FORM: Approved mobile flow extending seed ee0edab4; no replacement visual world.
   FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance */
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import QRCode from "qrcode";
import gsap from "gsap";
import {
  CATEGORIES,
  COLOURS,
  OPTIONS,
  type Category,
  type Combination,
} from "../shared/game";
import { TEAM_NAMES, type Pair, type RoomState } from "../shared/room";
import { useRoom } from "./useRoom";
import { getHostAccess, serverOrigin, type HostAccess } from "./network";
import { MascotScene } from "./MascotScene";
import { Dial } from "./App";
import "./workshop.css";
const query = new URLSearchParams(location.search);
const sum = (p: Pair) => p.scores.reduce((a, b) => a + b, 0);
const comboText = (c: Combination) =>
  `${OPTIONS.colour[c.colour]} ${OPTIONS.animal[c.animal]} · ${OPTIONS.accessory[c.accessory]}`;
function SignalIcon() {
  return (
    <svg viewBox="0 0 30 30" width="28" height="28" aria-hidden="true">
      <path
        d="M4 10v10m6-15v20m5-18v16m5-12v8m5-7v6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M4 12h15m-6-6 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function useReduced() {
  const [value, set] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => set(q.matches);
    q.addEventListener("change", change);
    return () => q.removeEventListener("change", change);
  }, []);
  return value;
}
function Header({
  label,
  connected = true,
  host = false,
}: {
  label: string;
  connected?: boolean;
  host?: boolean;
}) {
  return (
    <header className="w-header">
      <a
        href={host ? "/" : "/join"}
        className="w-brand"
        aria-label="Signal Lock home"
      >
        <SignalIcon />
        <span>SIGNAL LOCK</span>
      </a>
      <span className="w-connection">
        <i className={connected ? "is-live" : ""} />
        {connected ? label : "Reconnecting"}
      </span>
    </header>
  );
}
function ErrorLine({ children }: { children: ReactNode }) {
  return children ? (
    <p className="w-error" role="alert">
      {children}
    </p>
  ) : null;
}
function Loading({ error }: { error?: string }) {
  return (
    <main className="w-loading">
      <SignalIcon />
      <h1>{error ? "Room unavailable." : "Finding your signal."}</h1>
      <p>
        {error || "Connecting to the laptop. Keep it running while you play."}
      </p>
      <button className="w-button" onClick={() => location.reload()}>
        Try again
      </button>
      <a href="/join">Join a room</a>
    </main>
  );
}
function Character({
  combo,
  title = "Live target",
}: {
  combo: Combination;
  title?: string;
}) {
  const reduced = useReduced();
  return (
    <section className="w-character" aria-label={title}>
      <div className="w-character-caption">
        <span>{title}</span>
        <strong>{OPTIONS.animal[combo.animal]}</strong>
      </div>
      <MascotScene
        target={combo}
        selection={combo}
        single
        reducedMotion={reduced}
      />
      <p>{comboText(combo)}</p>
    </section>
  );
}
function Phase({ state }: { state: RoomState }) {
  const g = state.game;
  const active = state.pairs.find((p) => p.id === state.activePairId);
  const words = {
    idle:
      active?.status === "complete" ? "Turn complete" : "Waiting for a pair",
    open: "Make your move.",
    restricted: "Five can change it.",
    frozen: "Target locked.",
    result: "That’s a match?",
  };
  return (
    <section className={`w-phase phase-${g.phase}`}>
      <div>
        <h1>{g.paused ? "Take a breath." : words[g.phase]}</h1>
        <p>
          {g.paused
            ? "The host paused the round."
            : active
              ? `${active.operator} + ${active.caller} · Round ${Math.min(g.round, state.roundsPerPair)}/${state.roundsPerPair}`
              : "The host will start the first pair."}
        </p>
      </div>
      <strong
        className="w-clock"
        aria-label={`${Math.ceil(g.remaining / 1000)} seconds remaining`}
      >
        {g.phase === "idle"
          ? "—"
          : Math.ceil(g.remaining / 1000)
              .toString()
              .padStart(2, "0")}
        <span>{g.phase === "idle" ? "READY" : "SEC"}</span>
      </strong>
    </section>
  );
}
function PhaseRail({ state }: { state: RoomState }) {
  return (
    <ol className="w-rail" aria-label="Round progress">
      {[
        ["open", "Vote"],
        ["restricted", "Five voters"],
        ["frozen", "Freeze"],
        ["result", "Score"],
      ].map(([phase, label]) => (
        <li
          key={phase}
          aria-current={state.game.phase === phase ? "step" : undefined}
        >
          {label}
        </li>
      ))}
    </ol>
  );
}
function Leaderboard({ state }: { state: RoomState }) {
  const done = state.pairs
    .filter((p) => p.status === "complete")
    .sort((a, b) => sum(b) - sum(a));
  const playing = state.pairs.find((p) => p.status === "playing");
  return (
    <section className="w-leaderboard">
      <div className="w-board-title">
        <h1>
          THE PAIR
          <br />
          TO BEAT.
        </h1>
        <p>
          {state.rehearsal ? "Rehearsal leaderboard" : "Pair leaderboard"}
          <br />
          {state.roundsPerPair} rounds · {state.roundsPerPair * 3} possible
          points
        </p>
      </div>
      {playing && (
        <div className="w-live-pair">
          <span>On stage now</span>
          <strong>
            {playing.operator} + {playing.caller}
          </strong>
          <span>
            {sum(playing)} pts · {playing.scores.length}/{state.roundsPerPair}{" "}
            scored
          </span>
        </div>
      )}
      {!done.length ? (
        <div className="w-empty">
          <SignalIcon />
          <h2>The first place is yours to set.</h2>
          <p>
            Completed pairs appear here. Audience members vote; only
            operator/caller pairs are ranked.
          </p>
        </div>
      ) : (
        <ol className="w-rankings">
          {done.map((pair) => (
            <li key={pair.id} data-rank={pair.rank}>
              <span className="w-rank" aria-label={`Rank ${pair.rank}`}>
                {String(pair.rank).padStart(2, "0")}
              </span>
              <div>
                <h2>
                  {pair.operator} <span>+</span> {pair.caller}
                </h2>
                <p>Operator & caller</p>
                <div
                  className="w-score-dots"
                  aria-label={`Round scores: ${pair.scores.join(", ")}`}
                >
                  {pair.scores.map((score, i) => (
                    <span key={i}>{score}</span>
                  ))}
                </div>
              </div>
              <strong className="w-points">
                {sum(pair)}
                <small>PTS</small>
              </strong>
            </li>
          ))}
        </ol>
      )}
      <p className="w-board-note">
        Equal points, equal rank. Every pair plays the same number of rounds.
      </p>
    </section>
  );
}
function ResultStrip({ state }: { state: RoomState }) {
  const pair = state.pairs.find((p) => p.id === state.activePairId);
  return state.game.result ? (
    <section className="w-result" aria-live="polite">
      <strong>
        {state.game.result.score}
        <span>/3</span>
      </strong>
      <div>
        <h2>
          {state.game.result.score === 3
            ? "Perfect signal."
            : "Round recorded."}
        </h2>
        <p>
          {pair?.status === "complete"
            ? `Turn complete · ${sum(pair)} of ${state.roundsPerPair * 3} points`
            : "One point for each matching part."}
        </p>
      </div>
    </section>
  ) : null;
}
function QR({ value, label }: { value: string; label: string }) {
  const [src, set] = useState("");
  useEffect(() => {
    let done = false;
    QRCode.toDataURL(value, {
      width: 240,
      margin: 3,
      color: { dark: "#16211e", light: "#f5f0df" },
      errorCorrectionLevel: "M",
    }).then((s) => {
      if (!done) set(s);
    });
    return () => {
      done = true;
    };
  }, [value]);
  return src ? (
    <img className="w-qr" src={src} alt={label} width="240" height="240" />
  ) : (
    <div className="w-qr" aria-label="Preparing QR code" />
  );
}

export function Participant() {
  const initialTeam = CATEGORIES.includes(query.get("team") as Category)
    ? (query.get("team") as Category)
    : "animal";
  const [team, setTeam] = useState<Category>(initialTeam);
  const [code, setCode] = useState(query.get("room") ?? "");
  const storageKey = `signal-lock-participant:${code.toUpperCase()}:${team}`;
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(
      `signal-lock-participant:${(query.get("room") ?? "").toUpperCase()}:${initialTeam}`,
    ),
  );
  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [tab, setTab] = useState<"vote" | "leaderboard">("vote");
  const { state, connected, error, expired, ack, send } = useRoom(
    "participant",
    token,
  );
  const [pending, setPending] = useState<{
    id: string;
    choice: number;
    round: number;
  } | null>(null);
  const [counted, setCounted] = useState<number | null>(null);
  const receipt = useRef<HTMLParagraphElement>(null);
  const reduced = useReduced();
  useEffect(() => {
    if (pending && ack?.id === pending.id) {
      setCounted(pending.choice);
      setPending(null);
      if (!reduced)
        gsap.fromTo(
          receipt.current,
          { y: 5 },
          { y: 0, duration: 0.3, ease: "power3.out" },
        );
    }
  }, [ack]);
  useEffect(() => {
    setCounted(null);
    setPending(null);
  }, [state?.game.round, state?.activePairId]);
  useEffect(() => {
    if (error || !connected) setPending(null);
  }, [error, connected]);
  async function join(e: FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError("");
    try {
      const response = await fetch(`${serverOrigin}/api/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          category: team,
          nickname,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      localStorage.setItem(storageKey, result.token);
      history.replaceState(
        null,
        "",
        `/join?room=${encodeURIComponent(code.trim().toUpperCase())}&team=${team}`,
      );
      setToken(result.token);
    } catch (e) {
      setJoinError(
        e instanceof Error
          ? e.message
          : "Could not join. Check your connection.",
      );
    } finally {
      setJoining(false);
    }
  }
  function rejoin() {
    localStorage.removeItem(storageKey);
    setToken(null);
  }
  if (expired)
    return (
      <div className="workshop w-phone">
        <Header label="Join again" />
        <main className="w-join">
          <h1>
            Your place
            <br />
            has closed.
          </h1>
          <p>{error}</p>
          <button className="w-button" onClick={rejoin}>
            Join again <Arrow />
          </button>
        </main>
      </div>
    );
  if (!token)
    return (
      <div className="workshop w-phone">
        <Header label="Audience" />
        <main className="w-join">
          <div className="w-join-heading">
            <h1>
              A LITTLE VOTE.
              <br />A BIG TWIST.
            </h1>
            <p>One crowd. Three parts. Your move.</p>
          </div>
          <div className="w-team-banner">
            <SignalIcon />
            <span>
              Team <strong>{TEAM_NAMES[team]}</strong>
            </span>
            <span>
              20
              <br />
              places
            </span>
          </div>
          <form onSubmit={join} className="w-join-form">
            <label>
              Room code
              <input
                required
                autoComplete="off"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Shown on the host screen"
              />
            </label>
            {!query.get("team") ? (
              <label>
                Your team
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value as Category)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {TEAM_NAMES[c]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p>
                You scanned the {TEAM_NAMES[team]} code. You’ll vote on the
                character’s {team}.
              </p>
            )}
            <label>
              What should we call you?
              <input
                required
                maxLength={28}
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
              />
            </label>
            <ErrorLine>{joinError}</ErrorLine>
            <button className="w-button" disabled={joining}>
              {joining ? "Joining…" : `Join team ${TEAM_NAMES[team]}`}
              <Arrow />
            </button>
            <p className="w-fine">
              No account needed. Keep this tab to hold your place.
            </p>
          </form>
        </main>
        <div className="w-join-bottom">ANIMAL / COLOUR / ACCESSORY</div>
      </div>
    );
  if (!state)
    return (
      <div className="workshop w-phone">
        <Header label="Joining" connected={false} />
        <Loading error={error} />
      </div>
    );
  const me = state.me!;
  const g = state.game;
  const canVote =
    connected &&
    !g.paused &&
    (g.phase === "open" || (g.phase === "restricted" && me.selected));
  const tally = g.tallies![me.category];
  const status = g.paused
    ? "Your vote is held while the game is paused."
    : g.phase === "restricted"
      ? me.selected
        ? "You’re one of the five. Keep it or change it."
        : "Your vote stays counted. Five teammates can still change theirs."
      : g.phase === "frozen"
        ? "All votes are locked. It’s over to the operator."
        : g.phase === "open"
          ? "Tap a choice. You can change your mind."
          : g.phase === "result"
            ? "Votes are in. See how the pair did."
            : "Your place is saved. Wait for the host to start.";
  return (
    <div className="workshop w-phone">
      <Header
        label={`${me.nickname} · ${TEAM_NAMES[me.category]}`}
        connected={connected}
      />
      <ErrorLine>{error}</ErrorLine>
      {!connected && (
        <p className="w-offline" role="status">
          Reconnecting. Voting is paused on your phone.
        </p>
      )}
      {tab === "leaderboard" ? (
        <Leaderboard state={state} />
      ) : (
        <>
          <Phase state={state} />
          <PhaseRail state={state} />
          <Character combo={g.target!} />
          <ResultStrip state={state} />
          <section
            className={`w-vote-panel ${g.phase === "restricted" && me.selected ? "chosen-five" : ""}`}
          >
            <div className="w-vote-title">
              <h2>
                {g.phase === "restricted" && me.selected
                  ? "YOU’RE ONE OF FIVE."
                  : `PICK THE ${TEAM_NAMES[me.category].toUpperCase()}.`}
              </h2>
              <span>
                {state.counts[me.category].human} human
                <br />
                {state.counts[me.category].simulated} simulated
              </span>
            </div>
            <p className="w-vote-status" role="status">
              {status}
            </p>
            {me.forced && state.rehearsal && (
              <p className="w-rehearsal-note">
                Rehearsal: the host reserved your place among the five.
              </p>
            )}
            <div className="w-vote-grid">
              {OPTIONS[me.category].map((option, index) => (
                <button
                  key={option}
                  disabled={!canVote || pending !== null}
                  aria-pressed={me.choice === index}
                  onClick={() => {
                    const id = send({
                      type: "vote",
                      choice: index,
                      round: g.round,
                      pairId: state.activePairId,
                    });
                    if (id)
                      setPending({
                        id,
                        choice: index,
                        round: g.round,
                      });
                  }}
                  className={`w-vote ${me.choice === index ? "is-chosen" : ""}`}
                >
                  <span className="w-vote-option">
                    {me.category === "colour" && (
                      <i style={{ background: COLOURS[index] }} />
                    )}
                    {option}
                  </span>
                  <span className="w-vote-count">
                    {tally[index]}
                    <small>/20</small>
                    <span>
                      {me.choice === index
                        ? "Your vote"
                        : `${Math.round((tally[index] / 20) * 100)}%`}
                    </span>
                  </span>
                  <span className="w-vote-track">
                    <span
                      style={{ transform: `scaleX(${tally[index] / 20})` }}
                    />
                  </span>
                </button>
              ))}
            </div>
            <p className="w-receipt" ref={receipt} aria-live="polite">
              {pending
                ? "Sending your vote…"
                : counted !== null
                  ? `Vote counted: ${OPTIONS[me.category][counted]}.`
                  : g.phase === "open"
                    ? `Carried vote: ${OPTIONS[me.category][me.choice]}. Tap any choice to confirm or change it.`
                    : `Your vote: ${OPTIONS[me.category][me.choice]}.`}
            </p>
          </section>
        </>
      )}
      <nav className="w-bottom-nav" aria-label="Participant views">
        <button
          aria-current={tab === "vote" ? "page" : undefined}
          onClick={() => setTab("vote")}
        >
          <SignalIcon />
          Your vote
        </button>
        <button
          aria-current={tab === "leaderboard" ? "page" : undefined}
          onClick={() => setTab("leaderboard")}
        >
          Pair leaderboard <Arrow />
        </button>
      </nav>
    </div>
  );
}

export function Operator() {
  const token = query.get("key");
  const { state, connected, error, send } = useRoom("operator", token);
  const reduced = useReduced();
  useEffect(() => {
    if (!state) return;
    const keys: Record<string, [Category, number]> = {
      a: ["animal", -1],
      d: ["animal", 1],
      j: ["colour", -1],
      l: ["colour", 1],
      ArrowLeft: ["accessory", -1],
      ArrowRight: ["accessory", 1],
    };
    const handle = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        ["INPUT", "BUTTON", "TEXTAREA", "SELECT"].includes(el.tagName) ||
        el.getAttribute("role") === "slider" ||
        el.isContentEditable
      )
        return;
      const step = keys[event.key] ?? keys[event.key.toLowerCase()];
      if (
        step &&
        connected &&
        !state.game.paused &&
        !["idle", "result"].includes(state.game.phase)
      ) {
        event.preventDefault();
        send({
          type: "turn",
          category: step[0],
          delta: step[1],
          round: state.game.round,
          pairId: state.activePairId,
        });
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [
    state?.game.phase,
    state?.game.paused,
    state?.game.round,
    state?.activePairId,
    connected,
    send,
  ]);
  if (!token)
    return (
      <div className="workshop">
        <Loading error="Open the operator link from the host screen." />
      </div>
    );
  if (!state)
    return (
      <div className="workshop">
        <Loading error={error} />
      </div>
    );
  const g = state.game;
  return (
    <div className="workshop w-operator">
      <Header label="Operator" connected={connected} />
      <Phase state={state} />
      <PhaseRail state={state} />
      <ErrorLine>{error}</ErrorLine>
      <Character combo={g.selection} title="Your signal" />
      <p className="w-operator-note">
        Listen to your caller. Match their instructions.
      </p>
      <div className="control-deck">
        {CATEGORIES.map((c) => (
          <Dial
            key={c}
            category={c}
            value={g.selection[c]}
            disabled={
              !connected || g.paused || ["idle", "result"].includes(g.phase)
            }
            reduced={reduced}
            onTurn={(delta) =>
              send({
                type: "turn",
                category: c,
                delta,
                round: g.round,
                pairId: state.activePairId,
              })
            }
          />
        ))}
      </div>
      <ResultStrip state={state} />
      <p className="w-fine">The target is hidden on this screen.</p>
    </div>
  );
}
export function Display() {
  const { state, error } = useRoom("display", query.get("room"));
  const [board, setBoard] = useState(query.has("scores"));
  if (!state)
    return (
      <div className="workshop">
        <Loading
          error={
            error ||
            (!query.get("room")
              ? "Open the projector link from the host screen."
              : undefined)
          }
        />
      </div>
    );
  return (
    <div className="workshop w-display">
      <Header label={state.rehearsal ? "Rehearsal projector" : "Projector"} />
      <nav className="w-tabs">
        <button
          aria-current={!board ? "page" : undefined}
          onClick={() => setBoard(false)}
        >
          Live target
        </button>
        <button
          aria-current={board ? "page" : undefined}
          onClick={() => setBoard(true)}
        >
          Pair leaderboard
        </button>
      </nav>
      {board ? (
        <Leaderboard state={state} />
      ) : (
        <>
          <Phase state={state} />
          <PhaseRail state={state} />
          <Character combo={state.game.target!} />
          <ResultStrip state={state} />
          <p className="w-fine">
            Caller: describe the target. Operator: listen and match.
          </p>
        </>
      )}
    </div>
  );
}

export function Host() {
  const [access, setAccess] = useState<HostAccess | null>(null),
    [accessError, setAccessError] = useState("");
  const [tab, setTab] = useState<"desk" | "join" | "leaderboard">("desk");
  const [operator, setOperator] = useState(""),
    [caller, setCaller] = useState("");
  const [rounds, setRounds] = useState(5),
    [seconds, setSeconds] = useState(12),
    [rehearsal, setRehearsal] = useState(true);
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState("");
  const [preview, setPreview] = useState<Category | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const { state, connected, error, ack, send } = useRoom(
    "host",
    access?.token ?? null,
  );
  useEffect(() => {
    getHostAccess()
      .then((a) => {
        setAccess(a);
        setAddress(a.addresses[0] ?? "");
      })
      .catch((e) => setAccessError(e.message));
  }, []);
  useEffect(() => {
    if (state) {
      setRounds(state.roundsPerPair);
      setSeconds(state.game.openSeconds);
      setRehearsal(state.rehearsal);
    }
  }, [state?.roundsPerPair, state?.game.openSeconds, state?.rehearsal]);
  useEffect(() => {
    if (ack?.id === adding) {
      setOperator("");
      setCaller("");
      setAdding(null);
    }
  }, [ack]);
  useEffect(() => {
    if (error) setAdding(null);
  }, [error]);
  if (!state || !access)
    return (
      <div className="workshop">
        <Header label="Host" />
        <Loading error={accessError || error} />
      </div>
    );
  const g = state.game,
    active = state.pairs.find((p) => p.id === state.activePairId);
  const started = state.pairs.some((p) => p.status !== "waiting");
  const base = address
    ? `${location.protocol}//${address}:${access.production ? access.port : location.port || 5173}`
    : location.origin;
  const joinUrl = (c: Category, local = false) =>
    `${local ? location.origin : base}/join?room=${state.code}&team=${c}`;
  const operatorUrl = `${base}/operator?key=${state.operatorKey}`;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("Select and copy the link below.");
    }
  }
  return (
    <div className="workshop w-host">
      <Header
        label={state.rehearsal ? "Host · rehearsal" : "Host · workshop"}
        connected={connected}
        host
      />
      <div className="w-host-title">
        <h1>THE CONTROL ROOM.</h1>
        <p>
          Room <strong>{state.code}</strong>
          <span>
            60 votes · 3 teams · {state.roundsPerPair} rounds per pair
          </span>
        </p>
      </div>
      <nav className="w-tabs" aria-label="Host views">
        {[
          ["desk", "Run the game"],
          ["join", "Bring the crowd"],
          ["leaderboard", "Pair leaderboard"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id as typeof tab)}
          >
            {label}
          </button>
        ))}
        <a href="/solo" target="_blank" rel="noreferrer">
          Solo sandbox <Arrow />
        </a>
      </nav>
      <ErrorLine>{error}</ErrorLine>
      {!connected && (
        <p className="w-offline">
          Connection lost. Host controls will return when the room reconnects.
        </p>
      )}
      {tab === "desk" ? (
        <main className="w-host-grid">
          <section className="w-desk-main">
            <Phase state={state} />
            <PhaseRail state={state} />
            <div className="w-host-stage">
              <Character combo={g.target!} />
              <div className="w-host-stage-controls">
                <h2>
                  {active
                    ? `${active.operator} + ${active.caller}`
                    : "Who’s on stage?"}
                </h2>
                <p>
                  {active
                    ? `${sum(active)} points · ${active.scores.length}/${state.roundsPerPair} rounds scored`
                    : "Add an operator and caller below, then start their turn."}
                </p>
                {g.phase !== "idle" && (
                  <button
                    className="w-button"
                    disabled={!connected}
                    onClick={() =>
                      send({ type: g.paused ? "resume" : "pause" })
                    }
                  >
                    {g.paused ? "Resume round" : "Pause round"}
                  </button>
                )}
                <a
                  className="w-button w-outline"
                  href={`/operator?key=${state.operatorKey}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open operator screen <Arrow />
                </a>
                <a
                  className="w-text-link"
                  href={`/display?room=${state.code}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open caller / projector view <Arrow />
                </a>
                <p className="w-fine">
                  The host sees the target. Keep the operator on their own
                  screen.
                </p>
              </div>
            </div>
            <ResultStrip state={state} />
            <section className="w-pair-queue">
              <h2>Next at the controls.</h2>
              <form
                className="w-pair-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setAdding(send({ type: "add-pair", operator, caller }));
                }}
              >
                <label>
                  Operator
                  <input
                    required
                    maxLength={28}
                    placeholder="Name"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                  />
                </label>
                <label>
                  Caller
                  <input
                    required
                    maxLength={28}
                    placeholder="Name"
                    value={caller}
                    onChange={(e) => setCaller(e.target.value)}
                  />
                </label>
                <button
                  className="w-button"
                  disabled={!connected || adding !== null}
                >
                  Add pair <Arrow />
                </button>
              </form>
              {!state.pairs.length ? (
                <p className="w-fine">
                  No pairs yet. You can use your own name and a rehearsal
                  partner.
                </p>
              ) : (
                <ul className="w-queue">
                  {state.pairs.map((p) => (
                    <li key={p.id}>
                      <div>
                        <strong>
                          {p.operator} + {p.caller}
                        </strong>
                        <span>
                          {p.status === "waiting"
                            ? "Ready to play"
                            : p.status === "playing"
                              ? `Playing · ${p.scores.length}/${state.roundsPerPair} scored`
                              : `Complete · ${sum(p)} pts · Rank ${p.rank}`}
                        </span>
                      </div>
                      {p.status === "waiting" && (
                        <div className="w-queue-actions">
                          <button
                            className="w-button"
                            disabled={!connected || g.phase !== "idle"}
                            onClick={() =>
                              send({ type: "start-pair", id: p.id })
                            }
                          >
                            Start turn <Arrow />
                          </button>
                          <button
                            className="w-text-link"
                            disabled={!connected}
                            onClick={() =>
                              send({ type: "remove-pair", id: p.id })
                            }
                            aria-label={`Remove ${p.operator} and ${p.caller}`}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </section>
          <aside className="w-desk-side">
            <section>
              <h2>The crowd is ready.</h2>
              <p>
                Simulated voters fill every unclaimed place. Joining replaces
                one simulation.
              </p>
              {CATEGORIES.map((c) => (
                <div className="w-team-row" key={c}>
                  <strong>{TEAM_NAMES[c]}</strong>
                  <span>
                    {state.counts[c].online} online / {state.counts[c].human}{" "}
                    joined
                    <br />
                    {state.counts[c].simulated} simulated
                  </span>
                  <button className="w-text-link" onClick={() => setPreview(c)}>
                    Preview <Arrow />
                  </button>
                </div>
              ))}
              <button className="w-button" onClick={() => setTab("join")}>
                Show team QR codes <Arrow />
              </button>
            </section>
            <section className="w-session-settings">
              <h2>Same rules. Every pair.</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send({
                    type: "configure-room",
                    rounds,
                    rehearsal,
                    openSeconds: seconds,
                  });
                }}
              >
                <fieldset disabled={started || !connected}>
                  <label>
                    Rounds per pair
                    <input
                      type="number"
                      min="1"
                      max="20"
                      required
                      value={rounds}
                      onChange={(e) => setRounds(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Open voting · seconds
                    <input
                      type="number"
                      min="4"
                      max="60"
                      required
                      value={seconds}
                      onChange={(e) => setSeconds(Number(e.target.value))}
                    />
                  </label>
                  <label className="w-checkbox">
                    <input
                      type="checkbox"
                      checked={rehearsal}
                      onChange={(e) => setRehearsal(e.target.checked)}
                    />
                    Rehearsal mode
                  </label>
                  <button className="w-button">Save session rules</button>
                </fieldset>
              </form>
              <p className="w-fine">
                {started
                  ? "Rules locked for this session. Every pair gets the same round count."
                  : "Default: 5 rounds. Custom: 1–20. Rules lock when the first pair starts."}{" "}
                Four seconds for the five, then four seconds frozen.
              </p>
              {ack?.command === "configure-room" && (
                <p role="status" className="w-saved">
                  Session rules saved.
                </p>
              )}
            </section>
            <section className="w-members">
              <h2>People in the room.</h2>
              {!state.members?.length ? (
                <p>Open a participant preview or scan a QR to claim a place.</p>
              ) : (
                state.members.map((m) => (
                  <div key={m.id} className="w-member">
                    <strong>
                      {m.nickname}
                      <span>
                        {TEAM_NAMES[m.category]} ·{" "}
                        {m.online ? "Online" : "Offline"}
                      </span>
                    </strong>
                    {state.rehearsal && (
                      <button
                        className="w-text-link"
                        disabled={
                          !connected || !["idle", "open"].includes(g.phase)
                        }
                        onClick={() =>
                          send({
                            type: "force-voter",
                            id: m.id,
                            enabled: !m.forced,
                          })
                        }
                      >
                        {m.forced ? "Remove reservation" : "Put in the five"}
                      </button>
                    )}
                    <button
                      className="w-text-link"
                      disabled={!connected}
                      onClick={() => send({ type: "remove-member", id: m.id })}
                    >
                      Release place
                    </button>
                  </div>
                ))
              )}
              {state.rehearsal && (
                <p className="w-fine">
                  “Put in the five” reserves one tester per team for each
                  restricted phase. Rehearsal only.
                </p>
              )}
            </section>
          </aside>
        </main>
      ) : tab === "leaderboard" ? (
        <Leaderboard state={state} />
      ) : (
        <main className="w-join-host">
          <div className="w-invite-intro">
            <h2>
              THREE TEAMS.
              <br />
              ONE UNPREDICTABLE CROWD.
            </h2>
            <div>
              <p>Show each group its code. They’ll join the right team.</p>
              <label>
                Laptop Wi-Fi address
                <select
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                >
                  <option value="">This laptop only</option>
                  {access.addresses.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <p className="w-fine">
                {address
                  ? "Phones must share the laptop’s Wi-Fi. Guest networks may prevent devices from connecting."
                  : "Choose a Wi-Fi address for phone QR codes. Laptop previews work without a phone."}
              </p>
            </div>
          </div>
          <div className="w-team-codes">
            {CATEGORIES.map((c, i) => (
              <section key={c}>
                <div className="w-code-title">
                  <h3>{TEAM_NAMES[c]}</h3>
                  <span>{i + 1}/3</span>
                </div>
                <QR
                  value={joinUrl(c)}
                  label={`Scan to join team ${TEAM_NAMES[c]}`}
                />
                <p>{state.counts[c].human}/20 places claimed</p>
                <button className="w-button" onClick={() => setPreview(c)}>
                  Preview on laptop <Arrow />
                </button>
                <button
                  className="w-text-link"
                  onClick={() => copy(joinUrl(c))}
                >
                  {copied === joinUrl(c) ? "Copied" : "Copy join link"}
                </button>
                <a
                  className="w-link-value"
                  href={joinUrl(c)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {joinUrl(c)}
                </a>
              </section>
            ))}
          </div>
          <section className="w-operator-invite">
            <div>
              <h2>One phone at the controls.</h2>
              <p>
                Give this link only to the operator. Their screen shows their
                character and three controls.
              </p>
              <button className="w-button" onClick={() => copy(operatorUrl)}>
                {copied === operatorUrl ? "Copied" : "Copy operator link"}
                <Arrow />
              </button>
              <a
                className="w-link-value"
                href={operatorUrl}
                target="_blank"
                rel="noreferrer"
              >
                {operatorUrl}
              </a>
            </div>
            <QR
              value={operatorUrl}
              label="Scan to open the operator controls"
            />
          </section>
        </main>
      )}
      <footer className="w-host-footer">
        <span>
          Signal Lock ·{" "}
          {state.rehearsal ? "Rehearsal session" : "Workshop session"}
        </span>
        <span>
          Session stays on this laptop. Restarting the server clears it.
        </span>
      </footer>
      {preview && (
        <div className="w-preview-shell">
          <div className="w-preview-bar">
            <strong>{TEAM_NAMES[preview]} · phone preview</strong>
            <button className="w-button" onClick={() => setPreview(null)}>
              Close preview
            </button>
          </div>
          <iframe
            title={`${TEAM_NAMES[preview]} participant preview`}
            src={joinUrl(preview, true)}
          />
        </div>
      )}
    </div>
  );
}
