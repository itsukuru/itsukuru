"use client";

/**
 * /contact ページに埋め込むフォーム本体。
 * Supabase に直接 INSERT する（未認証 OK・RLS で INSERT のみ許可）。
 */
import { useState, type FormEvent } from "react";
import {
  CATEGORY_LABELS,
  submitContactMessage,
  type ContactCategory,
} from "@/app/lib/contactClient";

type Props = {
  defaultCategory?: ContactCategory;
  defaultRelatedCode?: string;
  defaultMessage?: string;
};

export default function ContactForm({
  defaultCategory = "other",
  defaultRelatedCode = "",
  defaultMessage = "",
}: Props) {
  const [category, setCategory] = useState<ContactCategory>(defaultCategory);
  const [message, setMessage] = useState(defaultMessage);
  const [email, setEmail] = useState("");
  const [relatedCode, setRelatedCode] = useState(defaultRelatedCode);
  const [relatedUrl, setRelatedUrl] = useState("");
  // ハニーポット（スパム対策）。bot が自動で埋めがちな項目を hidden で配置し、
  // 値が入っていたら送信を中断する。
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // ハニーポット: 通常のユーザーはここに入力しないので、値が入っていたら bot
    if (honeypot.trim()) {
      setSuccess(true);
      return;
    }

    setSubmitting(true);
    const result = await submitContactMessage({
      category,
      message,
      email: email || undefined,
      relatedCode: relatedCode || undefined,
      relatedUrl: relatedUrl || undefined,
    });
    setSubmitting(false);

    if (result.ok) {
      setSuccess(true);
      setMessage("");
      setEmail("");
      setRelatedCode("");
      setRelatedUrl("");
    } else {
      setError(result.error);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">✅ 送信ありがとうございました！</p>
        <p className="mt-2 leading-relaxed">
          内容を確認のうえ対応いたします。お返事が必要な場合（メールアドレスをご記入いただいた場合）は、数日中にご連絡します。
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          もう一件送信する
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-700">
          種別 <span className="text-rose-600">*</span>
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ContactCategory)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={submitting}
        >
          {(Object.keys(CATEGORY_LABELS) as ContactCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700">
          内容 <span className="text-rose-600">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          required
          minLength={5}
          maxLength={5000}
          placeholder={
            category === "wrong_info"
              ? "例: 銘柄コード9433の権利月が「2月」になっていますが、正しくは「3月・9月」です。参考URL: https://..."
              : category === "report_post"
                ? "通報対象の銘柄・投稿日・投稿者名・問題点を具体的にお書きください。"
                : category === "bug"
                  ? "再現手順、お使いの端末（PC/スマホ）、ブラウザを教えてください。"
                  : "ご自由にお書きください（5文字以上）"
          }
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={submitting}
        />
        <p className="mt-1 text-[11px] text-slate-500">
          {message.length} / 5000 文字
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-700">
            関連銘柄コード（任意）
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={relatedCode}
            onChange={(e) => setRelatedCode(e.target.value)}
            placeholder="例: 9433"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            返信用メールアドレス（任意）
          </label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例: you@example.com"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700">
          関連 URL（任意 / 公式IR・参考ページなど）
        </label>
        <input
          type="url"
          value={relatedUrl}
          onChange={(e) => setRelatedUrl(e.target.value)}
          placeholder="例: https://www.kddi.com/ir/"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      {/* ハニーポット（人間には見えない / bot 用） */}
      <div className="hidden" aria-hidden="true">
        <label>
          このフィールドは入力しないでください
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || message.trim().length < 5}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "送信中..." : "📩 送信する"}
      </button>

      <p className="text-[11px] leading-relaxed text-slate-500">
        ※ お送りいただいた内容はサーバーに保存され、サイト運営者のみが閲覧します。
        スパム対策のため、送信時刻に加え端末環境把握用に User-Agent を短く（最大500文字まで）記録することがあります。IP は保存していません。
      </p>
    </form>
  );
}
