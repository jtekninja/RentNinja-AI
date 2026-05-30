type FeatureCardProps = {
  label: string;
  title: string;
  description: string;
  action?: string;
};

export function FeatureCard({
  label,
  title,
  description,
  action,
}: FeatureCardProps) {
  return (
    <article className="rounded-[20px] border border-[#b8c4d4] bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
        {label}
      </p>
      <h2 className="mt-2 text-xl font-bold text-[#050b1f]">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
        {description}
      </p>
      {action ? (
        <button
          type="button"
          className="mt-4 min-h-[44px] rounded-full bg-[#ff4b1f] px-5 py-2 text-sm font-bold text-white shadow-[0_10px_22px_rgba(255,75,31,0.22)] transition hover:bg-[#e63e16]"
        >
          {action}
        </button>
      ) : null}
    </article>
  );
}
