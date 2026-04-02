"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Send,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── helpers ── */

function phoneMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function dateMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function parseBrDate(v: string): string | null {
  const parts = v.replace(/\D/g, "");
  if (parts.length !== 8) return null;
  const day = parseInt(parts.slice(0, 2), 10);
  const month = parseInt(parts.slice(2, 4), 10);
  const year = parseInt(parts.slice(4, 8), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1920 || year > new Date().getFullYear()) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/* ── Text-to-Speech ── */

const PREFERRED_VOICES = [
  "microsoft francisca online (natural)",
  "microsoft thalita online (natural)",
  "francisca",
  "thalita",
  "luciana",
  "fernanda",
  "vitoria",
  "camila",
  "maria",
];

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesCached = false;

function pickBestVoice(): SpeechSynthesisVoice | null {
  if (voicesCached && cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const ptBr = voices.filter(
    (v) => v.lang === "pt-BR" || v.lang === "pt_BR"
  );
  const ptAny = voices.filter((v) => v.lang.startsWith("pt"));
  const pool = ptBr.length > 0 ? ptBr : ptAny;
  if (pool.length === 0) return null;

  for (const name of PREFERRED_VOICES) {
    const match = pool.find((v) => v.name.toLowerCase().includes(name));
    if (match) {
      cachedVoice = match;
      voicesCached = true;
      return match;
    }
  }

  const natural = pool.find((v) =>
    v.name.toLowerCase().includes("natural")
  );
  if (natural) {
    cachedVoice = natural;
    voicesCached = true;
    return natural;
  }

  const nonGoogle = pool.filter(
    (v) => !v.name.toLowerCase().includes("google")
  );
  const pick = nonGoogle.length > 0 ? nonGoogle[0] : pool[0];
  cachedVoice = pick;
  voicesCached = true;
  return pick;
}

let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function startKeepAlive() {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else {
      stopKeepAlive();
    }
  }, 5000);
}

let onSpeakStart: (() => void) | null = null;
let onSpeakEnd: (() => void) | null = null;

function speak(text: string, voiceEnabled: boolean) {
  if (!voiceEnabled) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const clean = text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();

  if (!clean) return;

  const voice = pickBestVoice();
  const isNatural =
    voice &&
    (voice.name.toLowerCase().includes("natural") ||
      voice.name.toLowerCase().includes("luciana"));

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "pt-BR";
  utterance.voice = voice;

  if (isNatural) {
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
  } else {
    utterance.rate = 0.95;
    utterance.pitch = 1.2;
  }

  utterance.onstart = () => onSpeakStart?.();
  utterance.onend = () => {
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
      stopKeepAlive();
      onSpeakEnd?.();
    }
  };
  utterance.onerror = () => {
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
      stopKeepAlive();
      onSpeakEnd?.();
    }
  };

  window.speechSynthesis.speak(utterance);
  startKeepAlive();
}

function cancelSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  stopKeepAlive();
}

/* ── Steps & Messages ── */

type Step = "welcome" | "name" | "phone" | "birth" | "confirm" | "done";

const IZA_MESSAGES: Record<string, string> = {
  welcome:
    "Oi! Eu sou a IZA, assistente virtual da Bendita. Vou te ajudar a fazer seu cadastro rapidinho!",
  ask_name: "Para começar, qual é o seu nome completo?",
  ask_phone: "Agora me passa o seu número de celular com DDD:",
  ask_birth: "E qual a sua data de nascimento? dia, mês e ano.",
  confirm: "Confere se tá tudo certinho:",
  done: "Cadastro feito com sucesso! Seja muito bem-vinda à Bendita!",
  error_name: "Preciso do seu nome completo. Pode digitar novamente?",
  error_phone:
    "Esse telefone não parece válido. Digite com DDD, por exemplo: 41, 99999, 9999.",
  error_birth:
    "Data inválida. Use o formato dia, mês, ano. Por exemplo: 15, 03, 1990.",
};

/* ── Main Component ── */

