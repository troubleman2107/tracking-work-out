import { Dumbbell } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
        <Dumbbell className="w-8 h-8 text-primary animate-pulse" />
        <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" style={{ animationDuration: "1s" }} />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-primary/70 animate-pulse">
        Loading...
      </p>
    </div>
  );
}
