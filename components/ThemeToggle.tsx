'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-9 h-9" />;
    }

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center justify-center rounded-md w-9 h-9 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-slate-400" />
            ) : (
                <Moon className="h-4 w-4 text-slate-600" />
            )}
        </button>
    );
}
