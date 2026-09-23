/*
THESIS: Character press makes collective choice a toy you can operate, refusing a quiz dashboard.
OWN-WORLD: cobalt assembly field, acid-yellow clock, warm cream control deck, ink typography, vermilion phase accents.
STORY: compare the audience's character with yours, turn three knobs, feel voting narrow then freeze, see the deadline result.
FIRST VIEWPORT: broad paired-character stage left; huge clock and vote strips right; three equally weighted physical dials below. Start round is visible before any scrolling.
FORM: Character press, grounded candidate 1, user-selected pick; seed ee0edab4. Approved .impeccable/mocks/decision/press.png.
SIGNATURE: character parts seat with one short GSAP assembly bounce; vote changes, dials and phase strip follow the same abrupt-then-settle grammar. Reduced motion removes travel.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
*/
import { useEffect, useRef, useState, type PointerEvent } from "react";
import gsap from "gsap";
import { MascotScene } from "./MascotScene";
import { useGame } from "./useGame";
import {
  CATEGORIES,
  COLOURS,
  OPTIONS,
  type Category,
  type Command,
  type Snapshot,
  type Phase,
} from "../shared/game";

const PHASES: { id: Phase; label: string; short: string }[] = [
  { id: "open", label: "Open voting", short: "Open" },
  { id: "restricted", label: "Five voters", short: "Five voters" },
  { id: "frozen", label: "Fully frozen", short: "Frozen" },
  { id: "result", label: "The result", short: "Result" },
];
const KEYS: Record<Category, string[]> = {
  animal: ["A", "D"],
  colour: ["J", "L"],
  accessory: ["←", "→"],
};
const INSTRUCTIONS: Record<Phase, string> = {
  idle: "A crowd creates it. You recreate it.",
  open: "Everyone can change the target. Keep up.",
  restricted: "Five voters per team can still change it.",
  frozen: "The target is yours to catch. No more votes.",
  result: "Three choices. One signal. Here’s your result.",
};

