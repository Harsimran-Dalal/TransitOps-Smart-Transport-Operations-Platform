import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import { api } from "../lib/api";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: { item: (i: number) => { item: (j: number) => { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function FleetCopilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery({
    queryKey: ["ai-status"],
    queryFn: async () => (await api.get<{ enabled: boolean }>("/ai/status")).data
  });

  const ask = useMutation({
    mutationFn: async (q: string) => (await api.post<{ answer: string }>("/ai/ask", { question: q })).data,
    onSuccess: (data, q) => {
      setHistory((h) => [...h, { role: "user", text: q }, { role: "assistant", text: data.answer }]);
      setQuestion("");
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: err.response?.data?.error ?? "Could not reach Fleet Copilot. Check your connection."
        }
      ]);
    }
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [history, ask.isPending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = () => {
    const q = question.trim();
    if (!q || ask.isPending) return;
    ask.mutate(q);
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getSpeechRecognition();
    if (!rec) {
      setHistory((h) => [
        ...h,
        { role: "assistant", text: "Voice input is not supported in this browser. Type your question instead." }
      ]);
      return;
    }
    recognitionRef.current = rec;
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const transcript = event.results.item(0).item(0).transcript;
      setQuestion(transcript);
      ask.mutate(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const suggestions = [
    "Which vehicles are on trip right now?",
    "Any drivers with expiring licenses?",
    "How many trips are pending dispatch?",
    "Summarize today's fleet status"
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="copilot-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="copilot-panel"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <header className="copilot-head">
              <div>
                <h3>
                  <Sparkles size={18} /> Fleet Copilot
                </h3>
                <p className="muted">
                  {status?.enabled ? "AI search powered by Gemini" : "Add GEMINI_API_KEY to enable AI answers"}
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </header>

            <div className="copilot-body" ref={listRef}>
              {history.length === 0 && (
                <div className="copilot-welcome">
                  <p>Ask anything about your fleet — vehicles, drivers, dispatches, maintenance.</p>
                  <div className="copilot-suggestions">
                    {suggestions.map((s) => (
                      <button key={s} type="button" className="copilot-chip" onClick={() => ask.mutate(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {history.map((msg, i) => (
                <div key={i} className={`copilot-msg ${msg.role}`}>
                  {msg.text}
                </div>
              ))}
              {ask.isPending && <div className="copilot-msg assistant copilot-typing">Analyzing fleet data…</div>}
            </div>

            <footer className="copilot-foot">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Ask about vehicles, drivers, dispatches…"
                disabled={ask.isPending}
              />
              <button
                type="button"
                className={`btn-icon ${listening ? "active" : ""}`}
                onClick={toggleVoice}
                title="Voice search"
                aria-label="Voice search"
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button type="button" className="btn-primary btn-icon" onClick={submit} disabled={ask.isPending || !question.trim()}>
                <Send size={16} />
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
