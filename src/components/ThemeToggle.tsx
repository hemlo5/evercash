import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      className={`relative overflow-hidden transition-all duration-300 h-8 md:h-9 lg:h-10 px-2 md:px-2.5 lg:px-3 rounded-md md:rounded-lg ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-green-500/20 to-green-400/30 border-green-500/50 text-green-400 hover:bg-green-500/30 shadow-[0_0_15px_rgba(0,255,0,0.3)]'
          : 'bg-gradient-to-r from-emerald-100 to-emerald-200 border-emerald-300 text-emerald-700 hover:bg-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
      }`}
    >
      <div className="flex items-center gap-1 md:gap-2">
        {theme === 'dark' ? (
          <>
            <Sun className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden lg:inline text-xs md:text-sm font-medium">Light</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden lg:inline text-xs md:text-sm font-medium">Dark</span>
          </>
        )}
      </div>
      
      {/* Animated background indicator */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-green-500/10 to-green-400/20 translate-x-0'
            : 'bg-gradient-to-r from-emerald-500/10 to-emerald-400/20 translate-x-0'
        }`}
      />
    </Button>
  );
}