function Icon({
  name,
  ...props
}: {
  name:
    | "play"
    | "pause"
    | "reset"
    | "message"
    | "settings"
    | "close"
    | "arrow"
    | "check"
    | "signal";
  className?: string;
}) {
  const paths = {
    play: <path d="m8 4 12 8-12 8z" fill="currentColor" stroke="none" />,
    pause: (
      <>
        <path d="M7 4v16M17 4v16" strokeWidth="5" />
      </>
    ),
    reset: (
      <>
        <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
      </>
    ),
    message: (
      <>
        <path d="M4 4h16v12H9l-5 4z" />
        <path d="M8 8h8M8 12h5" />
      </>
    ),
    settings: (
      <>
        <path d="M5 3v18M12 3v18M19 3v18M2 8h6M9 16h6M16 7h6" />
      </>
    ),
    close: <path d="m5 5 14 14M19 5 5 19" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    signal: (
      <>
        <path d="M4 16V8M10 20V4M16 17V7M22 14v-4" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
function Dial({
  category,
  value,
  disabled,
  onTurn,
  reduced,
}: {
  category: Category;
  value: number;
  disabled: boolean;
  onTurn: (direction: number) => void;
  reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const angle = useRef(value * 90);
  const previous = useRef(value);
  const start = useRef<{ y: number; last: number } | null>(null);
  useEffect(() => {
    let delta = (value - previous.current + 4) % 4;
    if (delta > 2) delta -= 4;
    angle.current += delta * 90;
    previous.current = value;
    gsap.to(ref.current, {
      rotation: angle.current,
      duration: reduced ? 0 : 0.28,
      ease: "back.out(1.5)",
      overwrite: true,
    });
    return () => {
      gsap.killTweensOf(ref.current);
    };
  }, [value, reduced]);
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    start.current = { y: event.clientY, last: 0 };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current || disabled) return;
    const steps = Math.trunc((start.current.y - event.clientY) / 23);
    if (steps !== start.current.last) {
      onTurn(steps > start.current.last ? 1 : -1);
      start.current.last = steps;
    }
  };
  return (
    <section
      className={`control control-${category}`}
      aria-label={`${category} control`}
    >
      <div className="control-title">
        <h2>{category}</h2>
        <span>{OPTIONS[category][value]}</span>
      </div>
      <div className="dial-row">
        <button
          className="step previous"
          aria-label={`Previous ${category}`}
          disabled={disabled}
          onClick={() => onTurn(-1)}
        >
          <Icon name="arrow" />
        </button>
        <div
          className="dial-touch"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${category} knob`}
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={value}
          aria-valuetext={OPTIONS[category][value]}
          aria-disabled={disabled}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={() => (start.current = null)}
          onPointerCancel={() => (start.current = null)}
          onKeyDown={(e) => {
            if (disabled) return;
            if (
              ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              e.stopPropagation();
              onTurn(e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : -1);
            }
          }}
        >
          <div className="dial-bezel">
            <div className="dial-face" ref={ref}>
              <i />
            </div>
          </div>
        </div>
        <button
          className="step next"
          aria-label={`Next ${category}`}
          disabled={disabled}
          onClick={() => onTurn(1)}
        >
          <Icon name="arrow" />
        </button>
      </div>
      <div className="key-hints">
        <kbd>{KEYS[category][0]}</kbd>
        <span>/</span>
        <kbd>{KEYS[category][1]}</kbd>
        <span className="drag-hint">or drag the dial</span>
      </div>
    </section>
  );
}

function Audience({ state }: { state: Snapshot }) {
  return (
    <div className="audience">
      <h2>
        Simulated audience <span>60 voters</span>
      </h2>
      {CATEGORIES.map((category) => (
        <div className="vote-row" key={category}>
          <div className="vote-label">
            <strong>{category}</strong>
            <span>
              {state.phase === "restricted" ? "5 can change" : "20 votes"}
            </span>
          </div>
          <div
            className="vote-bar"
            role="img"
            aria-label={state.teams[category].tallies
              .map((v, i) => `${OPTIONS[category][i]}: ${v} votes`)
              .join(", ")}
          >
            {state.teams[category].tallies.map((count, i) => (
              <span
                key={i}
                title={`${OPTIONS[category][i]}: ${count} votes`}
                style={{ width: `${count * 5}%`, backgroundColor: COLOURS[i] }}
              />
            ))}
          </div>
          <div className="vote-leader">
            <span>{OPTIONS[category][state.target[category]]}</span>
            <span>
              {state.teams[category].tallies[state.target[category]]}/20
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Inspector({
  state,
  send,
  connected,
  kind,
  close,
}: {
  state: Snapshot;
  send: (c: Command) => void;
  connected: boolean;
  kind: "messages" | "settings";
  close: () => void;
}) {
  const [tab, setTab] = useState(kind);
  const [open, setOpen] = useState(state.settings.openSeconds);
  const [result, setResult] = useState(state.settings.resultSeconds);
  const [team, setTeam] = useState<Category>("animal");
  const [voter, setVoter] = useState(0);
  const [choice, setChoice] = useState(0);
  const [loop, setLoop] = useState(state.settings.autoLoop);
  const [bots, setBots] = useState(state.settings.bots);
  const [saved, setSaved] = useState(false);
  const canEdit = state.phase === "idle" || state.paused;
  return (
    <section className="inspector" aria-label="Rehearsal inspector">
      <div className="inspector-heading">
        <div className="inspector-tabs">
          <button
            aria-pressed={tab === "messages"}
            onClick={() => setTab("messages")}
          >
            Messages
          </button>
          <button
            aria-pressed={tab === "settings"}
            onClick={() => setTab("settings")}
          >
            Rehearsal settings
          </button>
        </div>
        <button
          className="icon-button"
          aria-label="Close inspector"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      {tab === "messages" ? (
        <>
          <p>
            These are real messages from the local game server. The audience and
            controller inputs are simulated.
          </p>
          <div className="inspector-grid">
            <div>
              <h3>The selected five</h3>
              <label className="field">
                Team
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value as Category)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <div className="voter-grid">
                {state.teams[team].voters.map((v) => (
                  <span
                    key={v.id}
                    className={v.selected ? "selected" : ""}
                    title={`Voter ${v.id + 1}: ${OPTIONS[team][v.choice]}${v.selected ? " — selected" : ""}`}
                  >
                    <b>{String(v.id + 1).padStart(2, "0")}</b>
                    <i style={{ backgroundColor: COLOURS[v.choice] }} />
                  </span>
                ))}
              </div>
              <p className="small-copy">
                {state.teams[team].swingPossible === null
                  ? "Five voters are selected when open voting ends."
                  : state.teams[team].swingPossible
                    ? "Highlighted voters were randomly selected from groups that could change the winner."
                    : "This majority cannot be overturned by five voters. Five were selected randomly; vote weights stay unchanged."}
              </p>
              <details>
                <summary>Send a simulated vote</summary>
                <div className="manual-vote">
                  <label className="field">
                    Voter
                    <select
                      value={voter}
                      onChange={(e) => setVoter(Number(e.target.value))}
                    >
                      {Array.from({ length: 20 }, (_, i) => (
                        <option key={i} value={i}>
                          {i + 1}
                          {state.teams[team].voters[i].selected
                            ? " · selected"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Choice
                    <select
                      value={choice}
                      onChange={(e) => setChoice(Number(e.target.value))}
                    >
                      {OPTIONS[team].map((o, i) => (
                        <option key={o} value={i}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    disabled={!connected}
                    onClick={() =>
                      send({
                        type: "vote",
                        category: team,
                        voter,
                        choice,
                        round: state.round,
                      })
                    }
                  >
                    Send vote
                  </button>
                </div>
                <p className="small-copy">
                  The server rejects late, frozen, or ineligible votes. Pause
                  and disable automatic audience votes in settings for manual
                  experiments.
                </p>
              </details>
            </div>
            <div>
              <h3>
                Message stream <span>newest first</span>
              </h3>
              <div
                className="event-stream"
                tabIndex={0}
                aria-label="Server message log"
              >
                {state.events.length ? (
                  [...state.events].reverse().map((e) => (
                    <article className="event" key={e.id}>
                      <div>
                        <time>
                          {new Date(e.at).toLocaleTimeString("en-GB")}
                        </time>
                        <strong>{e.type}</strong>
                        <span>R{e.round}</span>
                      </div>
                      <code>{JSON.stringify(e.data)}</code>
                    </article>
                  ))
                ) : (
                  <p>
                    Start a round or turn a knob. Messages will appear here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <p>
            Pause to edit. New durations take effect the next time that phase
            starts. Restricted voting and the final freeze each last 4 seconds.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send({
                type: "configure",
                settings: {
                  openSeconds: open,
                  resultSeconds: result,
                  autoLoop: loop,
                  bots,
                },
              });
              setSaved(true);
            }}
          >
            <fieldset disabled={!canEdit || !connected}>
              <div className="settings-grid">
                <label className="field">
                  Open voting <span>seconds</span>
                  <input
                    type="number"
                    min="4"
                    max="60"
                    value={open}
                    onChange={(e) => {
                      setOpen(Number(e.target.value));
                      setSaved(false);
                    }}
                  />
                </label>
                <label className="field">
                  Result interval <span>seconds</span>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={result}
                    onChange={(e) => {
                      setResult(Number(e.target.value));
                      setSaved(false);
                    }}
                  />
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={loop}
                    onChange={(e) => {
                      setLoop(e.target.checked);
                      setSaved(false);
                    }}
                  />
                  Keep rounds looping
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={bots}
                    onChange={(e) => {
                      setBots(e.target.checked);
                      setSaved(false);
                    }}
                  />
                  Automatic simulated votes
                </label>
              </div>
              <button className="solid-button" type="submit">
                {saved ? "Settings saved" : "Apply settings"}
              </button>
            </fieldset>
          </form>
          {!canEdit && (
            <button
              className="text-button"
              onClick={() => send({ type: "pause" })}
            >
              Pause to make changes
            </button>
          )}
          <p className="small-copy">
            Ties keep the current leader when possible; otherwise the first tied
            option in Fox/Frog/Owl/Panda, Red/Blue/Green/Yellow, or
            Crown/Sunglasses/Headphones/Bow tie order wins.
          </p>
        </>
      )}
    </section>
  );
}

export default function App() {
  const { state, connected, error, send } = useGame();
  const [inspector, setInspector] = useState<"messages" | "settings" | null>(
    null,
  );
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const root = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!state) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) ||
        target.getAttribute("role") === "slider" ||
        target.isContentEditable
      )
        return;
      const map: Record<string, [Category, number]> = {
        a: ["animal", -1],
        d: ["animal", 1],
        j: ["colour", -1],
        l: ["colour", 1],
        ArrowLeft: ["accessory", -1],
        ArrowRight: ["accessory", 1],
      };
      const command = map[event.key] ?? map[event.key.toLowerCase()];
      if (command) {
        event.preventDefault();
        if (connected && !state.paused && state.phase !== "result")
          send({
            type: "turn",
            category: command[0],
            delta: command[1],
            round: state.round,
          });
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (connected)
          send({
            type:
              state.phase === "idle"
                ? "start"
                : state.paused
                  ? "resume"
                  : "pause",
          });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state?.phase, state?.round, state?.paused, connected, send]);
  useEffect(() => {
    if (!root.current || reduced) return;
    const ctx = gsap.context(() => {
      if (root.current?.querySelector(".phase-marker")) {
        gsap.fromTo(
          ".phase-marker",
          { scaleX: 0.94 },
          { scaleX: 1, duration: 0.4, ease: "expo.out" },
        );
      }
      gsap.fromTo(
        ".phase-description",
        { y: 5 },
        { y: 0, duration: 0.35, ease: "expo.out" },
      );
    }, root);
    return () => ctx.revert();
  }, [state?.phase, reduced]);
  function showInspector(kind: "messages" | "settings") {
    setInspector((current) => (current === kind ? null : kind));
    setTimeout(
      () =>
        inspectorRef.current?.scrollIntoView({
          behavior: reduced ? "instant" : "smooth",
          block: "start",
        }),
      30,
    );
  }
  if (!state)
    return (
      <main className="connecting">
        <Icon name="signal" />
        <h1>Signal Lock</h1>
        <p>Connecting to your local game server…</p>
        <p className="small-copy">
          Keep the game server running. This page reconnects automatically.
        </p>
      </main>
    );
  const controlsDisabled =
    !connected || state.paused || state.phase === "result";
  const mainAction =
    state.phase === "idle" ? "Start round" : state.paused ? "Resume" : "Pause";
  const currentPhase = PHASES.find((p) => p.id === state.phase);
  const seconds = Math.ceil(state.remaining / 1000);
  const last = state.result ?? state.history.at(-1);
  return (
    <div
      ref={root}
      className={`app phase-${state.phase}${state.paused ? " is-paused" : ""}`}
      data-direction-seed="ee0edab4"
    >
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="Signal Lock home">
          <Icon name="signal" />
          Signal Lock
        </a>
        <span className="rehearsal">
          Solo rehearsal
          <span
            className={`connection ${connected ? "online" : ""}`}
            title={
              connected
                ? "Local server connected"
                : "Reconnecting to local server"
            }
          />
        </span>
        <div className="header-actions">
          <span className="round-label">
            Round <b>{String(state.round).padStart(2, "0")}</b>
          </span>
          <button
            className="icon-button"
            aria-label="Rehearsal settings"
            aria-expanded={inspector === "settings"}
            onClick={() => showInspector("settings")}
          >
            <Icon name="settings" />
          </button>
        </div>
      </header>
      {!connected && (
        <div className="connection-warning" role="alert">
          Connection lost. Controls are disabled while we reconnect; the server
          may still be running the round.
        </div>
      )}
      <nav className="phase-rail" aria-label="Round phases">
        {PHASES.map((phase, i) => (
          <div
            key={phase.id}
            className={state.phase === phase.id ? "active phase-marker" : ""}
            aria-current={state.phase === phase.id ? "step" : undefined}
          >
            <span>{i + 1}</span>
            {phase.short}
            {state.phase === phase.id && state.paused && <small>Paused</small>}
          </div>
        ))}
      </nav>
      <main>
        <div className="game-board">
          <section
            className="stage"
            aria-label="Compare the target with your signal"
          >
            <div className="stage-titles">
              <div>
                <h1>Target</h1>
                <span>
                  {state.phase === "idle"
                    ? "Audience preview"
                    : state.phase === "frozen"
                      ? "Locked in"
                      : state.phase === "result"
                        ? "The final target"
                        : "The audience decides"}
                </span>
              </div>
              <div>
                <h2>Your signal</h2>
                <span>
                  {state.paused
                    ? "Controls paused"
                    : state.phase === "result"
                      ? "Your final selection"
                      : "Make them match"}
                </span>
              </div>
            </div>
            <MascotScene
              target={state.target}
              selection={state.selection}
              reducedMotion={reduced}
            />
            <svg
              className="comparison-arrow"
              viewBox="0 0 60 48"
              aria-hidden="true"
            >
              <path d="M0 15h32V0l28 24-28 24V33H0z" fill="currentColor" />
            </svg>
            <div className="character-labels">
              {[state.target, state.selection].map((combo, i) => (
                <div key={i} className="character-label">
                  <strong>{OPTIONS.animal[combo.animal]}</strong>
                  <span>
                    {OPTIONS.colour[combo.colour]}
                    <i /> {OPTIONS.accessory[combo.accessory]}
                  </span>
                  {state.phase === "result" && i === 1 && (
                    <span className="match-stamps">
                      {CATEGORIES.map((c) => (
                        <b
                          key={c}
                          className={state.result?.matched[c] ? "matched" : ""}
                        >
                          {state.result?.matched[c] ? (
                            <Icon name="check" />
                          ) : (
                            <Icon name="close" />
                          )}
                          {c}
                        </b>
                      ))}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="stage-note">
              <span className="note-dot" />
              {state.phase === "idle"
                ? "Solo mode shows both characters. The workshop operator will only see their own."
                : state.paused
                  ? "Take a breath. The clock and voting are paused."
                  : INSTRUCTIONS[state.phase]}
            </div>
          </section>
          <aside className="status-panel" aria-label="Round status">
            <div className="clock-block">
              <div
                className="timer-number"
                aria-label={
                  state.phase === "idle"
                    ? "Ready to play"
                    : state.phase === "result"
                      ? `Score ${state.result?.score} out of 3`
                      : `${seconds} seconds remaining`
                }
              >
                {state.phase === "idle" ? (
                  <span className="ready-word">Ready.</span>
                ) : state.phase === "result" ? (
                  <>
                    {state.result?.score}
                    <small>/3</small>
                  </>
                ) : (
                  String(seconds).padStart(2, "0")
                )}
              </div>
              <div className="phase-description">
                <h2>
                  {state.paused
                    ? "Paused"
                    : state.phase === "idle"
                      ? "Find your signal"
                      : state.phase === "result"
                        ? state.result?.score === 3
                          ? "Signal locked!"
                          : "Keep tuning."
                        : currentPhase?.short}
                </h2>
                <p>
                  {state.phase === "idle"
                    ? "Three knobs. One crowd. Your move."
                    : state.phase === "result"
                      ? state.settings.autoLoop
                        ? `Next round in ${seconds}s`
                        : "Ready for another round?"
                      : state.paused
                        ? "Resume whenever you’re ready."
                        : state.phase === "restricted"
                          ? "Five can still change the outcome."
                          : state.phase === "frozen"
                            ? "4 seconds. No surprises."
                            : "seconds to change everything"}
                </p>
              </div>
            </div>
            <div className="score-line">
              <span>Last score</span>
              <strong>{last ? `${last.score}/3` : "—"}</strong>
              <span className="total-score">{state.total} total</span>
            </div>
            <Audience state={state} />
            <button
              className="play-button"
              disabled={!connected}
              onClick={() =>
                send({
                  type:
                    state.phase === "idle"
                      ? "start"
                      : state.paused
                        ? "resume"
                        : "pause",
                })
              }
            >
              <Icon
                name={state.phase === "idle" || state.paused ? "play" : "pause"}
              />
              {mainAction}
              <kbd>Space</kbd>
            </button>
          </aside>
        </div>
        <div className="control-deck">
          {CATEGORIES.map((category) => (
            <Dial
              key={category}
              category={category}
              value={state.selection[category]}
              reduced={reduced}
              disabled={controlsDisabled}
              onTurn={(delta) =>
                send({ type: "turn", category, delta, round: state.round })
              }
            />
          ))}
        </div>
        <footer className="utility-bar">
          <p>Turn the controls. Match the target. Beat the clock.</p>
          <div>
            <button
              aria-expanded={inspector === "messages"}
              onClick={() => showInspector("messages")}
            >
              <Icon name="message" />
              Messages
            </button>
            <button
              disabled={!connected}
              onClick={() => send({ type: "reset" })}
              title="Clear scores and return to ready"
            >
              <Icon name="reset" />
              Reset
            </button>
          </div>
        </footer>
        <div ref={inspectorRef}>
          {inspector && (
            <Inspector
              key={inspector}
              kind={inspector}
              state={state}
              send={send}
              connected={connected}
              close={() => setInspector(null)}
            />
          )}
        </div>
      </main>
      {error && (
        <div className="toast" role="alert">
          <Icon name="signal" />
          {error}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {state.paused
          ? "Game paused"
          : state.phase === "result"
            ? `Round ${state.round}: ${state.result?.score} of 3 matched.`
            : (currentPhase?.label ?? "Ready to start")}
      </span>
    </div>
  );
}
