"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Pill, Plus, Trash2, Users } from "lucide-react";

type Medication = {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  note: string;
};

type DoseLog = {
  id: string;
  medId: string;
  date: string;
  time: string;
  status: "taken" | "missed";
};

const KEY = "caremed-v1";

const seed: Medication[] = [
  { id: "m1", name: "혈압약", dosage: "1정", times: ["08:00", "20:00"], note: "식후" },
  { id: "m2", name: "당뇨약", dosage: "1정", times: ["08:30"], note: "아침 식사 직후" },
];

function todayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Tab = "today" | "meds" | "history" | "family";

export default function Home() {
  const [tab, setTab] = useState<Tab>("today");
  const [meds, setMeds] = useState<Medication[]>(seed);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(todayKey(new Date()));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { meds: Medication[]; logs: DoseLog[] };
        if (Array.isArray(parsed.meds)) setMeds(parsed.meds);
        if (Array.isArray(parsed.logs)) setLogs(parsed.logs);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify({ meds, logs }));
  }, [meds, logs, ready]);

  const slots = useMemo(() => {
    if (!date) return [];
    return meds
      .flatMap((med) =>
        med.times.map((time) => ({
          med,
          time,
          status: logs.find(
            (l) => l.medId === med.id && l.date === date && l.time === time,
          )?.status,
        })),
      )
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [meds, logs, date]);

  const done = slots.filter((s) => s.status === "taken").length;

  function logDose(medId: string, time: string, status: "taken" | "missed") {
    if (!date) return;
    setLogs((prev) => {
      const rest = prev.filter(
        (l) => !(l.medId === medId && l.date === date && l.time === time),
      );
      return [
        { id: crypto.randomUUID(), medId, date, time, status },
        ...rest,
      ];
    });
  }

  function addMed(input: Omit<Medication, "id">) {
    setMeds((prev) => [...prev, { ...input, id: crypto.randomUUID() }]);
  }

  function removeMed(id: string) {
    setMeds((prev) => prev.filter((m) => m.id !== id));
  }

  if (!date) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center bg-[#f4efe6] px-4 text-[#1c1915]">
        <p className="text-lg text-[#6b645b]">불러오는 중…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-[#f4efe6] px-4 pb-28 pt-6 text-[#1c1915]">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#6b645b]">케어메드</p>
          <h1 className="text-3xl font-bold tracking-tight">오늘의 약</h1>
        </div>
        <button
          type="button"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow-sm ring-1 ring-[#e4dccf]"
          onClick={async () => {
            if (typeof Notification === "undefined") {
              setBanner("이 브라우저에서는 알림을 지원하지 않습니다.");
              return;
            }
            const result = await Notification.requestPermission();
            setBanner(
              result === "granted"
                ? "알림을 켰습니다. 앱을 열어 둔 동안 시간에 맞춰 알려 드립니다."
                : "알림이 꺼져 있습니다. 화면 목록으로 확인하세요.",
            );
          }}
        >
          <Bell className="size-5" />
          알림
        </button>
      </header>

      {banner ? (
        <p className="mb-4 rounded-2xl bg-[#f8e6d8] px-4 py-3 text-base font-medium text-[#c45c26]">
          {banner}
        </p>
      ) : null}

      {tab === "today" && (
        <section className="flex flex-col gap-3">
          <p className="text-lg text-[#6b645b]">
            {date} · {done}/{slots.length || 0} 복용
          </p>
          {slots.length === 0 ? (
            <p className="rounded-2xl bg-white px-4 py-8 text-center text-lg text-[#6b645b] ring-1 ring-[#e4dccf]">
              등록된 약이 없습니다. 약 탭에서 추가하세요.
            </p>
          ) : null}
          {slots.map((slot) => (
            <article
              key={`${slot.med.id}-${slot.time}`}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e4dccf]"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0f6e6a]">{slot.time}</p>
                  <h2 className="text-2xl font-bold">{slot.med.name}</h2>
                  <p className="text-lg text-[#6b645b]">
                    {slot.med.dosage}
                    {slot.med.note ? ` · ${slot.med.note}` : ""}
                  </p>
                </div>
                <Pill className="size-7 text-[#0f6e6a]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`min-h-14 rounded-2xl text-lg font-bold ${
                    slot.status === "taken"
                      ? "bg-[#1f7a4d] text-white"
                      : "bg-[#e3f3ea] text-[#1f7a4d]"
                  }`}
                  onClick={() => logDose(slot.med.id, slot.time, "taken")}
                >
                  <span className="inline-flex items-center gap-2">
                    <Check className="size-5" />
                    먹었어요
                  </span>
                </button>
                <button
                  type="button"
                  className={`min-h-14 rounded-2xl text-lg font-bold ${
                    slot.status === "missed"
                      ? "bg-[#8a3a32] text-white"
                      : "bg-[#f8e4e1] text-[#8a3a32]"
                  }`}
                  onClick={() => logDose(slot.med.id, slot.time, "missed")}
                >
                  못 먹었어요
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "meds" && (
        <MedList meds={meds} onAdd={addMed} onRemove={removeMed} />
      )}
      {tab === "history" && <History logs={logs} meds={meds} />}
      {tab === "family" && (
        <Family slots={slots} done={done} total={slots.length} />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[#e4dccf] bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {(
            [
              ["today", "오늘"],
              ["meds", "약"],
              ["history", "기록"],
              ["family", "보호자"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`min-h-16 text-base font-semibold ${
                tab === id ? "text-[#0f6e6a]" : "text-[#6b645b]"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function MedList({
  meds,
  onAdd,
  onRemove,
}: {
  meds: Medication[];
  onAdd: (input: Omit<Medication, "id">) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("1정");
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");

  return (
    <section className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#e4dccf]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onAdd({
            name: name.trim(),
            dosage: dosage.trim() || "1정",
            times: [time],
            note: note.trim(),
          });
          setName("");
          setNote("");
        }}
      >
        <h2 className="text-xl font-bold">약 추가</h2>
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#6b645b]">
          이름
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 혈압약"
            className="min-h-14 rounded-2xl bg-[#f4efe6] px-4 text-xl outline-none ring-1 ring-[#e4dccf]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#6b645b]">
          용량
          <input
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="min-h-14 rounded-2xl bg-[#f4efe6] px-4 text-xl outline-none ring-1 ring-[#e4dccf]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#6b645b]">
          시간
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="min-h-14 rounded-2xl bg-[#f4efe6] px-4 text-xl outline-none ring-1 ring-[#e4dccf]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#6b645b]">
          메모
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="식후"
            className="min-h-14 rounded-2xl bg-[#f4efe6] px-4 text-xl outline-none ring-1 ring-[#e4dccf]"
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0f6e6a] text-lg font-bold text-white"
        >
          <Plus className="size-5" />
          저장
        </button>
      </form>

      {meds.map((med) => (
        <article
          key={med.id}
          className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#e4dccf]"
        >
          <div>
            <h3 className="text-xl font-bold">{med.name}</h3>
            <p className="text-base text-[#6b645b]">
              {med.dosage} · {med.times.join(", ")}
            </p>
          </div>
          <button
            type="button"
            aria-label={`${med.name} 삭제`}
            className="inline-flex size-12 items-center justify-center rounded-full bg-[#f8e4e1] text-[#8a3a32]"
            onClick={() => onRemove(med.id)}
          >
            <Trash2 className="size-5" />
          </button>
        </article>
      ))}
    </section>
  );
}

function History({ logs, meds }: { logs: DoseLog[]; meds: Medication[] }) {
  const nameOf = (id: string) =>
    meds.find((m) => m.id === id)?.name ?? "삭제된 약";

  if (logs.length === 0) {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-center text-lg text-[#6b645b] ring-1 ring-[#e4dccf]">
        아직 기록이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {logs.slice(0, 30).map((log) => (
        <li
          key={log.id}
          className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#e4dccf]"
        >
          <p className="text-lg font-bold">{nameOf(log.medId)}</p>
          <p className="text-base text-[#6b645b]">
            {log.date} {log.time} ·{" "}
            {log.status === "taken" ? "먹음" : "못 먹음"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Family({
  slots,
  done,
  total,
}: {
  slots: { med: Medication; time: string; status?: "taken" | "missed" }[];
  done: number;
  total: number;
}) {
  const pending = slots.filter((s) => !s.status);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-[#0f6e6a] px-4 py-5 text-white">
        <Users className="size-8" />
        <div>
          <p className="text-sm font-medium opacity-90">보호자 화면</p>
          <p className="text-2xl font-bold">
            {done}/{total || 0} 복용 완료
          </p>
        </div>
      </div>
      <p className="text-base leading-relaxed text-[#6b645b]">
        같은 휴대폰에서 보호자가 확인하는 화면입니다. 아직 체크하지 않은 약만
        보여 줍니다.
      </p>
      {pending.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-lg text-[#6b645b] ring-1 ring-[#e4dccf]">
          오늘 남은 약이 없습니다.
        </p>
      ) : (
        pending.map((slot) => (
          <article
            key={`${slot.med.id}-${slot.time}`}
            className="rounded-2xl bg-[#f8e6d8] px-4 py-4"
          >
            <p className="text-sm font-semibold text-[#c45c26]">{slot.time}</p>
            <h2 className="text-2xl font-bold">{slot.med.name}</h2>
            <p className="text-lg text-[#6b645b]">{slot.med.dosage}</p>
          </article>
        ))
      )}
    </section>
  );
}