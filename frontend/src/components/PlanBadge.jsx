const colors = {
  FREE: "bg-gray-100 text-gray-700",

  PRO: "bg-blue-100 text-blue-700",

  ENTERPRISE:
    "bg-purple-100 text-purple-700",
};

export default function PlanBadge({
  plan,
}) {
  return (
    <span
      className={`
      px-3 py-1
      rounded-full
      text-xs
      font-bold
      ${colors[plan]}
      `}
    >
      {plan}
    </span>
  );
}