export default function CadastroPage() {
  const [subtitle, setSubtitle] = useState("");
  const [step, setStep] = useState<Step>("welcome");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");

  // Confirm data shown separately
  const [confirmData, setConfirmData] = useState<{
    name: string;
    phone: string;
    birth: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef(true);

  useEffect(() => {
    voiceRef.current = voiceOn;
  }, [voiceOn]);

  useEffect(() => {
    onSpeakStart = () => setIsSpeaking(true);
    onSpeakEnd = () => setIsSpeaking(false);
    return () => {
      onSpeakStart = null;
      onSpeakEnd = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const handler = () => {
      voicesCached = false;
      cachedVoice = null;
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);

  const showSubtitle = useCallback(
    (text: string) => {
      setSubtitleVisible(false);
      // Small delay to trigger re-animation
      setTimeout(() => {
        setSubtitle(text);
        setSubtitleVisible(true);
        speak(text, voiceRef.current);
      }, 100);
    },
    []
  );

  // Focus input when step changes
  useEffect(() => {
    if (step === "name" || step === "phone" || step === "birth") {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [step]);

  // Initial welcome flow
  useEffect(() => {
    const t1 = setTimeout(() => showSubtitle(IZA_MESSAGES.welcome), 600);
    const t2 = setTimeout(() => {
      showSubtitle(IZA_MESSAGES.ask_name);
      setStep("name");
    }, 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [showSubtitle]);

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    if (!next) {
      cancelSpeech();
      setIsSpeaking(false);
    }
  }

  function getInputType() {
    if (step === "phone") return "tel";
    if (step === "birth") return "tel";
    return "text";
  }

  function getPlaceholder() {
    if (step === "name") return "Digite seu nome completo...";
    if (step === "phone") return "(41) 99999-9999";
    if (step === "birth") return "15/03/1990";
    return "";
  }

  function getLabel() {
    if (step === "name") return "Seu nome";
    if (step === "phone") return "Seu celular";
    if (step === "birth") return "Data de nascimento";
    return "";
  }

  function handleInputChange(value: string) {
    if (step === "phone") {
      setInput(phoneMask(value));
    } else if (step === "birth") {
      setInput(dateMask(value));
    } else {
      setInput(value);
    }
  }

  async function handleSubmit() {
    const val = input.trim();
    if (!val) return;

    if (step === "name") {
      if (val.length < 2) {
        showSubtitle(IZA_MESSAGES.error_name);
        return;
      }
      setName(val);
      setInput("");
      showSubtitle(`Prazer, ${val.split(" ")[0]}!`);
      setTimeout(() => {
        showSubtitle(IZA_MESSAGES.ask_phone);
        setStep("phone");
      }, 2500);
    } else if (step === "phone") {
      const digits = val.replace(/\D/g, "");
      if (digits.length < 10) {
        showSubtitle(IZA_MESSAGES.error_phone);
        return;
      }
      setPhone(val);
      setInput("");
      showSubtitle("Anotado!");
      setTimeout(() => {
        showSubtitle(IZA_MESSAGES.ask_birth);
        setStep("birth");
      }, 2000);
    } else if (step === "birth") {
      const iso = parseBrDate(val);
      if (!iso) {
        showSubtitle(IZA_MESSAGES.error_birth);
        return;
      }
      setBirth(val);
      setInput("");
      showSubtitle(IZA_MESSAGES.confirm);
      setTimeout(() => {
        setConfirmData({ name, phone, birth: val });
        setStep("confirm");
      }, 2500);
    }
  }

  async function handleConfirm() {
    setSending(true);
    try {
      const iso = parseBrDate(birth);
      const res = await fetch("/api/customers", {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone.replace(/\D/g, ""),
          birth_date: iso,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error || "Erro ao cadastrar");
      }
      setConfirmData(null);
      showSubtitle(IZA_MESSAGES.done);
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cadastrar");
    } finally {
      setSending(false);
    }
  }

  function handleRestart() {
    cancelSpeech();
    setIsSpeaking(false);
    setSubtitle("");
    setSubtitleVisible(false);
    setConfirmData(null);
    setStep("welcome");
    setInput("");
    setName("");
    setPhone("");
    setBirth("");
    setTimeout(() => {
      showSubtitle(IZA_MESSAGES.welcome);
      setTimeout(() => {
        showSubtitle(IZA_MESSAGES.ask_name);
        setStep("name");
      }, 5500);
    }, 400);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const showInput = step === "name" || step === "phone" || step === "birth";

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-black">
      {/* ── Background: IZA character image ── */}
      <div className="absolute inset-0">
        <Image
          src="/brand/iza-avatar.png"
          alt="IZA — Assistente Bendita"
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
      </div>

      {/* ── Top bar (floating) ── */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500",
              isSpeaking
                ? "border-gold-400 shadow-lg shadow-gold-400/30 scale-110"
                : "border-white/20"
            )}
          >
            <span className="text-xs font-black text-gold-400">IZA</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">IZA</p>
            <p className="text-[10px] text-white/50">Assistente Bendita</p>
          </div>
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="ml-1 flex items-center gap-[3px]">
              <span className="h-2 w-[3px] animate-bounce rounded-full bg-gold-400 [animation-duration:350ms]" />
              <span className="h-3 w-[3px] animate-bounce rounded-full bg-gold-400 [animation-delay:100ms] [animation-duration:350ms]" />
              <span className="h-2.5 w-[3px] animate-bounce rounded-full bg-gold-400 [animation-delay:200ms] [animation-duration:350ms]" />
              <span className="h-1.5 w-[3px] animate-bounce rounded-full bg-gold-400 [animation-delay:300ms] [animation-duration:350ms]" />
            </div>
          )}
        </div>
        <button
          onClick={toggleVoice}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border transition-all",
            voiceOn
              ? "border-gold-400/40 bg-gold-400/15 text-gold-400"
              : "border-white/10 bg-white/5 text-white/40"
          )}
        >
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </header>

      {/* ── Spacer pushes content to bottom ── */}
      <div className="flex-1" />

      {/* ── Bottom content area ── */}
      <div className="relative z-10 flex flex-col gap-4 px-5 pb-6">
        {/* Subtitle (IZA's speech as text) */}
        {subtitle && (
          <div
            className={cn(
              "transition-all duration-500",
              subtitleVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            )}
          >
            <p className="text-center text-lg font-semibold leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-xl">
              {subtitle}
            </p>
          </div>
        )}

        {/* Confirm card */}
        {step === "confirm" && confirmData && (
          <div className="mx-auto w-full max-w-sm animate-[fadeSlideIn_0.4s_ease-out] rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50">Nome</span>
                <span className="ml-auto text-sm font-semibold text-white">
                  {confirmData.name}
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50">Celular</span>
                <span className="ml-auto text-sm font-semibold text-white">
                  {confirmData.phone}
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50">Nascimento</span>
                <span className="ml-auto text-sm font-semibold text-white">
                  {confirmData.birth}
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleRestart}
                disabled={sending}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 active:scale-[0.98]"
              >
                <RotateCcw size={15} />
                Corrigir
              </button>
              <button
                onClick={handleConfirm}
                disabled={sending}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gold-400 text-sm font-bold text-brand-900 shadow-lg shadow-gold-400/25 transition-all hover:bg-gold-300 active:scale-[0.98]"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Confirmar
              </button>
            </div>
          </div>
        )}

        {/* Done state */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 animate-[fadeSlideIn_0.4s_ease-out]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-400/20 backdrop-blur-xl">
              <CheckCircle size={32} className="text-gold-400" />
            </div>
            <button
              onClick={handleRestart}
              className="flex h-12 items-center gap-2 rounded-xl bg-white/10 px-8 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/15 active:scale-[0.98]"
            >
              <RotateCcw size={15} />
              Novo cadastro
            </button>
          </div>
        )}

        {/* Input area */}
        {showInput && (
          <div className="mx-auto w-full max-w-sm animate-[fadeSlideIn_0.3s_ease-out]">
            <label className="mb-2 block text-center text-xs font-medium uppercase tracking-widest text-gold-400">
              {getLabel()}
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type={getInputType()}
                inputMode={
                  step === "phone" || step === "birth" ? "numeric" : "text"
                }
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholder()}
                className={cn(
                  "h-14 flex-1 rounded-2xl border border-white/15 bg-white/10 px-5 text-center text-lg font-medium text-white backdrop-blur-xl",
                  "placeholder:text-white/25 focus:border-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                )}
                autoComplete="off"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95",
                  input.trim()
                    ? "bg-gold-400 text-brand-900 shadow-lg shadow-gold-400/30"
                    : "bg-white/5 text-white/20"
                )}
              >
                <Send size={22} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
